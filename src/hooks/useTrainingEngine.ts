/**
 * MODULE 3: THE N+1 TRAINING ENGINE (ARENA / MATRIX)
 * Deterministic N+1 sequential drill state machine.
 * 
 * [Start Drill: Target Line [m0, m1, ... mk]]
 *                   │
 *                   ▼
 *             [Depth N = 0]
 *                   │
 *   ┌───────────────►▼
 *   │        [Reset Board to Root]
 *   │                │
 *   │                ▼
 *   │        [Replay moves 0..N-1]
 *   │                │
 *   │                ▼
 *   │     [Prompt User for Move N]
 *   │                │
 *   │         ┌──────┴──────┐
 *   │         │             │
 *   │      (Valid)       (Invalid)
 *   │         │             │
 *   │         ▼             ▼
 *   │     [N == k?]   [Error Buzz & Reset]
 *   │       /   \           │
 *   │     (No)  (Yes)       └─────────┐
 *   │     /       \                   │
 *   │ [N = N + 1]  ▼                  ▼
 *   └─────┘   [Mark MASTERED]   [Lock Progress]
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { soundEngine } from '../services/soundService';
import { masteryStore } from '../services/masteryService';
import { matrixProgress } from '../services/matrixProgressService';

export type TrainingStatus = 'IDLE' | 'TRACING' | 'AWAITING_USER' | 'ENGINE_THINKING' | 'FAULT' | 'GRADUATED' | 'COMPLETE';
export type TrainingMethod = 'N_PLUS_ONE' | 'ECHO_RECALL';
export type EchoPhase = 'IDLE' | 'DEMO' | 'INSPECTION' | 'RECALL';

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'awaiting';
}

export function useTrainingEngine(
  repertoireLines: string[][],
  userColor: 'w' | 'b' = 'w',
  openingId: string = 'global',
  onGraduation?: (targetFen: string, line: string[]) => void
) {
  const [lineIndex, setLineIndex] = useState(0);
  const targetMoves = useMemo(() => repertoireLines[lineIndex] || [], [repertoireLines, lineIndex]);
  
  // Method & Settings State (persisted to localStorage)
  const [trainingMethod, setTrainingMethodState] = useState<TrainingMethod>(() => {
    try {
      const saved = localStorage.getItem('caissa_training_method');
      return (saved === 'ECHO_RECALL' || saved === 'N_PLUS_ONE') ? saved : 'N_PLUS_ONE';
    } catch {
      return 'N_PLUS_ONE';
    }
  });

  const [playbackSpeedMs, setPlaybackSpeedMsState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('caissa_echo_playback_speed');
      const parsed = saved ? parseInt(saved, 10) : 500;
      return !isNaN(parsed) && parsed >= 100 ? parsed : 500;
    } catch {
      return 500;
    }
  });

  const [inspectionPauseSec, setInspectionPauseSecState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('caissa_echo_inspection_pause');
      const parsed = saved ? parseInt(saved, 10) : 5;
      return !isNaN(parsed) && parsed >= 0 ? parsed : 5;
    } catch {
      return 5;
    }
  });

  const setTrainingMethod = useCallback((method: TrainingMethod) => {
    setTrainingMethodState(method);
    try {
      localStorage.setItem('caissa_training_method', method);
    } catch {}
  }, []);

  const setPlaybackSpeedMs = useCallback((speed: number) => {
    const clamped = Math.max(150, Math.min(3000, speed));
    setPlaybackSpeedMsState(clamped);
    try {
      localStorage.setItem('caissa_echo_playback_speed', clamped.toString());
    } catch {}
  }, []);

  const setInspectionPauseSec = useCallback((sec: number) => {
    const clamped = Math.max(0, Math.min(60, sec));
    setInspectionPauseSecState(clamped);
    try {
      localStorage.setItem('caissa_echo_inspection_pause', clamped.toString());
    } catch {}
  }, []);

  // 0 to N Echo Recall Phase State
  const [echoPhase, setEchoPhase] = useState<EchoPhase>('IDLE');
  const [inspectionRemaining, setInspectionRemaining] = useState(5);
  const [isInspectionPaused, setIsInspectionPaused] = useState(false);

  // Game state
  const [game, setGame] = useState(new Chess());
  const [status, setStatus] = useState<TrainingStatus>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [shake, setShake] = useState(false);
  const [faultsCount, setFaultsCount] = useState(0);
  const [lastMasteryResult, setLastMasteryResult] = useState<{
    score: number;
    isElite: boolean;
    lineIndex: number;
    faults: number;
  } | null>(null);

  // N+1 Drill State:
  // targetDepth: The maximum move index (0-indexed) that the current loop must reach
  // currentStep: The current move index (0-indexed) within the current loop
  const [targetDepth, setTargetDepth] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [overheat, setOverheat] = useState(100);
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string; san: string } | null>(null);

  // Premoves Queue & Line-by-Line local persistence
  const [premoves, setPremoves] = useState<Array<{ from: string; to: string; promotion?: string }>>([]);

  const engineTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inspectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-15), { id: Math.random().toString(36).substring(2, 9), text, type }]);
  }, []);

  // Clear premoves helper
  const clearPremoves = useCallback(() => {
    setPremoves([]);
    try {
      localStorage.removeItem(`caissa_premoves_${openingId}_${lineIndex}`);
    } catch {}
    addLog('Premoves cleared', 'info');
  }, [openingId, lineIndex, addLog]);

  // Compute player move indices: For 'w', moves 0, 2, 4... For 'b', moves 1, 3, 5...
  const playerMoveIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < targetMoves.length; i++) {
      const isPlayerTurn = (i % 2 === 0 && userColor === 'w') || (i % 2 !== 0 && userColor === 'b');
      if (isPlayerTurn) {
        indices.push(i);
      }
    }
    return indices;
  }, [targetMoves, userColor]);

  // Last player move index in the line (-1 if no moves)
  const lastPlayerMoveIndex = useMemo(() => {
    return playerMoveIndices.length > 0 ? playerMoveIndices[playerMoveIndices.length - 1] : -1;
  }, [playerMoveIndices]);

  // Find the next target depth in the N+1 progression
  const getNextTargetDepth = useCallback((currentDepth: number) => {
    const nextIdx = playerMoveIndices.find(idx => idx > currentDepth);
    if (nextIdx !== undefined) return nextIdx;
    // Cap at the maximum ply of the target sequence
    return Math.max(0, targetMoves.length - 1);
  }, [playerMoveIndices, targetMoves.length]);

  const resetBoardToRoot = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setCurrentStep(0);
    setOverheat(100);
    setOpponentLastMove(null);
    setPremoves([]);
    if (engineTimeoutRef.current) {
      clearTimeout(engineTimeoutRef.current);
      engineTimeoutRef.current = null;
    }
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    if (inspectionTimerRef.current) {
      clearInterval(inspectionTimerRef.current);
      inspectionTimerRef.current = null;
    }
  }, []);

  const triggerFault = useCallback((reason: string) => {
    setShake(true);
    setStatus('FAULT');
    setFaultsCount(prev => prev + 1);
    soundEngine.play('fault');
    setPremoves([]);

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    addLog(`[ BLUNDER ]: ${reason} — ZERO TOLERANCE RESET`, 'error');

    setTimeout(() => {
      setShake(false);
      resetBoardToRoot();
      if (trainingMethod === 'ECHO_RECALL') {
        // Keep in Recall mode or allow quick re-try from 0
        setEchoPhase('RECALL');
        setTargetDepth(Math.max(0, targetMoves.length - 1));
        if (userColor === 'w') {
          setStatus('AWAITING_USER');
        } else {
          setStatus('ENGINE_THINKING');
        }
      } else {
        // N+1 Punishment: Reset target depth to beginning
        const initialTarget = playerMoveIndices[0] !== undefined ? playerMoveIndices[0] : (userColor === 'b' ? 1 : 0);
        setTargetDepth(initialTarget);
        setStatus('AWAITING_USER');
      }
    }, 600);
  }, [addLog, playerMoveIndices, resetBoardToRoot, userColor, trainingMethod, targetMoves.length]);

  // Start 0 to N Demo Playback
  const runEchoDemo = useCallback(() => {
    if (targetMoves.length === 0) return;
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    if (inspectionTimerRef.current) clearInterval(inspectionTimerRef.current);

    resetBoardToRoot();
    setEchoPhase('DEMO');
    setStatus('TRACING');
    setTargetDepth(targetMoves.length - 1);
    addLog(`[ 0→N DEMONSTRATION STARTED: ${targetMoves.length} PLIES @ ${playbackSpeedMs}ms/move ]`, 'info');

    let currentDemoStep = 0;
    const demoGame = new Chess();

    demoIntervalRef.current = setInterval(() => {
      if (currentDemoStep < targetMoves.length) {
        const moveSan = targetMoves[currentDemoStep];
        try {
          const res = demoGame.move(moveSan);
          if (res) {
            setGame(new Chess(demoGame.fen()));
            soundEngine.play(res.captured ? 'capture' : 'move');
            setOpponentLastMove({ from: res.from, to: res.to, san: res.san });
            addLog(`0→N Demo [${currentDemoStep + 1}]: ${res.san}`, 'info');
          }
        } catch (e) {
          console.error('[ECHO_DEMO] Error applying move', moveSan, e);
        }

        currentDemoStep++;
        setCurrentStep(currentDemoStep);

        // Reached end of 0 to N sequence!
        if (currentDemoStep >= targetMoves.length) {
          if (demoIntervalRef.current) {
            clearInterval(demoIntervalRef.current);
            demoIntervalRef.current = null;
          }

          // Transition to INSPECTION WINDOW
          setEchoPhase('INSPECTION');
          setStatus('AWAITING_USER');
          setInspectionRemaining(inspectionPauseSec);
          setIsInspectionPaused(false);
          soundEngine.play('premove');
          addLog(`[ 0→N DEMO FINISHED. INSPECTION WINDOW ACTIVE: ${inspectionPauseSec}s ]`, 'awaiting');
        }
      } else {
        if (demoIntervalRef.current) {
          clearInterval(demoIntervalRef.current);
          demoIntervalRef.current = null;
        }
      }
    }, playbackSpeedMs);
  }, [targetMoves, resetBoardToRoot, playbackSpeedMs, inspectionPauseSec, addLog]);

  // Transition from Inspection to Recall (Blind 0 to N Play)
  const checkoutInspection = useCallback(() => {
    if (inspectionTimerRef.current) {
      clearInterval(inspectionTimerRef.current);
      inspectionTimerRef.current = null;
    }
    resetBoardToRoot();
    setEchoPhase('RECALL');
    setTargetDepth(targetMoves.length - 1);
    soundEngine.play('drill_advance');
    addLog(`>>> [0→N BLIND RECALL ACTIVE]: PLAY ALL ${targetMoves.length} MOVES FROM MEMORY.`, 'awaiting');

    if (userColor === 'w') {
      setStatus('AWAITING_USER');
    } else {
      // For Black repertoires, opponent plays 1st move
      setStatus('ENGINE_THINKING');
    }
  }, [resetBoardToRoot, targetMoves.length, userColor, addLog]);

  // Inspection Window Countdown Handler
  useEffect(() => {
    if (trainingMethod === 'ECHO_RECALL' && echoPhase === 'INSPECTION') {
      if (inspectionPauseSec === 0) {
        // Untimed / Manual checkout only
        return;
      }

      if (isInspectionPaused) {
        if (inspectionTimerRef.current) {
          clearInterval(inspectionTimerRef.current);
          inspectionTimerRef.current = null;
        }
        return;
      }

      inspectionTimerRef.current = setInterval(() => {
        setInspectionRemaining(prev => {
          if (prev <= 1) {
            if (inspectionTimerRef.current) {
              clearInterval(inspectionTimerRef.current);
              inspectionTimerRef.current = null;
            }
            checkoutInspection();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (inspectionTimerRef.current) {
          clearInterval(inspectionTimerRef.current);
          inspectionTimerRef.current = null;
        }
      };
    }
  }, [trainingMethod, echoPhase, inspectionPauseSec, isInspectionPaused, checkoutInspection]);

  const toggleInspectionPause = useCallback(() => {
    setIsInspectionPaused(prev => !prev);
  }, []);

  const restartEchoDemo = useCallback(() => {
    runEchoDemo();
  }, [runEchoDemo]);

  // Start Training
  const startTraining = useCallback(() => {
    if (targetMoves.length === 0) return;
    setLogs([]);

    if (trainingMethod === 'ECHO_RECALL') {
      runEchoDemo();
    } else {
      setEchoPhase('IDLE');
      const initialTarget = playerMoveIndices[0] !== undefined ? playerMoveIndices[0] : (userColor === 'b' ? 1 : 0);
      setTargetDepth(initialTarget);
      resetBoardToRoot();
      setStatus('AWAITING_USER');
      addLog(`[ N+1 ENGINE INITIALIZED: ${targetMoves.length} PLIES ]`, 'info');
      addLog(`[ DRILL STAGE 1 / ${Math.max(1, playerMoveIndices.length)} ]`, 'awaiting');
    }
  }, [targetMoves, trainingMethod, runEchoDemo, playerMoveIndices, userColor, resetBoardToRoot, addLog]);

  // Handle Engine Auto-Response (within 80ms)
  useEffect(() => {
    if (status === 'ENGINE_THINKING' || status === 'AWAITING_USER') {
      // In ECHO_RECALL, only react during RECALL phase
      if (trainingMethod === 'ECHO_RECALL' && echoPhase !== 'RECALL') {
        return;
      }

      if (currentStep < targetMoves.length && currentStep <= targetDepth) {
        const isUserTurn = (currentStep % 2 === 0 && userColor === 'w') || (currentStep % 2 !== 0 && userColor === 'b');
        
        if (!isUserTurn) {
          // Engine opponent move: within 80ms
          engineTimeoutRef.current = setTimeout(() => {
            const expectedMove = targetMoves[currentStep];
            if (!expectedMove) return;

            let updatedFen = '';
            setGame(prevGame => {
              const gameCopy = new Chess(prevGame.fen());
              try {
                const res = gameCopy.move(expectedMove);
                if (res) {
                  setOpponentLastMove({ from: res.from, to: res.to, san: res.san });
                  soundEngine.play(res.captured ? 'capture' : 'move');
                  addLog(`Opponent: ${res.san}`, 'info');
                }
              } catch (e) {
                console.error('[TRAINING_ENGINE] Engine move error', e);
              }
              updatedFen = gameCopy.fen();
              return gameCopy;
            });

            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);

            // CRITICAL CHECK FOR BLACK REPERTOIRES:
            // Did opponent just play the final move of the whole line/PGN?
            if (nextStep >= targetMoves.length) {
              masteryStore.setMastery(openingId, updatedFen || game.fen(), {
                status: 'MASTERED',
                streak: 1,
              });

              // Calculate & persist mastery score and mastered nodes
              const lineTitle = `Line ${lineIndex + 1}`;
              const { score, isElite } = matrixProgress.recordLineMastered(
                trainingMethod,
                targetMoves,
                lineIndex,
                faultsCount,
                userColor,
                lineTitle
              );

              setLastMasteryResult({
                score,
                isElite,
                lineIndex,
                faults: faultsCount
              });

              setStatus(lineIndex < repertoireLines.length - 1 ? 'GRADUATED' : 'COMPLETE');
              soundEngine.play('complete');
              addLog(`>>> [GRADUATION]: LINE ${lineIndex + 1} MASTERED (${score}% MASTERY SCORE).`, 'success');

              if (onGraduation) {
                onGraduation(updatedFen || game.fen(), targetMoves);
              }
              return;
            }

            setStatus('AWAITING_USER');
          }, 80);

          return () => {
            if (engineTimeoutRef.current) clearTimeout(engineTimeoutRef.current);
          };
        }
      }
    }
  }, [
    status,
    currentStep,
    targetDepth,
    targetMoves,
    userColor,
    addLog,
    game,
    openingId,
    lineIndex,
    repertoireLines,
    onGraduation,
    trainingMethod,
    echoPhase,
    runEchoDemo,
    resetBoardToRoot
  ]);

  // Internal move execution engine (handles both live moves and queued premoves)
  const executeUserMoveInternal = useCallback((moveInput: string | { from: string; to: string; promotion?: string }) => {
    if (currentStep >= targetMoves.length) return;

    const expectedSan = targetMoves[currentStep];
    const gameCopy = new Chess(game.fen());

    try {
      const moveResult = gameCopy.move(moveInput);
      if (!moveResult) {
        triggerFault('ILLEGAL_MOVE');
        return;
      }

      // Check if move matches sequence exactly
      if (moveResult.san !== expectedSan) {
        triggerFault(`UNEXPECTED_MOVE: Played ${moveResult.san}, Expected ${expectedSan}`);
        return;
      }

      // Valid move!
      setGame(gameCopy);
      soundEngine.play(moveResult.captured ? 'capture' : 'move');

      // Subtle haptic
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }

      addLog(`Move ${Math.floor(currentStep / 2) + 1}: ${moveResult.san} — Validated.`, 'success');

      const nextStep = currentStep + 1;

      // Check if reached current loop target
      if (currentStep >= targetDepth) {
        const isLastPlyOfLine = nextStep >= targetMoves.length;
        const reachedFinalPlayerPly = lastPlayerMoveIndex !== -1 && currentStep >= lastPlayerMoveIndex;
        const isTerminalLine = isLastPlyOfLine || (reachedFinalPlayerPly && nextStep >= targetMoves.length) || (targetDepth >= targetMoves.length - 1 && isLastPlyOfLine);

        if (isTerminalLine) {
          // GRADUATION EVENT!
          const terminalFen = gameCopy.fen();
          masteryStore.setMastery(openingId, terminalFen, {
            status: 'MASTERED',
            streak: 1,
          });

          // Calculate & persist mastery score and mastered nodes
          const lineTitle = `Line ${lineIndex + 1}`;
          const { score, isElite } = matrixProgress.recordLineMastered(
            trainingMethod,
            targetMoves,
            lineIndex,
            faultsCount,
            userColor,
            lineTitle
          );

          setLastMasteryResult({
            score,
            isElite,
            lineIndex,
            faults: faultsCount
          });

          setStatus(lineIndex < repertoireLines.length - 1 ? 'GRADUATED' : 'COMPLETE');
          setPremoves([]);
          soundEngine.play('complete');
          addLog(`>>> [GRADUATION]: LINE ${lineIndex + 1} MASTERED (${score}% MASTERY SCORE).`, 'success');

          if (onGraduation) {
            onGraduation(terminalFen, targetMoves);
          }
          return;
        } else {
          if (reachedFinalPlayerPly && nextStep < targetMoves.length) {
            setCurrentStep(nextStep);
            setTargetDepth(targetMoves.length - 1);
            setStatus('ENGINE_THINKING');
            return;
          }

          // N+1 Step Up: Advance targetDepth to next player move and restart loop
          const nextTarget = getNextTargetDepth(targetDepth);
          addLog(`[ DRILL ADVANCE: DEPTH ${Math.floor(nextTarget / 2) + 1} ]`, 'info');
          soundEngine.play('drill_advance');

          setTimeout(() => {
            setTargetDepth(nextTarget);
            resetBoardToRoot();
            setStatus('AWAITING_USER');
          }, 350);
        }
      } else {
        // Move was valid, continue within current loop
        setCurrentStep(nextStep);
        setStatus('ENGINE_THINKING');
      }
    } catch (err) {
      triggerFault('ENGINE_EXCEPTION');
    }
  }, [
    currentStep,
    targetMoves,
    game,
    targetDepth,
    triggerFault,
    addLog,
    lastPlayerMoveIndex,
    openingId,
    lineIndex,
    repertoireLines,
    onGraduation,
    userColor,
    getNextTargetDepth,
    resetBoardToRoot,
    trainingMethod,
    runEchoDemo
  ]);

  // Handle User Move Input (Supports immediate execution or queuing multiple premoves)
  const handleUserMove = useCallback((moveInput: string | { from: string; to: string; promotion?: string }) => {
    // In ECHO_RECALL, move input is only accepted during RECALL phase
    if (trainingMethod === 'ECHO_RECALL' && echoPhase !== 'RECALL') {
      return;
    }

    const isUserTurn = status === 'AWAITING_USER' && (
      (currentStep % 2 === 0 && userColor === 'w') || 
      (currentStep % 2 !== 0 && userColor === 'b')
    );

    if (isUserTurn && premoves.length === 0) {
      // Direct instant execution
      executeUserMoveInternal(moveInput);
    } else {
      // Queue move as premove!
      const moveObj = typeof moveInput === 'object' && moveInput.from && moveInput.to
        ? { from: moveInput.from, to: moveInput.to, promotion: moveInput.promotion || 'q' }
        : null;

      if (moveObj) {
        setPremoves(prev => {
          const next = [...prev, moveObj];
          // Record locally line-by-line
          try {
            localStorage.setItem(`caissa_premoves_${openingId}_line_${lineIndex}`, JSON.stringify(next));
          } catch {}
          return next;
        });
        soundEngine.play('premove');
        addLog(`Premove [P${premoves.length + 1}] Queued: ${moveObj.from}→${moveObj.to}`, 'awaiting');
      }
    }
  }, [status, currentStep, userColor, premoves.length, executeUserMoveInternal, openingId, lineIndex, addLog, trainingMethod, echoPhase]);

  // Automated execution of queued premoves when user turn becomes active
  useEffect(() => {
    if (status === 'AWAITING_USER' && premoves.length > 0) {
      if (trainingMethod === 'ECHO_RECALL' && echoPhase !== 'RECALL') {
        return;
      }
      const isUserTurn = (currentStep % 2 === 0 && userColor === 'w') || (currentStep % 2 !== 0 && userColor === 'b');
      if (isUserTurn) {
        const nextPremove = premoves[0];
        setPremoves(prev => {
          const remaining = prev.slice(1);
          try {
            localStorage.setItem(`caissa_premoves_${openingId}_line_${lineIndex}`, JSON.stringify(remaining));
          } catch {}
          return remaining;
        });
        // Instantaneous execution for buttery responsiveness
        executeUserMoveInternal(nextPremove);
      }
    }
  }, [status, currentStep, premoves, userColor, executeUserMoveInternal, openingId, lineIndex, trainingMethod, echoPhase]);

  // Line navigation methods
  const goToNextLine = useCallback(() => {
    if (lineIndex < repertoireLines.length - 1) {
      setLineIndex(prev => prev + 1);
      setFaultsCount(0);
      setLastMasteryResult(null);
      resetBoardToRoot();
      setLogs([]);
    }
  }, [lineIndex, repertoireLines.length, resetBoardToRoot]);

  const goToPreviousLine = useCallback(() => {
    if (lineIndex > 0) {
      setLineIndex(prev => prev - 1);
      setFaultsCount(0);
      setLastMasteryResult(null);
      resetBoardToRoot();
      setLogs([]);
    }
  }, [lineIndex, resetBoardToRoot]);

  const jumpToLine = useCallback((idx: number) => {
    if (idx >= 0 && idx < repertoireLines.length) {
      setLineIndex(idx);
      setFaultsCount(0);
      setLastMasteryResult(null);
      resetBoardToRoot();
      setLogs([]);
    }
  }, [repertoireLines.length, resetBoardToRoot]);

  const restartCurrentLine = useCallback(() => {
    setFaultsCount(0);
    setLastMasteryResult(null);
    startTraining();
  }, [startTraining]);

  // Compute expected move for ghost indicator
  const nextExpectedMove = currentStep < targetMoves.length ? targetMoves[currentStep] : null;

  return {
    game,
    currentStep,
    targetDepth,
    totalSteps: targetMoves.length,
    lineIndex,
    setLineIndex,
    totalLines: repertoireLines.length,
    status,
    setStatus,
    logs,
    shake,
    overheat,
    nextExpectedMove,
    opponentLastMove,
    premoves,
    clearPremoves,
    startTraining,
    handleUserMove,
    resetBoardToRoot,
    faultsCount,
    lastMasteryResult,
    goToNextLine,
    goToPreviousLine,
    jumpToLine,
    restartCurrentLine,
    // 0 to N Echo Recall exports
    trainingMethod,
    setTrainingMethod,
    playbackSpeedMs,
    setPlaybackSpeedMs,
    inspectionPauseSec,
    setInspectionPauseSec,
    echoPhase,
    inspectionRemaining,
    isInspectionPaused,
    toggleInspectionPause,
    checkoutInspection,
    restartEchoDemo,
  };
}
