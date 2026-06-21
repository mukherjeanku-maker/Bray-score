import React, { useState, useEffect, useRef } from 'react';
import { Player, Round, SavedGame } from './types';
import { PlayerSetup } from './components/PlayerSetup';
import ClubMembers from './components/ClubMembers';
import TopPlayersSection from './components/TopPlayersSection';
import PlayerComparison from './components/PlayerComparison';
import { ScoreBoard } from './components/ScoreBoard';
import { RoundModal } from './components/RoundModal';
import { HistoryTable } from './components/HistoryTable';
import { GameHistory } from './components/GameHistory';
import AdminPanel from './components/AdminPanel';
import { Flame, PlusCircle, RotateCcw, AlertTriangle, ShieldAlert, CheckCircle, Save, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth, signInGuest, handleFirestoreError, OperationType, cleanUndefined } from './lib/firebase';

function normalizeAndMergeHistory(rawHistory: SavedGame[], registry: Player[]): SavedGame[] {
  if (!rawHistory || rawHistory.length === 0 || !registry || registry.length === 0) return rawHistory || [];

  return rawHistory.map(game => {
    const updatedPlayers = game.players.map(p => {
      const canon = registry.find(r => {
        if (r.id === p.id) return true;
        
        const rOfficialName = (r.officialName || r.name || '').toLowerCase().trim();
        const pOfficialName = (p.officialName || p.name || '').toLowerCase().trim();
        if (rOfficialName && rOfficialName === pOfficialName) return true;

        const rNick = (r.nickname || '').toLowerCase().trim();
        const pNick = (p.nickname || '').toLowerCase().trim();
        if (rNick && pNick && rNick === pNick) return true;

        return false;
      });

      if (canon) {
        return {
          ...p,
          id: canon.id,
          name: canon.nickname || canon.officialName || p.name,
          officialName: canon.officialName,
          nickname: canon.nickname
        };
      }
      return p;
    });

    const updatedRounds = game.rounds.map(round => {
      const updatedScores: Record<string, number> = {};
      
      Object.entries(round.scores).forEach(([originalId, score]) => {
        const correspondingPlayerIndex = game.players.findIndex(p => p.id === originalId);
        if (correspondingPlayerIndex !== -1) {
          const canonicalPlayerId = updatedPlayers[correspondingPlayerIndex].id;
          updatedScores[canonicalPlayerId] = score;
        } else {
          updatedScores[originalId] = score;
        }
      });

      return {
        ...round,
        scores: updatedScores
      };
    });

    const stands = updatedPlayers.map(p => {
      const total = updatedRounds.reduce((sum, r) => sum + (r.scores[p.id] || 0), 0);
      return { ...p, total };
    }).sort((a, b) => a.total - b.total);

    const winnerName = stands[0] ? stands[0].name : game.winnerName;

    return {
      ...game,
      players: updatedPlayers,
      rounds: updatedRounds,
      winnerName
    };
  });
}

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // --- STATE ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [status, setStatus] = useState<'setup' | 'playing' | 'ended'>('setup');
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  
  // Navigation tabs for the single-view dashboard
  const [activeTab, setActiveTab] = useState<'table' | 'members' | 'comparison' | 'history' | 'admin'>('table');
  const [isAdmin, setIsAdmin] = useState<boolean>(true); // Auto-granted for command panels on the shared board

  // Permanent daily match database
  const [history, setHistory] = useState<SavedGame[]>([]);

  // Cached names for fast loading on reuse
  const [savedPlayers, setSavedPlayers] = useState<Player[]>([]);

  // Auto-save tracker states
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);

  // --- MONITORS AUTH STATE CHANGE ---
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!isMounted) return;
      if (user) {
        setCurrentUser(user);
        setIsAdmin(true);
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // --- CLOUD FIRESTORE SYNC: PLAYERS DIRECTORY ---
  useEffect(() => {
    const playersRef = collection(db, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const list: Player[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Player);
      });

      // Seeding database with initial custom mock directory if totally empty
      if (list.length === 0) {
        const DEFAULT_MEMBERS: Player[] = [
          { id: 'member-1', name: 'Ashu', officialName: 'Ashok Kumar', nickname: 'Ashu' },
          { id: 'member-2', name: 'Sanju', officialName: 'Sanjay Banerjee', nickname: 'Sanju' },
          { id: 'member-3', name: 'Nobi', officialName: 'Pronab Mukherjee', nickname: 'Nobi' },
          { id: 'member-4', name: 'Amits', officialName: 'Amit Sen', nickname: 'Amits' },
        ];
        DEFAULT_MEMBERS.forEach(async (p) => {
          try {
            await setDoc(doc(db, 'players', p.id), cleanUndefined(p));
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `players/${p.id}`);
          }
        });
      } else {
        setSavedPlayers(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'players');
    });

    return () => unsubscribe();
  }, []);

  // --- CLOUD FIRESTORE SYNC: HISTORIC MATCH LOGS ---
  useEffect(() => {
    const historyRef = collection(db, 'history');
    const unsubscribe = onSnapshot(historyRef, (snapshot) => {
      const list: SavedGame[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as SavedGame);
      });
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const normalized = normalizeAndMergeHistory(list, savedPlayers);
      setHistory(normalized);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'history');
    });

    return () => unsubscribe();
  }, [savedPlayers]);

  // --- CLOUD FIRESTORE SYNC: ACTIVE CARD TABLE SESSION ---
  useEffect(() => {
    const activeSessionRef = doc(db, 'activeSession', 'current');
    const unsubscribe = onSnapshot(activeSessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlayers(data.players || []);
        setRounds(data.rounds || []);
        setStatus(data.status || 'setup');
        if (data.lastAutoSavedTime) {
          setLastAutoSavedTime(data.lastAutoSavedTime);
        }
      } else {
        // Initialize current activeSession doc
        try {
          setDoc(activeSessionRef, cleanUndefined({
            players: [],
            rounds: [],
            status: 'setup'
          }));
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, 'activeSession/current');
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'activeSession/current');
    });

    return () => unsubscribe();
  }, []);


  // --- FIRESTORE DIRECT WRITE ACTIONS ---
  const handleStartGame = async (newPlayers: Player[]) => {
    setActiveTab('table');

    // Resolve canonical profiles using cloud directory state
    const canonicalPlayers = newPlayers.map((p) => {
      const existing = savedPlayers.find((m) => {
        if (m.id === p.id) return true;
        const mOfficialName = (m.officialName || m.name || '').toLowerCase().trim();
        const pOfficialName = (p.officialName || p.name || '').toLowerCase().trim();
        if (mOfficialName && mOfficialName === pOfficialName) return true;

        const mNick = (m.nickname || '').toLowerCase().trim();
        const pNick = (p.nickname || '').toLowerCase().trim();
        if (pNick && mNick && mNick === pNick) return true;

        return false;
      });

      if (existing) {
        return {
          ...existing,
          name: p.name || existing.name,
          officialName: p.officialName || existing.officialName,
          nickname: p.nickname || existing.nickname,
          avatarUrl: p.avatarUrl || existing.avatarUrl,
        };
      }
      return p;
    });

    // Write start card table status to Cloud Firestore
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    try {
      await setDoc(doc(db, 'activeSession', 'current'), cleanUndefined({
        players: canonicalPlayers,
        rounds: [],
        status: 'playing',
        lastAutoSavedTime: timeStr
      }));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'activeSession/current');
    }

    // Save profile attributes updates directly in cloud players directory
    canonicalPlayers.forEach(async (cp) => {
      try {
        await setDoc(doc(db, 'players', cp.id), cleanUndefined(cp));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `players/${cp.id}`);
      }
    });
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    try {
      await setDoc(doc(db, 'players', updatedPlayer.id), cleanUndefined(updatedPlayer));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `players/${updatedPlayer.id}`);
    }

    // Hot-update players in-seat if they are currently sitting at the active table
    if (status !== 'setup') {
      const updatedActivePlayers = players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
      try {
        await setDoc(doc(db, 'activeSession', 'current'), cleanUndefined({
          players: updatedActivePlayers,
          rounds,
          status,
          lastAutoSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'activeSession/current');
      }
    }
  };

  const handleAddClubPlayer = async (p: Player) => {
    try {
      await setDoc(doc(db, 'players', p.id), cleanUndefined(p));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `players/${p.id}`);
    }
  };

  const handleDeleteClubPlayer = async (playerIdToRemove: string) => {
    try {
      await deleteDoc(doc(db, 'players', playerIdToRemove));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `players/${playerIdToRemove}`);
    }

    // Reset table setup if a seated player profile was deleted
    if (players.some(p => p.id === playerIdToRemove)) {
      try {
        await setDoc(doc(db, 'activeSession', 'current'), cleanUndefined({
          players: [],
          rounds: [],
          status: 'setup',
          lastAutoSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'activeSession/current');
      }
    }
  };

  const handleSaveRound = async (roundScores: Record<string, number>) => {
    let nextRounds = [...rounds];
    if (editingRound) {
      nextRounds = rounds.map(r => r.roundNumber === editingRound.roundNumber ? { ...r, scores: roundScores } : r);
      setEditingRound(null);
    } else {
      const nextNum = rounds.length + 1;
      const newRound: Round = {
        roundNumber: nextNum,
        scores: roundScores
      };
      nextRounds.push(newRound);
    }

    try {
      await setDoc(doc(db, 'activeSession', 'current'), cleanUndefined({
        players,
        rounds: nextRounds,
        status,
        lastAutoSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'activeSession/current');
    }
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setIsRoundModalOpen(true);
  };

  const handleUndoLastRound = async () => {
    if (rounds.length === 0) return;
    const nextRounds = rounds.slice(0, -1);

    try {
      await setDoc(doc(db, 'activeSession', 'current'), cleanUndefined({
        players,
        rounds: nextRounds,
        status,
        lastAutoSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'activeSession/current');
    }
  };

  const handleEndGameStatus = async () => {
    if (rounds.length > 0 && players.length > 0) {
      const standings = players.map((player) => {
        const total = rounds.reduce((sum, r) => sum + (r.scores[player.id] || 0), 0);
        return { ...player, total };
      }).sort((a, b) => a.total - b.total);

      const winnerName = standings[0] ? standings[0].name : 'Unknown Player';

      const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newArchivedGame: SavedGame = {
        id: gameId,
        players: [...players],
        rounds: [...rounds],
        date: new Date().toISOString(),
        winnerName
      };

      try {
        await setDoc(doc(db, 'history', gameId), cleanUndefined(newArchivedGame));
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `history/${gameId}`);
      }
    }

    try {
      await setDoc(doc(db, 'activeSession', 'current'), cleanUndefined({
        players,
        rounds,
        status: 'ended',
        lastAutoSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'activeSession/current');
    }
  };

  const handleClearHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'history'));
      const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'history');
    }
  };

  const handleResetAllClubhouseData = async () => {
    try {
      // Clear players directory
      const playersSnaps = await getDocs(collection(db, 'players'));
      await Promise.all(playersSnaps.docs.map(docSnap => deleteDoc(docSnap.ref)));

      // Write default seed templates back to Firebase
      const DEFAULT_MEMBERS: Player[] = [
        { id: 'member-1', name: 'Ashu', officialName: 'Ashok Kumar', nickname: 'Ashu' },
        { id: 'member-2', name: 'Sanju', officialName: 'Sanjay Banerjee', nickname: 'Sanju' },
        { id: 'member-3', name: 'Nobi', officialName: 'Pronab Mukherjee', nickname: 'Nobi' },
        { id: 'member-4', name: 'Amits', officialName: 'Amit Sen', nickname: 'Amits' },
      ];
      await Promise.all(DEFAULT_MEMBERS.map(p => setDoc(doc(db, 'players', p.id), cleanUndefined(p))));
      
      // Clear archives
      const historySnaps = await getDocs(collection(db, 'history'));
      await Promise.all(historySnaps.docs.map(docSnap => deleteDoc(docSnap.ref)));

      // Reset card table setup values
      await setDoc(doc(db, 'activeSession', 'current'), cleanUndefined({
        players: [],
        rounds: [],
        status: 'setup',
        lastAutoSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
      
      setActiveTab('table');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'all');
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
      await deleteDoc(doc(db, 'history', gameId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `history/${gameId}`);
    }
  };

  const handleUpdateCompletedGame = async (updatedGame: SavedGame) => {
    const standings = updatedGame.players.map((p) => {
      const total = updatedGame.rounds.reduce((sum, r) => sum + (r.scores[p.id] || 0), 0);
      return { ...p, total };
    }).sort((a, b) => a.total - b.total);

    const winnerName = standings[0] ? standings[0].name : 'Unknown Player';
    const nextGame = {
      ...updatedGame,
      winnerName
    };

    try {
      await setDoc(doc(db, 'history', updatedGame.id), cleanUndefined(nextGame));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `history/${updatedGame.id}`);
    }
  };

  const triggerResetPrompt = () => {
    setShowResetConfirm(true);
  };

  const confirmResetGame = async () => {
    try {
      await setDoc(doc(db, 'activeSession', 'current'), cleanUndefined({
        players: [],
        rounds: [],
        status: 'setup',
        lastAutoSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
      setShowResetConfirm(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'activeSession/current');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-editorial-bg text-editorial-text flex flex-col justify-center items-center font-sans">
        <div className="space-y-4 text-center">
          <span className="text-4xl text-editorial-gold animate-bounce block">⚜️</span>
          <h2 className="text-md font-mono uppercase tracking-[0.2em] text-[#ece5d8]">AGNIBINA SANGHA</h2>
          <p className="text-[11px] uppercase tracking-widest text-[#8e8271] font-mono animate-pulse">Establishing Secure Database Handshake...</p>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-editorial-bg text-editorial-text flex flex-col font-sans selection:bg-editorial-gold/20" id="main-view">
      {/* Editorial Header Section */}
      <header className="border-b border-editorial-border pb-6 pt-8 px-6 sm:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 max-w-4xl w-full mx-auto" id="app-header">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl text-editorial-gold">⚜️</span>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none hover:text-editorial-gold transition-colors duration-300">
              Agnibina Sangha
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold text-editorial-gold mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Bray Card Club</span>
            <span className="text-editorial-border/60">•</span>
            <span className="text-[#8e8271] font-mono">Established: 1947</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center sm:items-end justify-between sm:justify-end w-full sm:w-auto gap-5 border-t sm:border-t-0 border-editorial-border/40 pt-4 sm:pt-0" id="header-user-controls">
          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-widest text-editorial-muted mb-0.5 font-bold">Active Table</div>
            <div className="text-lg font-mono font-bold text-editorial-text" id="activeStatusDisplay">
              {status === 'setup' ? 'REGISTRATION' : `ROUND ${String(rounds.length + 1).padStart(2, '0')}`}
            </div>
          </div>

          {isAdmin && status !== 'setup' && (
            <button
              onClick={triggerResetPrompt}
              className="px-4 py-2 bg-transparent text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs uppercase tracking-widest font-black border border-red-900/40 hover:border-red-500/50 rounded-xs transition-all cursor-pointer font-mono"
              id="header-reset-btn"
            >
              Reset All
            </button>
          )}
        </div>
      </header>

      {/* Editorial Navigation Tabs */}
      <div className="max-w-4xl w-full mx-auto px-6 sm:px-8 mt-4 flex border-b border-editorial-border/60 font-mono">
        <button
          onClick={() => setActiveTab('table')}
          className={`px-5 py-3 text-xs uppercase tracking-[0.2em] font-bold transition-all relative cursor-pointer ${
            activeTab === 'table' ? 'text-editorial-gold font-bold' : 'text-editorial-muted hover:text-[#e0d6c5]'
          }`}
          id="tab-btn-active-table"
        >
          Active Card Table
          {activeTab === 'table' ? (
            <motion.span 
              layoutId="nav-underline" 
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-editorial-gold" 
            />
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-5 py-3 text-xs uppercase tracking-[0.2em] font-bold transition-all relative cursor-pointer ${
            activeTab === 'members' ? 'text-editorial-gold font-bold' : 'text-editorial-muted hover:text-[#e0d6c5]'
          }`}
          id="tab-btn-club-members"
        >
          Club Directory
          {activeTab === 'members' ? (
            <motion.span 
              layoutId="nav-underline" 
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-editorial-gold" 
            />
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-5 py-3 text-xs uppercase tracking-[0.2em] font-bold transition-all relative cursor-pointer ${
            activeTab === 'comparison' ? 'text-editorial-gold font-bold' : 'text-editorial-muted hover:text-[#e0d6c5]'
          }`}
          id="tab-btn-1v1-compare"
        >
          1v1 Duel Compare
          {activeTab === 'comparison' ? (
            <motion.span 
              layoutId="nav-underline" 
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-editorial-gold" 
            />
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-xs uppercase tracking-[0.2em] font-bold transition-all relative cursor-pointer flex items-center gap-2 ${
            activeTab === 'history' ? 'text-editorial-gold font-bold' : 'text-editorial-muted hover:text-[#e0d6c5]'
          }`}
          id="tab-btn-archives"
        >
          Agnibina Archive Records
          {history.length > 0 && (
            <span className="bg-editorial-gold text-black rounded-none w-5 h-4 text-[9px] font-black font-mono inline-flex items-center justify-center">
              {history.length}
            </span>
          )}
          {activeTab === 'history' ? (
            <motion.span 
              layoutId="nav-underline" 
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-editorial-gold" 
            />
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-5 py-3 text-xs uppercase tracking-[0.2em] font-bold transition-all relative cursor-pointer flex items-center gap-2 ${
            activeTab === 'admin' ? 'text-editorial-gold font-bold' : 'text-editorial-muted hover:text-[#e0d6c5]'
          }`}
          id="tab-btn-admin"
        >
          <Shield className="w-3.5 h-3.5" />
          Command Core
          {activeTab === 'admin' ? (
            <motion.span 
              layoutId="nav-underline" 
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-editorial-gold" 
            />
          ) : null}
        </button>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'comparison' ? (
            // 1v1 Performance Comparison Pane
            <motion.div
              key="player-comparison-pane"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PlayerComparison
                savedPlayers={savedPlayers}
                games={history}
              />
            </motion.div>
          ) : activeTab === 'members' ? (
            // Club Members directory Pane
            <motion.div
              key="club-members-pane"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ClubMembers
                savedPlayers={savedPlayers}
                onAddPlayer={handleAddClubPlayer}
                onUpdatePlayer={handleUpdatePlayer}
                onDeletePlayer={handleDeleteClubPlayer}
                games={history}
                isAdmin={isAdmin}
              />
            </motion.div>
          ) : activeTab === 'history' ? (
            // Game History Pane
            <motion.div
              key="game-history-pane"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <GameHistory
                games={history}
                onClearHistory={handleClearHistory}
                onDeleteGame={handleDeleteGame}
                isAdmin={isAdmin}
                onUpdateCompletedGame={handleUpdateCompletedGame}
              />
            </motion.div>
          ) : activeTab === 'admin' ? (
            // Secure Admin Panel Pane
            <motion.div
              key="admin-panel-pane"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AdminPanel
                isAdmin={isAdmin}
                setIsAdmin={setIsAdmin}
                onResetActiveGameTable={confirmResetGame}
                onClearAllGameHistory={handleClearHistory}
                onResetAllClubhouseData={handleResetAllClubhouseData}
                savedPlayers={savedPlayers}
                games={history}
              />
            </motion.div>
          ) : status === 'setup' ? (
            // Form setup view
            <motion.div
              key="setup-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-2 space-y-8"
            >
              <PlayerSetup 
                onStartGame={handleStartGame} 
                savedPlayers={savedPlayers} 
                onNavigateToMembers={() => setActiveTab('members')}
              />
              <TopPlayersSection
                history={history}
                savedPlayers={savedPlayers}
              />
            </motion.div>
          ) : (
            // Interactive game arena view
            <motion.div
              key="game-arena"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Record Round Action Box */}
              {status === 'playing' && (
                <div className="bg-editorial-dark border border-editorial-border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-editorial-gold/30 transition-all duration-350" id="action-trigger-box">
                  <div className="space-y-1 flex flex-col items-start">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-editorial-gold block">
                      Live Tournament Status
                    </span>
                    <h4 className="text-lg font-bold uppercase tracking-tight text-white">
                      Rounds logged: {rounds.length}
                    </h4>
                    <p className="text-xs text-[#8e8271] max-w-md">
                      Individual Bray scoring rules enforced. Tap record to calculate tally for Round {rounds.length + 1}.
                    </p>
                    {lastAutoSavedTime && (
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-[#dcae44] mt-2 bg-[#1c1914] border border-[#dcae44]/20 px-2 py-0.5 rounded-none" id="save-status-badge">
                        <span className={`w-1.5 h-1.5 rounded-full bg-editorial-gold ${isAutoSaving ? 'animate-ping' : 'animate-pulse'}`}></span>
                        {isAutoSaving ? 'SESSION BACKUP LIVE...' : `Auto-saved locally: ${lastAutoSavedTime}`}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setIsRoundModalOpen(true)}
                    className="bg-editorial-gold text-black hover:bg-amber-400 transition-all font-black text-xs uppercase tracking-[0.2em] px-6 py-4 rounded-none cursor-pointer text-center whitespace-nowrap active:scale-98"
                    id="add-round-floating-btn"
                  >
                    + Record Round {rounds.length + 1}
                  </button>
                </div>
              )}

              {/* ScoreBoard Standing List */}
              <ScoreBoard
                players={players}
                rounds={rounds}
                status={status}
                onEndGame={() => setShowEndGameConfirm(true)}
                onResetGame={confirmResetGame}
                onUpdatePlayer={handleUpdatePlayer}
                isAdmin={isAdmin}
              />

              {/* Round History Grid Ledger */}
              <HistoryTable
                players={players}
                rounds={rounds}
                onUndoLastRound={handleUndoLastRound}
                onEditRound={handleEditRound}
                isAdmin={isAdmin}
                status={status}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decorative Section */}
      <footer className="max-w-4xl w-full mx-auto px-6 sm:px-8 py-8 border-t border-editorial-border/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left" id="main-footer">
        <div className="text-[10px] uppercase tracking-widest text-editorial-muted font-mono">
          Agnibina Sangha • Est. 1947
        </div>
        <div className="flex gap-6 text-[10px] uppercase tracking-widest text-editorial-muted font-mono">
          {status === 'playing' && (
            <span className="flex items-center gap-1.5 text-editorial-gold font-bold transition-all" id="footer-save-timer-display">
              ⚜️ {isAutoSaving ? 'Auto-saving Table state...' : lastAutoSavedTime ? `Tally saved at ${lastAutoSavedTime}` : 'Autosave Armed'}
            </span>
          )}
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-editorial-gold animate-pulse"></span> Local Storage Active</span>
          <span>Cloud Sync Ready</span>
        </div>
      </footer>

      {/* Scoring Modal Dialog */}
      <RoundModal
        isOpen={isRoundModalOpen}
        onClose={() => {
          setIsRoundModalOpen(false);
          setEditingRound(null);
        }}
        players={players}
        roundNumber={editingRound ? editingRound.roundNumber : rounds.length + 1}
        onSaveRound={handleSaveRound}
        initialScores={editingRound ? editingRound.scores : undefined}
        rounds={rounds}
      />

      {/* Dynamic Reset confirmation pop up overlay to keep flow seamless */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-red-950/60 rounded-none p-8 max-w-md w-full space-y-6 shadow-2xl relative"
              id="confirm-reset-box"
            >
              <div className="flex flex-col gap-2">
                <span className="text-[10px] tracking-[0.25em] font-black text-rose-500 uppercase block">Critical Action</span>
                <h4 className="text-2xl font-black uppercase tracking-tight text-white">
                  Reset Current Game?
                </h4>
              </div>

              <p className="text-xs text-editorial-muted font-medium leading-relaxed font-mono uppercase tracking-wider">
                This will delete current game data. Continue?
              </p>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 bg-transparent hover:bg-neutral-900 border border-editorial-border text-xs uppercase tracking-widest font-bold text-editorial-muted hover:text-white transition-colors cursor-pointer rounded-none"
                  id="cancel-reset-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResetGame}
                  className="flex-1 py-3 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-900/50 rounded-none text-xs uppercase tracking-widest font-black transition-colors cursor-pointer"
                  id="confirm-reset-btn"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* End Game confirmation overlay */}
      <AnimatePresence>
        {showEndGameConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-editorial-gold/30 rounded-none p-8 max-w-md w-full space-y-6 shadow-2xl relative"
              id="confirm-end-game-box"
            >
              <div className="flex flex-col gap-2">
                <span className="text-[10px] tracking-[0.25em] font-black text-editorial-gold uppercase block">Close Card Table</span>
                <h4 className="text-2xl font-black uppercase tracking-tight text-white">
                  Conclude Session?
                </h4>
              </div>

              <p className="text-xs text-editorial-muted font-medium leading-relaxed font-mono uppercase tracking-wider">
                Are you sure you want to end this game?
              </p>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowEndGameConfirm(false)}
                  className="flex-1 py-3 bg-transparent hover:bg-neutral-900 border border-editorial-border text-xs uppercase tracking-widest font-bold text-editorial-muted hover:text-white transition-colors cursor-pointer rounded-none"
                  id="cancel-end-game-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleEndGameStatus();
                    setShowEndGameConfirm(false);
                  }}
                  className="flex-1 py-3 bg-editorial-gold hover:bg-amber-400 text-black rounded-none text-xs uppercase tracking-widest font-black transition-colors cursor-pointer animate-pulse"
                  id="confirm-end-game-btn"
                >
                  End Game
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
