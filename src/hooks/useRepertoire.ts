import { useState, useEffect, useCallback } from 'react';
import { supabase, type Repertoire, type OpeningLine } from '../lib/supabase';
import { LOCAL_REPERTOIRE } from '../data/openings';

export function useRepertoire() {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [lines, setLines] = useState<OpeningLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);

  const fetchRepertoire = useCallback(async () => {
    try {
      setLoading(true);
      
      let repoData: Repertoire[] | null = null;
      let lineData: OpeningLine[] | null = null;
      let connectedToSupabase = false;

      if (supabase) {
        try {
          const [repoResult, lineResult] = await Promise.allSettled([
            supabase.from('repertoires').select('*'),
            supabase.from('lines').select('*'),
          ]);

          if (
            repoResult.status === 'fulfilled' && 
            !repoResult.value.error && 
            lineResult.status === 'fulfilled' && 
            !lineResult.value.error &&
            repoResult.value.data &&
            repoResult.value.data.length > 0
          ) {
            repoData = repoResult.value.data as Repertoire[];
            lineData = (lineResult.value.data as OpeningLine[]) || [];
            connectedToSupabase = true;
          }
        } catch (e) {
          console.warn('[REPERTOIRE] Supabase query failed, falling back to local storage', e);
        }
      }

      setIsSupabaseActive(connectedToSupabase);

      if (connectedToSupabase && repoData) {
        setRepertoires(repoData);
        setLines(lineData || []);
      } else {
        // Fallback to local storage
        let loadedFromLocal = false;
        if (typeof window !== 'undefined') {
          try {
            const savedRepos = localStorage.getItem('caissa_local_repertoires');
            const savedLines = localStorage.getItem('caissa_local_lines');
            
            if (savedRepos && savedLines) {
              const parsedRepos = JSON.parse(savedRepos);
              const parsedLines = JSON.parse(savedLines);
              if (Array.isArray(parsedRepos) && Array.isArray(parsedLines) && parsedRepos.length > 0) {
                setRepertoires(parsedRepos);
                setLines(parsedLines);
                loadedFromLocal = true;
              }
            }
          } catch (e) {
            console.warn('[REPERTOIRE] Error parsing local storage repertoire:', e);
          }
        }

        if (!loadedFromLocal) {
          // Initial fallback to default data
          const uniqueRepos = Array.from(new Set(LOCAL_REPERTOIRE.map(l => l.repertoireName)));
          const virtualRepos: Repertoire[] = uniqueRepos.map(name => ({
            id: name?.toLowerCase().replace(/\s+/g, '-') || 'default',
            name: name || 'General',
            description: `Master the ${name}`,
            user_color: LOCAL_REPERTOIRE.find(l => l.repertoireName === name)?.userColor || 'w'
          }));

          const mappedLines: OpeningLine[] = LOCAL_REPERTOIRE.map(l => ({
            id: l.id,
            repertoire_id: l.repertoireName?.toLowerCase().replace(/\s+/g, '-') || 'default',
            name: l.name,
            moves: l.moves
          }));

          setRepertoires(virtualRepos);
          setLines(mappedLines);
          
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('caissa_local_repertoires', JSON.stringify(virtualRepos));
              localStorage.setItem('caissa_local_lines', JSON.stringify(mappedLines));
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      console.error('[REPERTOIRE] Failed to initialize repertoire:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepertoire();
  }, [fetchRepertoire]);

  const getLinesForRepertoire = (repertoireId: string) => {
    return lines.filter(l => l.repertoire_id === repertoireId);
  };

  const createRepertoire = async (name: string, description: string, user_color: 'w' | 'b') => {
    if (isSupabaseActive && supabase) {
      try {
        const { data, error } = await supabase
          .from('repertoires')
          .insert([{ name, description, user_color }])
          .select()
          .single();

        if (!error && data) {
          setRepertoires(prev => [...prev, data]);
          return data;
        }
      } catch (err) {
        console.warn('[REPERTOIRE] Supabase createRepertoire error, saving locally:', err);
      }
    }

    // Local fallback
    const newRepo: Repertoire = {
      id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(7),
      name,
      description,
      user_color
    };
    const updatedRepos = [...repertoires, newRepo];
    setRepertoires(updatedRepos);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('caissa_local_repertoires', JSON.stringify(updatedRepos));
      } catch {
        // ignore
      }
    }
    return newRepo;
  };

  const createLine = async (repertoireId: string, name: string, moves: string[]) => {
    if (isSupabaseActive && supabase) {
      try {
        const { data, error } = await supabase
          .from('lines')
          .insert([{ repertoire_id: repertoireId, name, moves }])
          .select()
          .single();

        if (!error && data) {
          setLines(prev => [...prev, data]);
          return data;
        }
      } catch (err) {
        console.warn('[REPERTOIRE] Supabase createLine error, saving locally:', err);
      }
    }

    // Local fallback
    const newLine: OpeningLine = {
      id: Math.random().toString(36).substring(7),
      repertoire_id: repertoireId,
      name,
      moves
    };
    const updatedLines = [...lines, newLine];
    setLines(updatedLines);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('caissa_local_lines', JSON.stringify(updatedLines));
      } catch {
        // ignore
      }
    }
    return newLine;
  };

  const [masteredFens, setMasteredFens] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = localStorage.getItem('caissa_mastered_fens');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const saveMasteredFen = (fen: string) => {
    setMasteredFens(prev => {
      const next = new Set(prev);
      next.add(fen);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('caissa_mastered_fens', JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const deleteRepertoire = async (id: string) => {
    const originalRepos = [...repertoires];
    const originalLines = [...lines];
    
    const updatedRepos = repertoires.filter(r => r.id !== id);
    const updatedLines = lines.filter(l => l.repertoire_id !== id);
    
    setRepertoires(updatedRepos);
    setLines(updatedLines);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('caissa_local_repertoires', JSON.stringify(updatedRepos));
        localStorage.setItem('caissa_local_lines', JSON.stringify(updatedLines));
      } catch {
        // ignore
      }
    }

    if (isSupabaseActive && supabase) {
      try {
        const { error } = await supabase.from('repertoires').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase deleteRepertoire failed, rolling back:', err);
        setRepertoires(originalRepos);
        setLines(originalLines);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('caissa_local_repertoires', JSON.stringify(originalRepos));
            localStorage.setItem('caissa_local_lines', JSON.stringify(originalLines));
          } catch {
            // ignore
          }
        }
      }
    }
  };

  const deleteLine = async (id: string) => {
    const originalLines = [...lines];
    const updatedLines = lines.filter(l => l.id !== id);
    
    setLines(updatedLines);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('caissa_local_lines', JSON.stringify(updatedLines));
      } catch {
        // ignore
      }
    }

    if (isSupabaseActive && supabase) {
      try {
        const { error } = await supabase.from('lines').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase deleteLine failed, rolling back:', err);
        setLines(originalLines);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('caissa_local_lines', JSON.stringify(originalLines));
          } catch {
            // ignore
          }
        }
      }
    }
  };

  return {
    repertoires,
    lines,
    loading,
    masteredFens,
    saveMasteredFen,
    getLinesForRepertoire,
    createRepertoire,
    createLine,
    deleteRepertoire,
    deleteLine,
    refreshRepertoire: fetchRepertoire,
    isSupabaseActive,
  };
}
