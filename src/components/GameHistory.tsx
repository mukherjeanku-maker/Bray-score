import React, { useState } from 'react';
import { SavedGame, Player, Round } from '../types';
import { Search, Calendar, ChevronDown, ChevronUp, Trophy, ArrowRight, Trash2, X, Archive, Club, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ShareCardModal } from './ShareCardModal';

interface GameHistoryProps {
  games: SavedGame[];
  onClearHistory: () => void;
  onDeleteGame: (gameId: string) => void;
  isAdmin?: boolean;
  onUpdateCompletedGame?: (updatedGame: SavedGame) => void;
}

export function GameHistory({ games, onClearHistory, onDeleteGame, isAdmin = false, onUpdateCompletedGame }: GameHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sharedGame, setSharedGame] = useState<SavedGame | null>(null);

  // Admin Editing states for completed matches
  const [editingGame, setEditingGame] = useState<SavedGame | null>(null);
  const [showModifyConfirm, setShowModifyConfirm] = useState(false);
  const [gameToDeleteId, setGameToDeleteId] = useState<string | null>(null);

  const handleStartEditGame = (game: SavedGame) => {
    setEditingGame(JSON.parse(JSON.stringify(game)));
  };

  const handleScoreChange = (roundIndex: number, playerId: string, value: number) => {
    if (!editingGame) return;
    const nextRounds = [...editingGame.rounds];
    nextRounds[roundIndex] = {
      ...nextRounds[roundIndex],
      scores: {
        ...nextRounds[roundIndex].scores,
        [playerId]: value
      }
    };
    setEditingGame({
      ...editingGame,
      rounds: nextRounds
    });
  };

  const handleDeleteRoundInEdit = (roundIndex: number) => {
    if (!editingGame) return;
    let nextRounds = editingGame.rounds.filter((_, idx) => idx !== roundIndex);
    nextRounds = nextRounds.map((r, idx) => ({
      ...r,
      roundNumber: idx + 1
    }));
    setEditingGame({
      ...editingGame,
      rounds: nextRounds
    });
  };

  const handleAddRoundInEdit = () => {
    if (!editingGame) return;
    const newRoundNumber = editingGame.rounds.length + 1;
    const initialScores: Record<string, number> = {};
    editingGame.players.forEach((p) => {
      initialScores[p.id] = 0;
    });
    const newRound: Round = {
      roundNumber: newRoundNumber,
      scores: initialScores
    };
    setEditingGame({
      ...editingGame,
      rounds: [...editingGame.rounds, newRound]
    });
  };

  const handleSaveEditGame = () => {
    setShowModifyConfirm(true);
  };

  const handleConfirmSaveEditGame = () => {
    if (editingGame && onUpdateCompletedGame) {
      onUpdateCompletedGame(editingGame);
    }
    setEditingGame(null);
    setShowModifyConfirm(false);
  };

  // Group games by date (e.g. "Thursday, Jun 18, 2026")
  const formatDateGroup = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Unknown Date";
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return "";
    }
  };

  // Filter games based on search and date picker
  const filteredGames = games.filter((game) => {
    // Check search term against player names or winner name
    const matchSearch = searchTerm
      ? game.players.some((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        game.winnerName.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    // Check date against date picker
    let matchDate = true;
    if (selectedDate) {
      try {
        const gameDate = new Date(game.date).toISOString().split('T')[0];
        matchDate = gameDate === selectedDate;
      } catch {
        matchDate = false;
      }
    }

    return matchSearch && matchDate;
  });

  // Calculate total score for each player in a saved game
  const getPlayerTotals = (game: SavedGame) => {
    return game.players.map((p) => {
      const total = game.rounds.reduce((sum, r) => sum + (r.scores[p.id] || 0), 0);
      return { ...p, total };
    }).sort((a, b) => a.total - b.total);
  };

  // Group filtered games by date string
  const groupedGames: Record<string, SavedGame[]> = {};
  filteredGames.forEach((game) => {
    const key = formatDateGroup(game.date);
    if (!groupedGames[key]) {
      groupedGames[key] = [];
    }
    groupedGames[key].push(game);
  });

  const toggleExpand = (gameId: string) => {
    setExpandedGameId(expandedGameId === gameId ? null : gameId);
  };

  return (
    <div className="space-y-6" id="history-section">
      {/* Search / Filter bar */}
      <div className="bg-editorial-dark border border-editorial-border p-6 space-y-4" id="history-filters-box">
        <div className="flex justify-between items-center">
          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-editorial-gold flex items-center gap-1.5">
            <Archive className="w-4 h-4" /> Match Archive Search
          </h3>
          {isAdmin && games.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer font-mono"
            >
              <Trash2 className="w-3 h-3" /> Clear Database
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-editorial-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Player Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-editorial-border focus:border-editorial-gold text-sm rounded-none pl-10 pr-4 py-3 outline-none transition-colors text-white font-medium placeholder-editorial-muted/50"
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-editorial-muted">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-editorial-border focus:border-editorial-gold text-sm rounded-none pl-10 pr-4 py-3 outline-none transition-colors text-white font-mono cursor-pointer placeholder-editorial-muted/50"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-editorial-gold hover:text-white cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Display */}
      {games.length === 0 ? (
        <div className="bg-editorial-dark border border-editorial-border p-12 text-center text-editorial-muted" id="no-archive-data">
          <Club className="w-8 h-8 text-[#2a2620] mx-auto mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest text-slate-300">No Archives Discovered</p>
          <p className="text-[10px] uppercase font-mono tracking-wider mt-1.5">Completed games will appear here with permanent status records.</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-editorial-dark border border-editorial-border p-12 text-center text-editorial-muted" id="no-filter-match">
          <p className="text-sm font-bold uppercase tracking-widest text-[#e0d6c5]">No Matching Sessions</p>
          <p className="text-[10px] uppercase font-mono mt-1">Refine your search term or select another date.</p>
        </div>
      ) : (
        <div className="space-y-8" id="archive-grouped-list">
          {Object.entries(groupedGames).map(([dateKey, sessionList]) => (
            <div key={dateKey} className="space-y-4">
              {/* Group Date Header */}
              <div className="flex items-center gap-4">
                <h4 className="text-xs uppercase tracking-[0.25em] font-black text-editorial-gold bg-[#1d1a15] px-3 py-1.5 border border-editorial-gold/25 font-mono">
                  {dateKey}
                </h4>
                <div className="h-px flex-1 bg-editorial-border/60"></div>
                <span className="text-[10px] font-mono text-editorial-muted tracking-wider uppercase font-bold">
                  {sessionList.length} {sessionList.length === 1 ? "Session" : "Sessions"}
                </span>
              </div>

              {/* Session cards */}
              <div className="space-y-3">
                {sessionList.map((game) => {
                  const isExpanded = expandedGameId === game.id;
                  const standings = getPlayerTotals(game);
                  const winner = standings[0];

                  return (
                    <div
                      key={game.id}
                      className="bg-editorial-dark border border-editorial-border transition-all duration-300"
                    >
                      {/* Session Summary Bar */}
                      <div
                        onClick={() => toggleExpand(game.id)}
                        className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-[#111111]/85 transition-colors select-none"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-editorial-gold uppercase bg-[#1d1a15] border border-editorial-gold/20 px-1.5 py-0.5">
                              {formatTime(game.date)}
                            </span>
                            <span className="text-xs font-mono text-editorial-muted font-bold">
                              ID: {game.id.split('-')[2] || 'Bray'}
                            </span>
                          </div>
                          <div className="text-md font-bold uppercase tracking-tight text-white flex items-center gap-1.5 flex-wrap">
                            {game.players.map((p, idx) => (
                              <React.Fragment key={p.id}>
                                <span className={p.name === game.winnerName ? 'text-editorial-gold font-black' : 'text-slate-300 font-medium'}>
                                  {p.name}
                                </span>
                                {idx < game.players.length - 1 && <span className="text-editorial-border">•</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-start border-t sm:border-t-0 border-editorial-border/30 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] uppercase tracking-widest text-editorial-muted font-bold block">Champion</span>
                            <span className="text-sm font-black uppercase text-editorial-gold flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5 fill-current" /> {game.winnerName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-editorial-gold">
                            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">
                              {isExpanded ? "Collapse" : "Breakdown"}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Detail Breakdown Accordion */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-editorial-border bg-[#090909]"
                          >
                            <div className="p-6 space-y-6">
                              {/* Fast Standings Standout */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {standings.map((player, sIdx) => (
                                  <div key={player.id} className="bg-[#111111] border border-editorial-border p-4 space-y-1 relative">
                                    <span className="absolute top-2 right-3 text-xs font-mono font-bold text-[#2a2620]">
                                      0{sIdx + 1}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-widest text-[#8e8271] font-bold block">
                                      {sIdx === 0 ? "Champion" : `Seat Rank 0${sIdx + 1}`}
                                    </span>
                                    <span className="text-sm font-black uppercase text-white truncate block">
                                      {player.name}
                                    </span>
                                    <span className="text-lg font-black font-mono text-editorial-gold block pt-1">
                                      {player.total} <span className="text-[9px] uppercase tracking-widest text-[#8e8271] font-medium font-mono">pts</span>
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Round-by-Round Breakdown Ledger */}
                              <div className="space-y-3">
                                <h5 className="text-[10px] uppercase tracking-widest font-black text-[#8e8271] font-mono">
                                  Official Table Transcript
                                </h5>

                                <div className="border border-editorial-border/60 overflow-x-auto">
                                  <table className="w-full text-left font-mono text-xs">
                                    <thead>
                                      <tr className="bg-[#0b0b0b] text-[#8e8271] border-b border-editorial-border/70">
                                        <th className="p-3 text-center w-14 font-bold border-r border-editorial-border/70">Rd</th>
                                        {game.players.map((p) => (
                                          <th key={p.id} className="p-3 text-center border-l border-editorial-border/70">
                                            <span className="truncate max-w-20 inline-block font-sans lowercase font-semibold uppercase">{p.name}</span>
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-editorial-border/40">
                                      {game.rounds.map((round) => (
                                        <tr key={round.roundNumber} className="hover:bg-black/20">
                                          <td className="p-2 text-center font-black text-editorial-gold bg-[#0b0b0b]/30 border-r border-editorial-border/70">
                                            {String(round.roundNumber).padStart(2, '0')}
                                          </td>
                                          {game.players.map((player) => {
                                            const points = round.scores[player.id] || 0;
                                            return (
                                              <td key={player.id} className={`p-2 text-center border-l border-editorial-border/40 font-bold ${
                                                points > 0
                                                  ? 'text-emerald-400'
                                                  : points < 0
                                                  ? 'text-red-400'
                                                  : 'text-editorial-muted'
                                              }`}>
                                                {points > 0 ? `+${points}` : points === 0 ? '0' : points}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Action Buttons: Sharing + Admin Operations */}
                              <div className="flex flex-wrap justify-between items-center gap-3 pt-3 mt-1 border-t border-editorial-border/30">
                                <div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSharedGame(game);
                                    }}
                                    className="text-[9px] uppercase tracking-wider font-mono font-bold text-editorial-gold hover:text-black hover:bg-editorial-gold transition-all duration-200 border border-editorial-gold/45 bg-[#12110e] px-3.5 py-1.5 rounded-none flex items-center gap-1.5 cursor-pointer"
                                    id={`share-archived-btn-${game.id}`}
                                  >
                                    <Share2 className="w-3 h-3" />
                                    <span>Share Result Card</span>
                                  </button>
                                </div>

                                {isAdmin && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditGame(game);
                                      }}
                                      className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-300 hover:text-white transition-colors bg-[#1c1914]/80 hover:bg-[#12110e] border border-editorial-border/60 hover:border-editorial-gold/40 px-3 py-1.5 rounded-none flex items-center gap-1 cursor-pointer"
                                    >
                                      ✏️ Correct Entries
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setGameToDeleteId(game.id);
                                      }}
                                      className="text-[9px] uppercase tracking-wider font-mono font-bold text-red-500 hover:text-red-400 transition-colors bg-red-950/10 active:bg-red-950/30 border border-red-900/30 hover:border-red-500/30 px-3 py-1.5 rounded-none flex items-center gap-1 cursor-pointer"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Database Clear confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-red-900/60 p-8 max-w-sm w-full space-y-4 relative"
              id="clear-confirm-modal"
            >
              <div className="flex flex-col gap-1 text-red-400">
                <span className="text-[10px] tracking-[0.25em] font-black uppercase text-red-500 font-mono">DANGEROUS ACTION</span>
                <h4 className="text-xl font-black uppercase text-white">
                  Wipe Out Database?
                </h4>
              </div>

              <p className="text-xs text-editorial-muted leading-relaxed font-sans">
                This will permanently delete all historic daily match files from local device memory. Make sure other Agnibina Sangha club members are in consensus.
              </p>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-transparent border border-editorial-border hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] text-editorial-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearHistory();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-2.5 bg-red-950/30 hover:bg-red-900 text-red-300 hover:text-white border border-red-900 font-bold uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
                >
                  Confirm Clear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game Deletion confirmation Modal */}
      <AnimatePresence>
        {gameToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-red-900/60 p-8 max-w-sm w-full space-y-4 relative"
              id="game-delete-confirm-modal"
            >
              <div className="flex flex-col gap-1 text-red-400">
                <span className="text-[10px] tracking-[0.25em] font-black uppercase text-red-500 font-mono">DANGEROUS ACTION</span>
                <h4 className="text-xl font-black uppercase text-white">
                  Delete Match Record?
                </h4>
              </div>

              <div className="text-xs text-red-300 font-mono leading-relaxed bg-[#1c0d0a]/30 border border-red-900/40 p-4">
                This will permanently delete all game history. Continue?
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setGameToDeleteId(null)}
                  className="flex-1 py-2.5 bg-transparent border border-editorial-border hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] text-editorial-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (gameToDeleteId) {
                      onDeleteGame(gameToDeleteId);
                    }
                    setGameToDeleteId(null);
                  }}
                  className="flex-1 py-2.5 bg-red-950/30 hover:bg-red-900 text-red-300 hover:text-white border border-red-900 font-bold uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
                  id="game-delete-confirm-btn"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game Corrective/Editing Modal */}
      <AnimatePresence>
        {editingGame && (
          <div className="fixed inset-0 z-[40] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-editorial-border p-6 max-w-2xl w-full space-y-6 relative my-8"
              id="game-edit-modal"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] tracking-[0.25em] font-black uppercase text-editorial-gold font-mono block">ADMIN CORRECTIVE DISCIPLINE</span>
                  <h4 className="text-2xl font-black uppercase text-white">
                    Correct Ledger Entries
                  </h4>
                  <p className="text-xs text-editorial-muted">Editing completed match record: <span className="font-mono text-editorial-gold">Session ID {editingGame.id.split('-')[2] || 'Bray'}</span></p>
                </div>
                <button 
                  onClick={() => setEditingGame(null)} 
                  className="text-editorial-muted hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Editing Score Matrix */}
              <div className="border border-editorial-border/60 overflow-hidden bg-[#0a0a0a]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="bg-[#0f0e0c] text-editorial-gold border-b border-editorial-border">
                        <th className="p-3 text-center w-14 font-bold border-r border-editorial-border/60">Rd</th>
                        {editingGame.players.map((p) => (
                          <th key={p.id} className="p-3 text-center border-l border-editorial-border/40 font-sans uppercase font-bold text-slate-300">
                            {p.name}
                          </th>
                        ))}
                        <th className="p-3 text-center w-16">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-editorial-border/30">
                      {editingGame.rounds.map((round, rIndex) => (
                        <tr key={round.roundNumber} className="hover:bg-white/5">
                          <td className="p-2 text-center font-black text-editorial-gold bg-[#0f0e0c]/30 border-r border-editorial-border/60">
                            {String(round.roundNumber).padStart(2, '0')}
                          </td>
                          {editingGame.players.map((p) => (
                            <td key={p.id} className="p-2 border-l border-editorial-border/30 text-center">
                              <input
                                type="number"
                                value={round.scores[p.id] !== undefined ? round.scores[p.id] : 0}
                                onChange={(e) => handleScoreChange(rIndex, p.id, Number(e.target.value))}
                                className="w-16 bg-black border border-editorial-border text-center text-xs text-white p-1 rounded-none outline-none font-mono focus:border-editorial-gold"
                              />
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleDeleteRoundInEdit(rIndex)}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title="Delete Round Row"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-[#0d0d0d] border-t border-editorial-border/40 flex justify-between">
                  <button
                    onClick={handleAddRoundInEdit}
                    className="text-[10px] uppercase font-mono font-bold text-editorial-gold hover:text-white transition-colors"
                  >
                    + Add New Round Row
                  </button>
                  <span className="text-[9px] uppercase font-mono text-editorial-muted self-center">
                    {editingGame.rounds.length} Rounds Compiled
                  </span>
                </div>
              </div>

              {/* Save/Cancel Controls */}
              <div className="flex gap-4 justify-end border-t border-editorial-border/40 pt-4">
                <button
                  onClick={() => setEditingGame(null)}
                  className="px-5 py-2.5 bg-transparent border border-editorial-border hover:bg-white/5 text-xs text-editorial-muted font-bold uppercase tracking-widest rounded-none transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveEditGame}
                  className="px-6 py-2.5 bg-editorial-gold hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-none transition-colors"
                >
                  Save Corrections
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation of modified completed game */}
      <AnimatePresence>
        {showModifyConfirm && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-editorial-gold/40 p-8 max-w-sm w-full space-y-4 relative"
              id="modify-confirm-modal"
            >
              <div className="flex flex-col gap-1 text-editorial-gold">
                <span className="text-[10px] tracking-[0.25em] font-black uppercase font-mono">CONFIDENTIAL REVISION</span>
                <h4 className="text-xl font-black uppercase text-white">
                  Confirm Corrections?
                </h4>
              </div>

              <div className="text-xs text-editorial-gold font-mono leading-relaxed bg-[#1b1712] border border-editorial-gold/30 p-4">
                This will modify completed match data. Continue?
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowModifyConfirm(false)}
                  className="flex-1 py-2.5 bg-transparent border border-editorial-border hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] text-editorial-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSaveEditGame}
                  className="flex-1 py-2.5 bg-editorial-gold hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
                  id="modify-confirm-btn"
                >
                  Yes, Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ShareCardModal
        isOpen={sharedGame !== null}
        onClose={() => setSharedGame(null)}
        players={sharedGame?.players || []}
        rounds={sharedGame?.rounds || []}
        dateString={sharedGame ? formatDateGroup(sharedGame.date) : undefined}
      />
    </div>
  );
}
