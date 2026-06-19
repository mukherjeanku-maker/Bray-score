import React, { useState } from 'react';
import { Player } from '../types';
import { Users, Search, Check, AlertTriangle, UserCheck, ArrowRight, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerAvatar } from './PlayerAvatar';

interface PlayerSetupProps {
  onStartGame: (players: Player[]) => void;
  savedPlayers: Player[];
  onNavigateToMembers: () => void;
}

export function PlayerSetup({ onStartGame, savedPlayers = [], onNavigateToMembers }: PlayerSetupProps) {
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Selected player IDs (exactly 4 needed)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Toggle selection
  const handleTogglePlayer = (player: Player) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(player.id);
      if (isSelected) {
        return prev.filter(id => id !== player.id);
      } else {
        if (prev.length >= 4) {
          alert("A standard Bray game requires exactly 4 players. Please deselect a player to free up a seat first.");
          return prev;
        }
        return [...prev, player.id];
      }
    });
  };

  // Reorder positions / seats
  const handleShiftSeat = (index: number) => {
    if (selectedIds.length < 2) return;
    setSelectedIds(prev => {
      const next = [...prev];
      const target = next[index];
      const nextIndex = (index + 1) % next.length;
      next[index] = next[nextIndex];
      next[nextIndex] = target;
      return next;
    });
  };

  // Handle Start game trigger
  const handleLaunchGame = () => {
    if (selectedIds.length !== 4) return;
    
    // Map selected IDs to Player objects in sequence
    const selectedPlayers = selectedIds.map(id => {
      const p = savedPlayers.find(sp => sp.id === id);
      return p!;
    });

    onStartGame(selectedPlayers);
  };

  // Filtered club members
  const filteredPlayers = savedPlayers.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const oName = (p.officialName || p.name || '').toLowerCase();
    const nick = (p.nickname || '').toLowerCase();
    const idStr = p.id.toLowerCase();

    return oName.includes(q) || nick.includes(q) || idStr.includes(q);
  });

  // Derived 4 players representing current seats
  const seatedPlayers = selectedIds.map(id => savedPlayers.find(sp => sp.id === id)).filter(Boolean) as Player[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto bg-editorial-dark border border-editorial-border p-6 sm:p-8 shadow-2xl relative"
      id="setup-card"
    >
      {/* Editorial top gold border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-editorial-gold" />

      <h2 className="text-2xl font-black uppercase tracking-tight text-center text-white mb-1 flex flex-col items-center justify-center" id="setup-title">
        <span className="text-editorial-gold text-xs font-mono font-bold uppercase tracking-[0.25em]">Agnibina Sangha</span>
        <span className="text-[10px] text-editorial-muted font-bold tracking-[0.3em] uppercase mt-1">Established: 1947</span>
      </h2>
      <p className="text-editorial-muted text-[10px] tracking-wider uppercase text-center mb-6 font-mono pt-2 border-t border-editorial-border/30 w-full mt-2">
        Bray Card Table Creation Flow
      </p>

      {/* Warning if fewer than 4 players exist in the entire registry */}
      {savedPlayers.length < 4 ? (
        <div className="bg-[#1c0d0a]/30 border border-red-900/35 p-6 space-y-4 text-center rounded-none" id="not-enough-members-alert">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase text-white font-mono tracking-wider">Club Directory Insufficient</h4>
            <p className="text-xs text-editorial-muted max-w-md mx-auto leading-relaxed">
              Bray requires exactly <strong className="text-white">4 registered players</strong> to start a tournament table. Your current clubhouse directory has only <strong className="text-white">{savedPlayers.length} member(s)</strong> saved.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToMembers}
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-editorial-gold hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
            id="redirect-to-members-btn"
          >
            Go to Club Members Registry <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Step 1: Select Players from grid */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-300 font-mono flex items-center gap-1.5">
                <span className="text-editorial-gold font-bold">STEP 01</span>
                <span>Select exactly 4 Table Players</span>
              </label>
              <span className="text-[10px] font-mono uppercase bg-[#1d1a15] rounded-none border border-editorial-gold/20 px-2 py-0.5 text-editorial-gold font-bold">
                {selectedIds.length} / 4 Selected
              </span>
            </div>

            {/* Search filter for game setup */}
            <div className="bg-[#0e0e0e] border border-editorial-border p-3 flex gap-2 items-center">
              <Search className="w-3.5 h-3.5 text-editorial-muted shrink-0" />
              <input
                type="text"
                placeholder="Search players by Name, Nickname or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white outline-none placeholder-editorial-muted/60"
                id="setup-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-editorial-muted hover:text-white font-mono cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Scrollable grid of directory players */}
            <div className="max-h-[220px] overflow-y-auto border border-editorial-border bg-[#070707]/60 p-3 space-y-2 select-none" id="setup-members-scroll">
              {filteredPlayers.length === 0 ? (
                <p className="text-center py-8 text-xs text-editorial-muted font-mono uppercase tracking-wider">No matching club members</p>
              ) : (
                filteredPlayers.map(p => {
                  const isChecked = selectedIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleTogglePlayer(p)}
                      className={`flex items-center justify-between p-2.5 border transition-all cursor-pointer ${
                        isChecked 
                          ? 'border-editorial-gold bg-[#1d1a15]/50' 
                          : 'border-editorial-border/60 bg-[#0c0c0b]/45 hover:border-editorial-border/90'
                      }`}
                      id={`choose-row-${p.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar name={p.name} avatarUrl={p.avatarUrl} size="w-8 h-8" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white uppercase truncate">{p.officialName}</span>
                            {p.nickname && <span className="text-[8px] text-editorial-gold bg-[#12110e] border border-editorial-gold/10 px-1 leading-none font-mono">"{p.nickname}"</span>}
                          </div>
                          <span className="text-[8px] font-mono text-editorial-muted uppercase block tracking-wider mt-0.5">ID: {p.id}</span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-none border flex items-center justify-center shrink-0 ${
                        isChecked 
                          ? 'bg-editorial-gold border-editorial-gold text-black' 
                          : 'border-editorial-border bg-[#050505]'
                      }`}>
                        {isChecked && <Check className="w-3  h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Allocated Seats */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest font-bold text-slate-300 font-mono flex items-center gap-1.5 pb-1 border-b border-editorial-border/40">
              <span className="text-editorial-gold font-bold">STEP 02</span>
              <span>Seat Order Arrangement</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="active-seats-grid">
              {[0, 1, 2, 3].map(index => {
                const player = seatedPlayers[index];

                return (
                  <div
                    key={index}
                    className={`p-3.5 border transition-all relative flex items-center justify-between gap-3 ${
                      player 
                        ? 'border-editorial-gold/40 bg-[#14120f]/30' 
                        : 'border-dashed border-editorial-border bg-[#080808]/20'
                    }`}
                    id={`setup-seat-${index}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-[#8e8271] absolute top-1 left-2 select-none">
                        Seat 0{index + 1}
                      </div>
                      
                      {player ? (
                        <div className="flex items-center gap-3 min-w-0 mt-3.5">
                          <PlayerAvatar name={player.name} avatarUrl={player.avatarUrl} size="w-9 h-9" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white uppercase truncate block">
                              {player.officialName}
                            </span>
                            <span className="text-[8px] font-mono text-editorial-muted uppercase tracking-wider block">
                              ID: {player.id}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-left py-4 mt-1">
                          <span className="text-[9.5px] uppercase font-mono font-medium text-editorial-muted/40 tracking-wider">
                            Select a clubhouse member above
                          </span>
                        </div>
                      )}
                    </div>

                    {player && selectedIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleShiftSeat(index)}
                        className="text-[8px] font-mono uppercase px-2 py-1 bg-transparent hover:bg-editorial-gold hover:text-black border border-editorial-border hover:border-editorial-gold text-editorial-muted transition-all cursor-pointer self-end mb-1"
                        title="Shift player seat order index forward"
                        id={`shift-btn-${index}`}
                      >
                        Shift Pos
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleLaunchGame}
            disabled={selectedIds.length !== 4}
            className="w-full py-4.5 bg-editorial-gold text-black hover:bg-amber-400 disabled:opacity-35 font-black uppercase tracking-[0.2em] text-[11px] leading-none transition-all duration-250 cursor-pointer disabled:cursor-not-allowed text-center flex items-center justify-center gap-2"
            id="start-bray-game-main-btn"
          >
            ⚜️ Start Game with Selected Table (4 Players)
          </button>
        </div>
      )}

      {/* Decorative rules note banner */}
      <div className="mt-6 border-t border-editorial-border/30 pt-4 flex justify-between items-center text-[10px] font-mono text-editorial-muted uppercase tracking-widest">
        <span>Agnibina Sangha Rules</span>
        <span>Low Score Wins • 4 Players Only</span>
      </div>

    </motion.div>
  );
}
