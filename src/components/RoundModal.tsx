import React, { useState, useEffect } from 'react';
import { Player, Round } from '../types';
import { Plus, Minus, X, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerAvatar } from './PlayerAvatar';

interface RoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  roundNumber: number;
  onSaveRound: (scores: Record<string, number>) => void;
  initialScores?: Record<string, number>;
  rounds?: Round[];
}

export function RoundModal({ isOpen, onClose, players, roundNumber, onSaveRound, initialScores, rounds = [] }: RoundModalProps) {
  // Initialize scores for this round
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialScores) {
        setScores({ ...initialScores });
      } else {
        const initialScr: Record<string, number> = {};
        players.forEach(p => {
          initialScr[p.id] = 0;
        });
        setScores(initialScr);
      }
    }
  }, [isOpen, players, initialScores]);

  if (!isOpen) return null;

  const getPriorCumulativeScore = (playerId: string) => {
    return rounds
      .filter(r => r.roundNumber < roundNumber)
      .reduce((sum, r) => sum + (r.scores[playerId] || 0), 0);
  };

  const handleScoreChange = (playerId: string, val: number) => {
    setScores(prev => ({
      ...prev,
      [playerId]: isNaN(val) ? 0 : val
    }));
  };

  const adjustScore = (playerId: string, amount: number) => {
    setScores(prev => {
      const current = prev[playerId] || 0;
      return {
        ...prev,
        [playerId]: current + amount
      };
    });
  };

  const toggleSign = (playerId: string) => {
    setScores(prev => {
      const current = prev[playerId] || 0;
      return {
        ...prev,
        [playerId]: current * -1
      };
    });
  };

  const handleSave = () => {
    onSaveRound(scores);
    onClose();
  };

  const clearAllZero = () => {
    const cleared: Record<string, number> = {};
    players.forEach(p => {
      cleared[p.id] = 0;
    });
    setScores(cleared);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-editorial-dark border border-editorial-border rounded-none shadow-2xl relative overflow-hidden my-auto"
        id="round-modal"
      >
        {/* Top Gold Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-editorial-gold" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-editorial-border bg-[#0d0d0d]">
          <div>
            <h3 className="text-xl font-bold text-editorial-gold uppercase tracking-wider font-display" id="modal-round-title">
              Record Round {roundNumber}
            </h3>
            <p className="text-editorial-muted text-xs uppercase tracking-widest font-mono mt-1">Provide Bray points for each seat</p>
          </div>
          <button
            onClick={onClose}
            className="text-editorial-muted hover:text-white p-1 hover:bg-editorial-border/30 rounded-none transition-colors cursor-pointer"
            id="close-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto" id="modal-form-body">
          {players.map((player) => {
            const currentVal = scores[player.id] || 0;
            return (
              <div
                key={player.id}
                className="bg-[#0b0b0b] border border-editorial-border p-4 space-y-3 hover:border-editorial-gold/30 transition-colors rounded-none"
                id={`player-row-${player.id}`}
              >
                {/* Player details & sign flipper */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <PlayerAvatar
                      name={player.name}
                      avatarUrl={player.avatarUrl}
                      size="w-9 h-9"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm sm:text-base font-bold text-white uppercase tracking-tight truncate">
                        {player.name}
                      </span>
                      <span className="text-[10px] font-mono text-editorial-gold uppercase tracking-wider flex items-center gap-1">
                        <span>Current Score:</span>
                        <strong className="font-bold text-slate-100">{getPriorCumulativeScore(player.id)} pts</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Sign Changer */}
                    <button
                      type="button"
                      onClick={() => toggleSign(player.id)}
                      className="text-[10px] uppercase font-bold px-3 py-2 bg-transparent border border-editorial-border hover:border-editorial-gold text-editorial-muted hover:text-white rounded-none transition-colors cursor-pointer font-mono"
                      title="Toggle positive/negative"
                    >
                      +/– Sign
                    </button>

                    {/* Numeric Keyboard input wrapper */}
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        pattern="[0-9]*"
                        id={`input-score-${player.id}`}
                        value={currentVal || ''}
                        onChange={(e) => handleScoreChange(player.id, parseInt(e.target.value, 10))}
                        placeholder="0"
                        className="w-24 text-center bg-transparent border border-editorial-border text-editorial-gold font-bold font-mono text-lg rounded-none focus:outline-none focus:border-editorial-gold focus:ring-0 py-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Incrementor matrix designed for older club members */}
                <div className="grid grid-cols-6 gap-1.5 pt-2 border-t border-editorial-border/40">
                  <button
                    type="button"
                    onClick={() => adjustScore(player.id, -10)}
                    className="py-2 text-[11px] font-mono font-bold bg-[#1d1414] hover:bg-[#2e1d1d] border border-red-950/40 text-red-400 rounded-none transition-colors cursor-pointer"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScore(player.id, -5)}
                    className="py-2 text-[11px] font-mono font-bold bg-[#1d1414] hover:bg-[#2e1d1d] border border-red-950/40 text-red-400 rounded-none transition-colors cursor-pointer"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScore(player.id, -1)}
                    className="py-2 text-[11px] font-mono font-bold bg-[#1d1414] hover:bg-[#2e1d1d] border border-red-950/40 text-red-400 rounded-none transition-colors cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScore(player.id, 1)}
                    className="py-2 text-[11px] font-mono font-bold bg-[#141d17] hover:bg-[#1d2e22] border border-emerald-950/40 text-emerald-400 rounded-none transition-colors cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScore(player.id, 5)}
                    className="py-2 text-[11px] font-mono font-bold bg-[#141d17] hover:bg-[#1d2e22] border border-emerald-950/40 text-emerald-400 rounded-none transition-colors cursor-pointer"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustScore(player.id, 10)}
                    className="py-2 text-[11px] font-mono font-bold bg-[#141d17] hover:bg-[#1d2e22] border border-emerald-950/40 text-emerald-400 rounded-none transition-colors cursor-pointer"
                  >
                    +10
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer controls with high-contrast square buttons */}
        <div className="p-6 border-t border-editorial-border bg-[#0d0d0d] flex gap-4">
          <button
            type="button"
            onClick={clearAllZero}
            className="flex-1 bg-transparent hover:bg-red-950/40 border border-editorial-border text-red-400 hover:text-red-300 font-bold uppercase tracking-widest py-3 text-xs rounded-none transition-colors flex items-center justify-center gap-2 cursor-pointer"
            id="clear-round-btn"
          >
            Reset input
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-editorial-gold hover:bg-amber-400 text-black font-black uppercase tracking-widest py-3 text-xs rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            id="save-round-btn"
          >
            Apply Scores
          </button>
        </div>
      </motion.div>
    </div>
  );
}
