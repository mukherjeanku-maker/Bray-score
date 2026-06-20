import React, { useState, useEffect } from 'react';
import { Player, Round, SavedGame } from './types';
import { PlayerSetup } from './components/PlayerSetup';
import ClubMembers from './components/ClubMembers';
import TopPlayersSection from './components/TopPlayersSection';
import PlayerComparison from './components/PlayerComparison';
import { ScoreBoard } from './components/ScoreBoard';
import { RoundModal } from './components/RoundModal';
import { HistoryTable } from './components/HistoryTable';
import { GameHistory } from './components/GameHistory';
import { Flame, PlusCircle, RotateCcw, AlertTriangle, ShieldAlert, CheckCircle, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [activeTab, setActiveTab] = useState<'table' | 'members' | 'comparison' | 'history'>('table');

  // Permanent daily match database
  const [history, setHistory] = useState<SavedGame[]>([]);

  // Cached names for fast loading on reuse
  const [savedPlayers, setSavedPlayers] = useState<Player[]>([]);

  // --- INITIAL LOAD FROM LOCAL STORAGE ---
  useEffect(() => {
    try {
      const storedPlayers = localStorage.getItem('bray_active_players');
      const storedRounds = localStorage.getItem('bray_active_rounds');
      const storedStatus = localStorage.getItem('bray_active_status');
      const storedSavedList = localStorage.getItem('bray_saved_players_cache');
      const storedArchive = localStorage.getItem('bray_games_archive');

      const DEFAULT_MEMBERS: Player[] = [
        { id: 'member-1', name: 'Ashu', officialName: 'Ashok Kumar', nickname: 'Ashu' },
        { id: 'member-2', name: 'Sanju', officialName: 'Sanjay Banerjee', nickname: 'Sanju' },
        { id: 'member-3', name: 'Nobi', officialName: 'Pronab Mukherjee', nickname: 'Nobi' },
        { id: 'member-4', name: 'Amits', officialName: 'Amit Sen', nickname: 'Amits' },
      ];

      let activeRegistry = DEFAULT_MEMBERS;
      if (storedSavedList) {
        try {
          activeRegistry = JSON.parse(storedSavedList);
          setSavedPlayers(activeRegistry);
        } catch {
          setSavedPlayers(DEFAULT_MEMBERS);
          localStorage.setItem('bray_saved_players_cache', JSON.stringify(DEFAULT_MEMBERS));
        }
      } else {
        setSavedPlayers(DEFAULT_MEMBERS);
        localStorage.setItem('bray_saved_players_cache', JSON.stringify(DEFAULT_MEMBERS));
      }

      if (storedArchive) {
        try {
          const rawArchive = JSON.parse(storedArchive);
          const normalizedArchive = normalizeAndMergeHistory(rawArchive, activeRegistry);
          setHistory(normalizedArchive);
          localStorage.setItem('bray_games_archive', JSON.stringify(normalizedArchive));
        } catch {
          setHistory([]);
        }
      }

      if (storedStatus) {
        setStatus(storedStatus as 'setup' | 'playing' | 'ended');
      }

      if (storedPlayers) {
        setPlayers(JSON.parse(storedPlayers));
      }

      if (storedRounds) {
        setRounds(JSON.parse(storedRounds));
      }
    } catch (err) {
      console.error("Local storage restoration failed:", err);
    }
  }, []);

  // --- PERSIST ACTIVE STATE CHANGES ---
  useEffect(() => {
    if (players.length > 0) {
      localStorage.setItem('bray_active_players', JSON.stringify(players));
    } else {
      if (status === 'setup') {
        localStorage.removeItem('bray_active_players');
      }
    }
  }, [players, status]);

  useEffect(() => {
    localStorage.setItem('bray_active_rounds', JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem('bray_active_status', status);
  }, [status]);

  // --- ACTIONS ---
  const handleStartGame = (newPlayers: Player[]) => {
    setRounds([]);
    setStatus('playing');
    setActiveTab('table'); // Move view focus automatically to the active board

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

    setPlayers(canonicalPlayers);
    localStorage.setItem('bray_active_players', JSON.stringify(canonicalPlayers));

    // Update the permanent saved directory and history cache
    setSavedPlayers(prev => {
      const merged = [...prev];
      canonicalPlayers.forEach(cp => {
        const idx = merged.findIndex(item => item.id === cp.id);
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...cp };
        } else {
          merged.push(cp);
        }
      });
      localStorage.setItem('bray_saved_players_cache', JSON.stringify(merged));

      setHistory(currentHistory => {
        const nextHist = normalizeAndMergeHistory(currentHistory, merged);
        localStorage.setItem('bray_games_archive', JSON.stringify(nextHist));
        return nextHist;
      });

      return merged;
    });
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    setSavedPlayers(prev => {
      const exists = prev.some(p => p.id === updatedPlayer.id);
      const next = exists 
        ? prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
        : [...prev, updatedPlayer];
      localStorage.setItem('bray_saved_players_cache', JSON.stringify(next));
      return next;
    });
  };

  const handleAddClubPlayer = (p: Player) => {
    setSavedPlayers(prev => {
      const exists = prev.some(item => item.id.toLowerCase() === p.id.toLowerCase());
      if (exists) return prev;
      const next = [...prev, p];
      localStorage.setItem('bray_saved_players_cache', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteClubPlayer = (playerIdToRemove: string) => {
    setSavedPlayers(prev => {
      const next = prev.filter(p => p.id !== playerIdToRemove);
      localStorage.setItem('bray_saved_players_cache', JSON.stringify(next));
      return next;
    });
    // In case the player is currently sitting at the active setup table, clear active table setting
    setPlayers([]);
    setStatus('setup');
  };

  const handleSaveRound = (roundScores: Record<string, number>) => {
    if (editingRound) {
      setRounds(prev => prev.map(r => r.roundNumber === editingRound.roundNumber ? { ...r, scores: roundScores } : r));
      setEditingRound(null);
    } else {
      const nextNum = rounds.length + 1;
      const newRound: Round = {
        roundNumber: nextNum,
        scores: roundScores
      };
      setRounds(prev => [...prev, newRound]);
    }
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setIsRoundModalOpen(true);
  };

  const handleUndoLastRound = () => {
    if (rounds.length === 0) return;
    setRounds(prev => prev.slice(0, prev.length - 1));
  };

  const handleEndGameStatus = () => {
    if (rounds.length > 0 && players.length > 0) {
      // 1. Calculate final standings for automatic archive save
      const standings = players.map((player) => {
        const total = rounds.reduce((sum, r) => sum + (r.scores[player.id] || 0), 0);
        return { ...player, total };
      }).sort((a, b) => a.total - b.total);

      const winnerName = standings[0] ? standings[0].name : 'Unknown Player';

      // 2. Draft SavedGame object
      const newArchivedGame: SavedGame = {
        id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        players: [...players],
        rounds: [...rounds],
        date: new Date().toISOString(),
        winnerName
      };

      // 3. Append to history list
      setHistory(prev => {
        const next = [newArchivedGame, ...prev];
        localStorage.setItem('bray_games_archive', JSON.stringify(next));
        return next;
      });
    }

    setStatus('ended');
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('bray_games_archive');
  };

  const handleDeleteGame = (gameId: string) => {
    const next = history.filter((g) => g.id !== gameId);
    setHistory(next);
    localStorage.setItem('bray_games_archive', JSON.stringify(next));
  };

  const triggerResetPrompt = () => {
    setShowResetConfirm(true);
  };

  const confirmResetGame = () => {
    setPlayers([]);
    setRounds([]);
    setStatus('setup');
    setShowResetConfirm(false);
    localStorage.removeItem('bray_active_players');
    localStorage.removeItem('bray_active_rounds');
    localStorage.removeItem('bray_active_status');
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
        
        <div className="flex items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-6 border-t sm:border-t-0 border-editorial-border/40 pt-4 sm:pt-0">
          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-widest text-editorial-muted mb-0.5 font-bold">Active Table</div>
            <div className="text-lg font-mono font-bold text-editorial-text" id="activeStatusDisplay">
              {status === 'setup' ? 'REGISTRATION' : `ROUND ${String(rounds.length + 1).padStart(2, '0')}`}
            </div>
          </div>

          {status !== 'setup' && (
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
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-editorial-gold block">
                      Live Tournament Status
                    </span>
                    <h4 className="text-lg font-bold uppercase tracking-tight text-white">
                      Rounds logged: {rounds.length}
                    </h4>
                    <p className="text-xs text-[#8e8271] max-w-md">
                      Individual Bray scoring rules enforced. Tap record to calculate tally for Round {rounds.length + 1}.
                    </p>
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
              />

              {/* Round History Grid Ledger */}
              <HistoryTable
                players={players}
                rounds={rounds}
                onUndoLastRound={handleUndoLastRound}
                onEditRound={handleEditRound}
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
