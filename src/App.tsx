import React, { useState, useEffect, useMemo } from 'react';
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
import { Flame, PlusCircle, RotateCcw, AlertTriangle, ShieldAlert, CheckCircle, Save, Shield, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, authenticateUser } from './lib/firebase';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAudioFeedback } from './hooks/useAudioFeedback';

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
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Permanent daily match database
  const [history, setHistory] = useState<SavedGame[]>([]);

  // Cached names for fast loading on reuse
  const [savedPlayers, setSavedPlayers] = useState<Player[]>([]);

  // Dynamically resolve and align active table players with their latest profile updates (name, nickname, avatars)
  const activeTablePlayers = useMemo(() => {
    return players.map((p) => {
      const match = savedPlayers.find((sp) => sp.id === p.id);
      if (match) {
        return {
          ...p,
          name: match.name,
          officialName: match.officialName,
          nickname: match.nickname,
          avatarUrl: match.avatarUrl
        };
      }
      return p;
    });
  }, [players, savedPlayers]);

  // Auto-save tracker states
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [adminPin, setAdminPin] = useState<string>('7908');
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  // --- AUDIO FEEDBACK & SOUND CONTROLS ---
  const { playRoundSaved, playResetGame } = useAudioFeedback();
  const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem('clubhouse_sound_muted') === 'true');

  const toggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    localStorage.setItem('clubhouse_sound_muted', String(nextVal));
  };

  // --- 1. IMPLICIT AUTHENTICATION INITIALIZER ---
  useEffect(() => {
    let active = true;
    authenticateUser().then(() => {
      if (active) {
        setIsAuthReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // --- 2. INITIAL LOAD AND SNAPSHOT LISTENERS FROM FIREBASE ---
  useEffect(() => {
    if (!isAuthReady) return;

    // 1. Listen to active live table state
    const tableDocRef = doc(db, 'live_table', 'current');
    const unsubTable = onSnapshot(tableDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.players) setPlayers(data.players);
        if (data.rounds) setRounds(data.rounds);
        if (data.status) setStatus(data.status);
        if (data.lastSavedTime) setLastAutoSavedTime(data.lastSavedTime);
      } else {
        // Initialize active table doc in Firestore on first-time setup
        setDoc(tableDocRef, {
          id: 'current',
          players: [],
          rounds: [],
          status: 'setup',
          lastSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }).catch((err) => console.warn("Failed to seed current live table:", err));
      }
    }, (error) => {
      console.warn("Table snapshot listener error:", error);
    });

    // 2. Listen to Club members
    const membersColRef = collection(db, 'members');
    const unsubMembers = onSnapshot(membersColRef, (snapshot) => {
      const items: Player[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Player);
      });

      if (items.length === 0) {
        // Seed initial default members
        const DEFAULT_MEMBERS: Player[] = [
          { id: 'member-1', name: 'Ashu', officialName: 'Ashok Kumar', nickname: 'Ashu' },
          { id: 'member-2', name: 'Sanju', officialName: 'Sanjay Banerjee', nickname: 'Sanju' },
          { id: 'member-3', name: 'Nobi', officialName: 'Pronab Mukherjee', nickname: 'Nobi' },
          { id: 'member-4', name: 'Amits', officialName: 'Amit Sen', nickname: 'Amits' },
        ];
        DEFAULT_MEMBERS.forEach((m) => {
          setDoc(doc(db, 'members', m.id), m).catch((err) => console.warn("Failed to seed member:", m.id, err));
        });
        setSavedPlayers(DEFAULT_MEMBERS);
      } else {
        setSavedPlayers(items);
      }
    }, (error) => {
      console.warn("Members snapshot listener error:", error);
    });

    // 3. Listen to Games archive
    const gamesColRef = collection(db, 'games');
    const unsubGames = onSnapshot(gamesColRef, (snapshot) => {
      const gameEntries: SavedGame[] = [];
      snapshot.forEach((doc) => {
        gameEntries.push(doc.data() as SavedGame);
      });
      // Sort desc by date
      gameEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(gameEntries);
    }, (error) => {
      console.warn("Games snapshot listener error:", error);
    });

    // 4. Listen to Admin Settings
    const settingsDocRef = doc(db, 'settings', 'global');
    const unsubSettings = onSnapshot(settingsDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.adminPin) {
          setAdminPin(data.adminPin);
        }
      } else {
        // Seed default settings
        setDoc(settingsDocRef, {
          id: 'global',
          adminPin: '7908'
        }).catch((err) => console.warn("Failed to seed global settings:", err));
        setAdminPin('7908');
      }
    }, (error) => {
      console.warn("Settings snapshot listener error:", error);
    });

    return () => {
      unsubTable();
      unsubMembers();
      unsubGames();
      unsubSettings();
    };
  }, [isAuthReady]);

  // --- ACTIONS ---
  const handleStartGame = async (newPlayers: Player[]) => {
    // Resolve canonical profiles synchronously using the CURRENT savedPlayers state
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

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Save live table state to Firestore
    await setDoc(doc(db, 'live_table', 'current'), {
      id: 'current',
      players: canonicalPlayers,
      rounds: [],
      status: 'playing',
      lastSavedTime: now
    });

    // Write anyone missing or updated profile to members collection
    canonicalPlayers.forEach(async (cp) => {
      await setDoc(doc(db, 'members', cp.id), cp);
    });

    setActiveTab('table'); // Move view focus automatically to the active board
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    await setDoc(doc(db, 'members', updatedPlayer.id), updatedPlayer);
  };

  const handleAddClubPlayer = async (p: Player) => {
    await setDoc(doc(db, 'members', p.id), p);
  };

  const handleDeleteClubPlayer = async (playerIdToRemove: string) => {
    await deleteDoc(doc(db, 'members', playerIdToRemove));
    
    // Check if deleted player is currently sitting at the active game table
    const isSittingAtTable = players.some((p) => p.id === playerIdToRemove);
    if (isSittingAtTable) {
      // ONLY update live table in Firestore to setup state if the deleted member was actually at the table!
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      await setDoc(doc(db, 'live_table', 'current'), {
        id: 'current',
        players: [],
        rounds: [],
        status: 'setup',
        lastSavedTime: now
      });
    }
  };

  const handleSaveRound = async (roundScores: Record<string, number>) => {
    let nextRounds = [...rounds];
    if (editingRound) {
      nextRounds = nextRounds.map(r => r.roundNumber === editingRound.roundNumber ? { ...r, scores: roundScores } : r);
      setEditingRound(null);
    } else {
      const nextNum = rounds.length + 1;
      const newRound: Round = {
        roundNumber: nextNum,
        scores: roundScores
      };
      nextRounds.push(newRound);
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await setDoc(doc(db, 'live_table', 'current'), {
      id: 'current',
      players,
      rounds: nextRounds,
      status,
      lastSavedTime: now
    });

    // Play subtle success sound chime
    playRoundSaved();
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setIsRoundModalOpen(true);
  };

  const handleUndoLastRound = async () => {
    if (rounds.length === 0) return;
    const nextRounds = rounds.slice(0, rounds.length - 1);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    await setDoc(doc(db, 'live_table', 'current'), {
      id: 'current',
      players,
      rounds: nextRounds,
      status,
      lastSavedTime: now
    });
  };

  const handleEndGameStatus = async () => {
    if (rounds.length > 0 && players.length > 0) {
      // 1. Calculate final standings for automatic archive save
      const standings = players.map((player) => {
        const total = rounds.reduce((sum, r) => sum + (r.scores[player.id] || 0), 0);
        return { ...player, total };
      }).sort((a, b) => a.total - b.total);

      const winnerName = standings[0] ? standings[0].name : 'Unknown Player';

      // 2. Draft SavedGame object
      const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newArchivedGame: SavedGame = {
        id: gameId,
        players: [...players],
        rounds: [...rounds],
        date: new Date().toISOString(),
        winnerName
      };

      // 3. Store in Firestore Games collection
      await setDoc(doc(db, 'games', gameId), newArchivedGame);
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await setDoc(doc(db, 'live_table', 'current'), {
      id: 'current',
      players,
      rounds,
      status: 'ended',
      lastSavedTime: now
    });
  };

  const handleClearHistory = async () => {
    // Delete each game from Firestore
    history.forEach(async (g) => {
      await deleteDoc(doc(db, 'games', g.id));
    });
  };

  const handleResetAllClubhouseData = async () => {
    // 1. Delete all saved games
    history.forEach(async (g) => {
      await deleteDoc(doc(db, 'games', g.id));
    });

    // 2. Clear out existing members and seed defaults
    const DEFAULT_MEMBERS: Player[] = [
      { id: 'member-1', name: 'Ashu', officialName: 'Ashok Kumar', nickname: 'Ashu' },
      { id: 'member-2', name: 'Sanju', officialName: 'Sanjay Banerjee', nickname: 'Sanju' },
      { id: 'member-3', name: 'Nobi', officialName: 'Pronab Mukherjee', nickname: 'Nobi' },
      { id: 'member-4', name: 'Amits', officialName: 'Amit Sen', nickname: 'Amits' },
    ];
    // Delete existing savedPlayers from Firestore
    savedPlayers.forEach(async (m) => {
      await deleteDoc(doc(db, 'members', m.id));
    });
    DEFAULT_MEMBERS.forEach(async (m) => {
      await setDoc(doc(db, 'members', m.id), m);
    });

    // 3. Reset table
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await setDoc(doc(db, 'live_table', 'current'), {
      id: 'current',
      players: [],
      rounds: [],
      status: 'setup',
      lastSavedTime: now
    });

    playResetGame();
    setActiveTab('table');
  };

  const handleDeleteGame = async (gameId: string) => {
    await deleteDoc(doc(db, 'games', gameId));
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

    await setDoc(doc(db, 'games', updatedGame.id), nextGame);
  };

  const triggerResetPrompt = () => {
    setShowResetConfirm(true);
  };

  const confirmResetGame = async () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await setDoc(doc(db, 'live_table', 'current'), {
      id: 'current',
      players: [],
      rounds: [],
      status: 'setup',
      lastSavedTime: now
    });
    setShowResetConfirm(false);

    // Play subtle analog slide down sound for reset
    playResetGame();
  };


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
        
        <div className="flex items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-4 border-t sm:border-t-0 border-editorial-border/40 pt-4 sm:pt-0">
          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-widest text-editorial-muted mb-0.5 font-bold">Active Table</div>
            <div className="text-lg font-mono font-bold text-editorial-text" id="activeStatusDisplay">
              {status === 'setup' ? 'REGISTRATION' : `ROUND ${String(rounds.length + 1).padStart(2, '0')}`}
            </div>
          </div>

          <button
            onClick={toggleMute}
            className="p-2.5 bg-transparent hover:bg-neutral-900 border border-editorial-border hover:border-editorial-gold/40 text-editorial-muted hover:text-editorial-gold rounded-xs transition-all cursor-pointer flex items-center justify-center"
            title={isMuted ? "Unmute Sound Feedback" : "Mute Sound Feedback"}
            id="sound-toggle-btn"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-editorial-gold" />}
          </button>

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
                adminPin={adminPin}
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
                        {isAutoSaving ? 'SESSION BACKUP LIVE...' : `Synced to Firestore online: ${lastAutoSavedTime}`}
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
                players={activeTablePlayers}
                rounds={rounds}
                status={status}
                onEndGame={() => setShowEndGameConfirm(true)}
                onResetGame={confirmResetGame}
                onUpdatePlayer={handleUpdatePlayer}
                isAdmin={isAdmin}
              />

              {/* Round History Grid Ledger */}
              <HistoryTable
                players={activeTablePlayers}
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
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Cloud Sync Live</span>
          <span>Firebase Firestore Connected</span>
        </div>
      </footer>

      {/* Scoring Modal Dialog */}
      <RoundModal
        isOpen={isRoundModalOpen}
        onClose={() => {
          setIsRoundModalOpen(false);
          setEditingRound(null);
        }}
        players={activeTablePlayers}
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
