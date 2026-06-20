import React from 'react';
import { Player, Round } from '../types';
import { RotateCcw, AlertTriangle, HelpCircle } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';

interface HistoryTableProps {
  players: Player[];
  rounds: Round[];
  onUndoLastRound: () => void;
  onEditRound?: (round: Round) => void;
  isAdmin?: boolean;
  status?: 'setup' | 'playing' | 'ended';
}

export function HistoryTable({ players, rounds, onUndoLastRound, onEditRound, isAdmin = false, status = 'playing' }: HistoryTableProps) {
  const isEditAllowed = status === 'playing' || (status === 'ended' && isAdmin);

  if (rounds.length === 0) {
    return (
      <div className="bg-editorial-dark border border-editorial-border rounded-none p-10 text-center text-editorial-muted" id="empty-history">
        <p className="text-sm font-bold uppercase tracking-widest text-[#e0d6c5] mb-2">No Rounds Logged</p>
        <p className="text-[10px] uppercase tracking-wider font-mono">Open the session &amp; record score above to assemble ledger data.</p>
      </div>
    );
  }

  // Calculate run total up to a specific round for each player
  const getRunningTotalUpTo = (roundIndex: number, playerId: string) => {
    let total = 0;
    for (let i = 0; i <= roundIndex; i++) {
      total += rounds[i].scores[playerId] || 0;
    }
    return total;
  };

  return (
    <div className="bg-editorial-dark border border-editorial-border rounded-none p-6 shadow-xl space-y-6" id="history-box">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-editorial-gold">
          Match History & Ledger
        </h3>

        {/* Undo Button */}
        {isEditAllowed && (
          <button
            onClick={onUndoLastRound}
            className="text-[10px] uppercase font-bold bg-transparent hover:bg-red-950/20 hover:text-red-300 border border-editorial-border hover:border-red-900/60 text-editorial-muted px-4 py-2 rounded-none transition-colors flex items-center gap-2 cursor-pointer font-mono"
            title="Delete the most recently added round scores"
            id="undo-last-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo Last Round
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-none border border-editorial-border" id="table-scroll-wrapper">
        <table className="w-full text-left border-collapse" id="history-table">
          <thead>
            <tr className="bg-[#0d0d0d] text-editorial-muted text-[11px] uppercase tracking-wider font-bold border-b border-editorial-border">
              <th className="p-4 text-center w-16 font-mono">Rd</th>
              {players.map((player) => (
                <th key={player.id} className="p-3 text-center border-l border-editorial-border">
                  <div className="flex flex-col items-center gap-1.5 justify-center">
                    <PlayerAvatar
                      name={player.name}
                      avatarUrl={player.avatarUrl}
                      size="w-8 h-8"
                    />
                    <div className="truncate max-w-28 font-semibold text-center text-xs text-white" title={player.name}>
                      {player.name}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-editorial-border/40 font-mono text-xs text-editorial-text">
            {rounds.map((round, rIdx) => (
              <tr key={round.roundNumber} className="hover:bg-[#0d0d0d]/40 transition-colors">
                <td className="p-3 text-center bg-[#0d0d0d]/30 border-r border-editorial-border/40">
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-black text-editorial-gold text-sm">
                      {String(round.roundNumber).padStart(2, '0')}
                    </span>
                    {onEditRound && isEditAllowed && (
                      <button
                        onClick={() => onEditRound(round)}
                        className="text-[9px] uppercase tracking-widest font-mono font-bold text-editorial-gold hover:text-white mt-1 cursor-pointer hover:underline"
                        id={`edit-rd-${round.roundNumber}-btn`}
                      >
                        [Edit]
                      </button>
                    )}
                  </div>
                </td>
                {players.map((player) => {
                  const val = round.scores[player.id] || 0;
                  const runningTotal = getRunningTotalUpTo(rIdx, player.id);

                  return (
                    <td key={player.id} className="p-4 text-center border-l border-editorial-border/40">
                      <div className="space-y-1">
                        <span
                          className={`font-black tracking-tight block text-sm ${
                            val > 0
                              ? 'text-emerald-400'
                              : val < 0
                              ? 'text-red-400'
                              : 'text-editorial-muted'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val === 0 ? '0' : val}
                        </span>
                        <span className="text-[10px] text-editorial-muted block">
                          Tot: {runningTotal}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2.5 bg-[#0d0d0d]/60 p-4 border border-editorial-border/60 rounded-none">
        <p className="text-[10px] text-editorial-muted uppercase tracking-wider leading-relaxed font-mono font-medium">
          Note: Ledger tracks seat performance dynamically. Running sums will pivot instantly. Use <strong>Undo Last Round</strong> above to perform quick edits without losing active logs.
        </p>
      </div>
    </div>
  );
}
