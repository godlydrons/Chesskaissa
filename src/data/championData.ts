import { ChampionPersona, ChampionGameRecord } from '../types/champion';

export const CHAMPION_PERSONAS: ChampionPersona[] = [
  {
    id: 'kasparov',
    name: 'Garry Kasparov',
    epithet: 'The Beast of Baku',
    title: '13th World Chess Champion',
    reign: '1985–2000',
    stylisticDogma: 'Dynamic Imbalances & Initiative Supremacy',
    voiceProfile: {
      pitch: 0.95,
      rate: 1.05
    },
    quote: "Attackers may sometimes regret bad moves, but it is much worse to have not had the guts to seize the initiative.",
    dna: {
      initiative: 99,
      tactics: 96,
      prophylaxis: 78,
      dynamism: 98,
      endgame: 88
    }
  },
  {
    id: 'tal',
    name: 'Mikhail Tal',
    epithet: 'The Magician from Riga',
    title: '8th World Chess Champion',
    reign: '1960–1961',
    stylisticDogma: 'Intuitive Sacrifices & Psychological Chaos',
    voiceProfile: {
      pitch: 1.05,
      rate: 1.1
    },
    quote: "You must take your opponent into a deep dark forest where 2+2=5, and the path leading out is only wide enough for one.",
    dna: {
      initiative: 100,
      tactics: 98,
      prophylaxis: 50,
      dynamism: 99,
      endgame: 74
    }
  },
  {
    id: 'karpov',
    name: 'Anatoly Karpov',
    epithet: 'The Boa Constrictor',
    title: '12th World Chess Champion',
    reign: '1975–1985',
    stylisticDogma: 'Suffocating Prophylaxis & Positional Torture',
    voiceProfile: {
      pitch: 0.9,
      rate: 0.92
    },
    quote: "Style? I have no style. I simply make the best move, and slowly take away all my opponent's air.",
    dna: {
      initiative: 72,
      tactics: 86,
      prophylaxis: 100,
      dynamism: 70,
      endgame: 99
    }
  },
  {
    id: 'fischer',
    name: 'Bobby Fischer',
    epithet: 'The American Prodigy',
    title: '11th World Chess Champion',
    reign: '1972–1975',
    stylisticDogma: 'Relentless Concrete Clarity & Hyper-Accuracy',
    voiceProfile: {
      pitch: 1.0,
      rate: 1.02
    },
    quote: "I like the moment when I break a man's ego.",
    dna: {
      initiative: 94,
      tactics: 97,
      prophylaxis: 90,
      dynamism: 92,
      endgame: 96
    }
  }
];

export const MASTER_GAMES: ChampionGameRecord[] = [
  // ============================================================================
  // 1. GARRY KASPAROV: THE IMMORTAL KING HUNT (1999)
  // ============================================================================
  {
    id: 'kasparov-topalov-1999',
    championId: 'kasparov',
    championName: 'Garry Kasparov',
    stylisticDogma: 'Dynamic Imbalances & Initiative Supremacy',
    openingIntent: 'Kasparov weaponized the Pirc Defense setup to launch an early g4-h4 flank storm, baiting Topalov into castling queenside where Garry had prepared a catastrophic king-drag sacrifice.',
    totalCriticalMoments: 3,
    championColor: 'w',
    pgnContent: `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Kasparov, Garry"]
[Black "Topalov, Veselin"]
[Result "1-0"]
[ECO "B07"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
    moments: [
      {
        id: 'kasparov-node-1',
        gameId: 'kasparov-topalov-1999',
        plyNumber: 47,
        moveNumber: 24,
        turn: 'w',
        fenBefore: 'r6r/k4p1p/1n1q1np1/N1pP4/3b1Q2/P4PPB/1PP4P/1K1RR3 w - - 0 24',
        championMoveSan: 'Rxd4',
        championMoveUci: 'd1d4',
        preMoveFraming: "Black's queen stands on d6 and the black king is pinned on a7. Topalov believes White's d1-rook is hanging and Black's defense holds. Ordinary moves grant Black time to untangle. What is Garry's decisive sacrifice?",
        structuralRevelation: "24. Rxd4!! An immortal exchange sacrifice. Kasparov surrenders a full rook solely to rip away the c5-pawn's defender and expose the black monarch to a catastrophic cross-board king hunt.",
        cachedRefutations: [
          {
            blunderSan: 'Qxd6',
            blunderTitle: 'Premature Queen Trade',
            punishmentSequence: ['Rxd6', 'dxe5', 'Nd7'],
            refutationNarration: "Trading queens instantly lets Topalov breathe. Black's rook takes on d6, securing the open file and killing all of White's attacking momentum."
          },
          {
            blunderSan: 'Qh4',
            blunderTitle: 'Tame Retreat to h4',
            punishmentSequence: ['Qe6', 'Be3', 'b5'],
            refutationNarration: "Qh4 allows Black to comfortably consolidate with 24... Qe6, cementing the queenside barrier and rendering White's king-hunt ambition dead on arrival."
          }
        ],
        highlightSquares: ['d1', 'd4', 'a7'],
        arrows: [['d1', 'd4', '#D4AF37']]
      },
      {
        id: 'kasparov-node-2',
        gameId: 'kasparov-topalov-1999',
        plyNumber: 53,
        moveNumber: 27,
        turn: 'w',
        fenBefore: 'r6r/7p/1k3np1/N1pP4/3Q4/P4PPB/1PP4P/1K2R3 w - - 0 27',
        championMoveSan: 'b4+',
        championMoveUci: 'b2b4',
        preMoveFraming: "Topalov's king has been dragged to the b6 square. Natural human impulses scream to deliver a queen check or trade pieces. But unless every escape square is sealed with tempo, the king escapes to c7.",
        structuralRevelation: "27. b4+! A venomous pawn strike. Kasparov does not give a lazy queen check; he uses the b4-pawn to rip away the c5 square, dragging Topalov's king deeper into the slaughterhouse at a4.",
        cachedRefutations: [
          {
            blunderSan: 'Qc3',
            blunderTitle: 'Premature Queen Alignment',
            punishmentSequence: ['Kb7', 'a4', 'Qe6'],
            refutationNarration: "Qc3 gives Black a free tempo. Topalov's king retreats to b7 into safe shelter, and White's sacrificial assault evaporates."
          },
          {
            blunderSan: 'Rd1',
            blunderTitle: 'Greedy Pin Maneuver',
            punishmentSequence: ['Qxd4', 'Rxd4', 'Ka5'],
            refutationNarration: "Trading queens with Rd1 lets the black king escape to a5 and safety. You surrendered a rook for nothing."
          }
        ],
        highlightSquares: ['b2', 'b4', 'b6'],
        arrows: [['b2', 'b4', '#D4AF37']]
      },
      {
        id: 'kasparov-node-3',
        gameId: 'kasparov-topalov-1999',
        plyNumber: 61,
        moveNumber: 31,
        turn: 'w',
        fenBefore: 'r6r/1R5p/5np1/N1P5/2q5/k1Q2PPB/2P4P/1K6 w - - 0 31',
        championMoveSan: 'Qxf6',
        championMoveUci: 'c3f6',
        preMoveFraming: "Black has played 30... Qc4, threatening White's queen while Black's king stands on a3. White must eliminate the counterplay while weaving a mating net.",
        structuralRevelation: "31. Qxf6! Cold-blooded precision. Kasparov wipes out the f6 knight, cutting off Black's defending piece while setting up unavoidable checkmating geometry along the a-file and diagonal.",
        cachedRefutations: [
          {
            blunderSan: 'Qa1+',
            blunderTitle: 'Hasty Queen Check',
            punishmentSequence: ['Qa4', 'Qxa4+', 'Kxa4'],
            refutationNarration: "Qa1+ allows Black to block with 31... Qa4. After the queen trade, Black's king is active and White's mating attack has vanished into an equal endgame."
          }
        ],
        highlightSquares: ['c3', 'f6', 'a3'],
        arrows: [['c3', 'f6', '#D4AF37']]
      }
    ]
  },

  // ============================================================================
  // 2. MIKHAIL TAL: THE KNIGHT LIGHTNING (1965)
  // ============================================================================
  {
    id: 'tal-larsen-1965',
    championId: 'tal',
    championName: 'Mikhail Tal',
    stylisticDogma: 'Intuitive Sacrifices & Psychological Chaos',
    openingIntent: 'Tal chose the Sicilian Richter-Rauzer to provoke sharp imbalances, intending to sacrifice minor pieces on e6/d5 before Larsen could mobilize his queenside rooks.',
    totalCriticalMoments: 2,
    championColor: 'w',
    pgnContent: `[Event "Candidates Semifinal"]
[Site "Bled YUG"]
[Date "1965.08.08"]
[Round "10"]
[White "Tal, Mikhail"]
[Black "Larsen, Bent"]
[Result "1-0"]
[ECO "B82"]

1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 e6 5. Nc3 d6 6. Be3 Nf6 7. f4 Be7 8. Qf3 O-O 9. O-O-O Qc7 10. Ndb5 Qb8 11. g4 a6 12. Nd4 Nxd4 13. Bxd4 b5 14. g5 Nd7 15. Bd3 b4 16. Nd5 exd5 17. exd5 f5 18. Rde1 Rf7 19. h4 Bb7 20. Bxf5 Rxf5 21. Rxe7 Ne5 22. Qe4 Qf8 23. fxe5 Rf4 24. Qe3 Rf3 25. Qe2 Qxe7 26. Qxf3 dxe5 27. Re1 Rd8 28. Rxe5 Qd6 29. Qf4 Rf8 30. Qe4 b3 31. axb3 Rf1+ 32. Kd2 Qb4+ 33. c3 Qd6 34. Bc5 Qxc5 35. Re8+ Rf8 36. Qe6+ Kh8 37. Qf7 1-0`,
    moments: [
      {
        id: 'tal-node-1',
        gameId: 'tal-larsen-1965',
        plyNumber: 31,
        moveNumber: 16,
        turn: 'w',
        fenBefore: 'rq3rk1/1b1nbppp/p2p4/3N4/1p3P2/2BB4/PPP4P/2KR3R w - - 0 16',
        championMoveSan: 'Nd5',
        championMoveUci: 'c3d5',
        preMoveFraming: "Larsen has pushed 15... b4, attacking White's knight on c3. Standard players instinctively retreat the knight to e2 or a4. But retreating surrenders the initiative to Black. How does Tal answer?",
        structuralRevelation: "16. Nd5!! The trademark Tal lightning bolt. Instead of retreating, Tal hurls the knight directly into the heart of Black's camp, opening the e-file and tearing down the diagonal toward g7.",
        cachedRefutations: [
          {
            blunderSan: 'Ne2',
            blunderTitle: 'Passive Knight Retreat',
            punishmentSequence: ['Bb7', 'g5', 'd5'],
            refutationNarration: "Retreating to e2 plays directly into Larsen's hands. Black develops with Bb7 and breaks the center with d5, seizing full strategic dominance."
          },
          {
            blunderSan: 'Na4',
            blunderTitle: 'Edge of the Board Exile',
            punishmentSequence: ['Bc6', 'b3', 'Bxa4'],
            refutationNarration: "Placing the knight on the rim at a4 leaves it isolated and out of the game. Larsen surrounds and chops it off with Bc6."
          }
        ],
        highlightSquares: ['c3', 'd5'],
        arrows: [['c3', 'd5', '#D4AF37']]
      },
      {
        id: 'tal-node-2',
        gameId: 'tal-larsen-1965',
        plyNumber: 39,
        moveNumber: 20,
        turn: 'w',
        fenBefore: 'rq4k1/1b1nb1pp/p2p4/3P1p2/1p3P1P/3B4/PPP4R/2K1R3 w - - 0 20',
        championMoveSan: 'Bxf5',
        championMoveUci: 'd3f5',
        preMoveFraming: "Black is trying to consolidate with ...Rf7. Tal's bishop on d3 is primed. How does White obliterate the f5-pawn and unhinge Black's king defense?",
        structuralRevelation: "20. Bxf5! Ripping apart the kingside fortress. Tal destroys the f5 barricade, unleashing his heavy rooks and creating deadly threats against both d7 and e7.",
        cachedRefutations: [
          {
            blunderSan: 'Rxe7',
            blunderTitle: 'Premature Rook Infiltration',
            punishmentSequence: ['Rxe7', 'Bxf5', 'Nf8'],
            refutationNarration: "Rxe7 trades White's most active rook too early, allowing Black's knight to re-route via Nf8 and hold the position."
          }
        ],
        highlightSquares: ['d3', 'f5'],
        arrows: [['d3', 'f5', '#D4AF37']]
      }
    ]
  },

  // ============================================================================
  // 3. ANATOLY KARPOV: THE BOA CONSTRICTOR (1974)
  // ============================================================================
  {
    id: 'karpov-unzicker-1974',
    championId: 'karpov',
    championName: 'Anatoly Karpov',
    stylisticDogma: 'Suffocating Prophylaxis & Positional Torture',
    openingIntent: 'Karpov played the Ruy Lopez with the explicit goal of completely paralyzing Black\'s counterplay along the a-file and d-file, suffocating Unzicker until no piece had a constructive square.',
    totalCriticalMoments: 2,
    championColor: 'w',
    pgnContent: `[Event "Nice Olympiad"]
[Site "Nice FRA"]
[Date "1974.06.20"]
[Round "12"]
[White "Karpov, Anatoly"]
[Black "Unzicker, Wolfgang"]
[Result "1-0"]
[ECO "C98"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4 Qc7 12. Nbd2 Nc6 13. d5 Nd8 14. a4 Rb8 15. axb5 axb5 16. b4 Nb7 17. Nf1 Bd7 18. Bd2 Ra8 19. Qe2 c4 20. Ng3 g6 21. Nh2 Rfb8 22. f4 exf4 23. Bxf4 Be8 24. Nf3 Nd7 25. e5 dxe5 26. Nxe5 Nxe5 27. Bxe5 Bd6 28. Bd4 Rxa1 29. Rxa1 Bxg3 30. Qf3 Be5 31. Bxe5 Qxe5 32. Ra7 Nd6 33. Qf2 Qxc3 34. Qc5 Qe1+ 35. Kh2 Qe5+ 36. Kg1 1-0`,
    moments: [
      {
        id: 'karpov-node-1',
        gameId: 'karpov-unzicker-1974',
        plyNumber: 31,
        moveNumber: 16,
        turn: 'w',
        fenBefore: '1r1q1rk1/1b1nbppp/3p4/1p1Pp3/pP2P3/2N2N1P/1PP2PP1/R1BQ1RK1 w - - 0 16',
        championMoveSan: 'b4',
        championMoveUci: 'b2b4',
        preMoveFraming: "Unzicker hopes to play ...c4 and lock the queenside, or activate his knight on b6. Karpov wants total positional asphyxiation. What move seals the entire flank?",
        structuralRevelation: "16. b4! The classic Karpov clamp. White permanently fixes the queenside pawn structure, denying Black's knight any entry on c5 or a5 and securing the a-file for White's heavy rooks.",
        cachedRefutations: [
          {
            blunderSan: 'Qe2',
            blunderTitle: 'Routine Queen Development',
            punishmentSequence: ['c4', 'Be3', 'Nb6'],
            refutationNarration: "Qe2 allows Black to snap shut the queenside with 16... c4! Suddenly Black's knight finds a permanent home on b6, and White's advantage slips away."
          }
        ],
        highlightSquares: ['b2', 'b4', 'c5'],
        arrows: [['b2', 'b4', '#D4AF37']]
      },
      {
        id: 'karpov-node-2',
        gameId: 'karpov-unzicker-1974',
        plyNumber: 47,
        moveNumber: 24,
        turn: 'w',
        fenBefore: 'r3b1k1/1n1n1p1p/3p2p1/1p1P4/1Pp1PP2/2N3NP/2B3P1/R2Q2K1 w - - 0 24',
        championMoveSan: 'Nf3',
        championMoveUci: 'h2f3',
        preMoveFraming: "Black's pieces are coiled into knots on the back ranks. Karpov re-routes his pieces with surgical precision toward the weak e5 and d4 squares. What is the subtle master stroke?",
        structuralRevelation: "24. Nf3! Supreme prophylaxis. Karpov maneuvers the knight into position to dominate e5, depriving Black's defensive bishop of any active counter-diagonal.",
        cachedRefutations: [
          {
            blunderSan: 'f5',
            blunderTitle: 'Premature Pawn Rush',
            punishmentSequence: ['g5', 'Ne2', 'Nf8'],
            refutationNarration: "Rushing with f5 prematurely closes the kingside and hands Black the g5 outpost. Karpov never rushes; he constricts."
          }
        ],
        highlightSquares: ['h2', 'f3'],
        arrows: [['h2', 'f3', '#D4AF37']]
      }
    ]
  },

  // ============================================================================
  // 4. BOBBY FISCHER: GAME OF THE CENTURY (1956)
  // ============================================================================
  {
    id: 'fischer-byrne-1956',
    championId: 'fischer',
    championName: 'Bobby Fischer',
    stylisticDogma: 'Relentless Concrete Clarity & Hyper-Accuracy',
    openingIntent: 'Fischer chose the Grünfeld Defense to concede the center temporarily, using active piece pressure from the fianchettoed bishop on g7 to demolish White\'s overextended center.',
    totalCriticalMoments: 2,
    championColor: 'b',
    pgnContent: `[Event "Third Rosenwald Trophy"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[Round "8"]
[White "Byrne, Donald"]
[Black "Fischer, Robert James"]
[Result "0-1"]
[ECO "D92"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`,
    moments: [
      {
        id: 'fischer-node-1',
        gameId: 'fischer-byrne-1956',
        plyNumber: 34,
        moveNumber: 17,
        turn: 'b',
        fenBefore: 'r3r1k1/pp3pbp/1qp3p1/2B5/4n3/2n2N2/P4PPP/3R1K1R b - - 0 17',
        championMoveSan: 'Be6',
        championMoveUci: 'c8e6',
        preMoveFraming: "Donald Byrne has just played 17. Bc5, attacking Fischer's queen on b6. Any human instinct tells you to save your queen with 17... Qa6 or 17... Qb5. But 13-year-old Bobby sees a devastating combination.",
        structuralRevelation: "17... Be6!! The queen sacrifice heard round the world. Fischer offers his most powerful piece because Byrne's uncastled king on f1 is caught in a deadly windmill of checks.",
        cachedRefutations: [
          {
            blunderSan: 'Qa6',
            blunderTitle: 'Cautious Queen Retreat',
            punishmentSequence: ['Bxf8', 'Bxf8', 'Kg1'],
            refutationNarration: "17... Qa6 saves the queen, but allows Byrne to capture on f8 with check. White's king slips away to safety and Fischer loses the brilliancy."
          },
          {
            blunderSan: 'Qb5',
            blunderTitle: 'Desperate Pin',
            punishmentSequence: ['Bxf8', 'Bxf8', 'Qxb5'],
            refutationNarration: "17... Qb5 allows White to capture the rook on e8 while threatening the queen, leaving Black in an inferior endgame."
          }
        ],
        highlightSquares: ['c8', 'e6', 'b6', 'c5'],
        arrows: [['c8', 'e6', '#D4AF37']]
      },
      {
        id: 'fischer-node-2',
        gameId: 'fischer-byrne-1956',
        plyNumber: 36,
        moveNumber: 18,
        turn: 'b',
        fenBefore: 'r3r1k1/pp3pbp/1B2b1p1/8/4n3/2n2N2/P4PPP/3R1K1R b - - 0 18',
        championMoveSan: 'Bxc4+',
        championMoveUci: 'e6c4',
        preMoveFraming: "Byrne has snapped off Fischer's queen with 18. Bxb6. The windmill must begin with complete, relentless forcing precision. What is the only path?",
        structuralRevelation: "18... Bxc4+! Check! Bobby starts the lethal carousel. The dark-squared bishop cuts off g1 and forces Byrne's king into the corner.",
        cachedRefutations: [
          {
            blunderSan: 'axb6',
            blunderTitle: 'Greedy Recapture',
            punishmentSequence: ['Kg1', 'Ne2+', 'Kf1'],
            refutationNarration: "Recapturing on b6 gives White time to play Kg1. Without the forcing check, White coordinates and stays a queen ahead."
          }
        ],
        highlightSquares: ['e6', 'c4', 'f1'],
        arrows: [['e6', 'c4', '#D4AF37']]
      }
    ]
  }
];
