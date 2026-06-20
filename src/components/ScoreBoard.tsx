import React, { useEffect, useState, useRef } from 'react';
import { Player, Round } from '../types';
import { Trophy, Medal, ArrowUp, ArrowDown, Award, Crown, Zap, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { PlayerAvatar } from './PlayerAvatar';
import { ShareCardModal } from './ShareCardModal';

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const startValue = previousValueRef.current;
    if (startValue === value) {
      return;
    }

    const duration = 600; // ms transition length
    const startTime = performance.now();
    let animationFrameId: number;

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutQuad
      const easeProgress = progress * (2 - progress);
      const current = Math.round(startValue + (value - startValue) * easeProgress);
      
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      } else {
        previousValueRef.current = value;
      }
    };

    animationFrameId = requestAnimationFrame(updateNumber);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <span>{displayValue}</span>;
}

interface ScoreBoardProps {
  players: Player[];
  rounds: Round[];
  status: 'setup' | 'playing' | 'ended';
  onEndGame: () => void;
  onResetGame: () => void;
  onUpdatePlayer?: (player: Player) => void;
  isAdmin?: boolean;
}

export function ScoreBoard({ players, rounds, status, onEndGame, onResetGame, onUpdatePlayer, isAdmin = false }: ScoreBoardProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const isEditAllowed = status === 'playing' || (status === 'ended' && isAdmin);

  const handleAvatarClick = (playerId: string) => {
    if (!isEditAllowed) return;
    document.getElementById(`avatar-upload-${playerId}`)?.click();
  };

  const handleFileChange = (player: Player, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdatePlayer) {
      if (file.size > 1500000) {
        alert("This image is too large! Please upload an image under 1.5MB to preserve local club storage.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onUpdatePlayer({
            ...player,
            avatarUrl: reader.result,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Calculate overall score sums
  const calculateTotal = (playerId: string) => {
    return rounds.reduce((sum, round) => sum + (round.scores[playerId] || 0), 0);
  };

  // 2. Identify score change from the actual last round
  const getLastRoundChange = (playerId: string) => {
    if (rounds.length === 0) return 0;
    const lastRound = rounds[rounds.length - 1];
    return lastRound.scores[playerId] || 0;
  };

  // 3. Assemble and sort players based on total score
  const standings = players.map((player) => {
    const total = calculateTotal(player.id);
    const lastChange = getLastRoundChange(player.id);
    return {
      ...player,
      total,
      lastChange,
    };
  }).sort((a, b) => a.total - b.total);

  // Assign rankings (handling potential ties elegantly)
  const rankedStandings = standings.map((item, idx, arr) => {
    let rank = idx + 1;
    if (idx > 0 && item.total === arr[idx - 1].total) {
      // Find what rank the tied predecessor had
      // Keep it simple for card tables
    }
    return {
      ...item,
      rank,
    };
  });

  const winner = rankedStandings[0];
  const isTied = rankedStandings.length > 1 && rankedStandings[0].total === rankedStandings[1].total;

  const getRankStats = (rank: number) => {
    switch (rank) {
      case 1:
        return { label: "Champion", code: "01" };
      case 2:
        return { label: "Challenger", code: "02" };
      case 3:
        return { label: "Contender", code: "03" };
      default:
        return { label: "Tailing", code: "04" };
    }
  };

  return (
    <div className="space-y-6" id="scoreboard-container">
      {/* Editorial Winner Banner for Game End state */}
      {status === 'ended' && winner && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-editorial-dark border-2 border-editorial-gold p-8 text-center space-y-4 relative overflow-hidden"
          id="victory-banner"
        >
          <div>
            <span className="text-xs tracking-[0.35em] text-editorial-gold font-bold uppercase font-mono block">
              Tournament Result
            </span>
            <h3 className="text-4xl font-black uppercase text-white mt-2" id="winner-name">
              {isTied ? "Table Tied Game" : `${winner.name} Wins!`}
            </h3>
            <p className="text-editorial-muted text-xs uppercase tracking-wider font-mono mt-2">
              Crown claimed with <strong className="text-editorial-gold font-bold">{winner.total} points</strong> over {rounds.length} rounds.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-6 py-3 bg-transparent border-2 border-editorial-gold text-editorial-gold hover:text-black hover:bg-editorial-gold font-black uppercase tracking-widest text-[#dcae44] text-xs rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              id="share-match-result-btn"
            >
              <Share2 className="w-4 h-4" />
              Share Result
            </button>
            <button
              onClick={onResetGame}
              className="px-6 py-3 bg-editorial-gold hover:bg-amber-400 text-black font-black uppercase tracking-widest text-xs rounded-none transition-colors cursor-pointer w-full sm:w-auto"
              id="congrats-new-game-btn"
            >
              Start New Play
            </button>
          </div>
        </motion.div>
      )}

      {/* Leaderboard Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs uppercase tracking-[0.4em] text-editorial-gold font-bold">
            Live Standings
          </h2>
          <span className="h-px flex-1 mx-4 bg-editorial-border"></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="players-grip">
          {rankedStandings.map((player) => {
            const hasGained = player.lastChange > 0;
            const hasLost = player.lastChange < 0;
            const stats = getRankStats(player.rank);

            return (
              <motion.div
                key={player.id}
                layoutId={`player-card-${player.id}`}
                transition={{ type: 'spring', damping: 25, stiffness: 140 }}
                className={`bg-editorial-dark border p-6 flex flex-col justify-between transition-colors relative group rounded-none select-none ${
                  player.rank === 1
                    ? 'border-editorial-gold/60 hover:border-editorial-gold'
                    : 'border-editorial-border hover:border-editorial-gold'
                }`}
                id={`score-card-${player.id}`}
              >
                {/* Large Background Rank Number */}
                <div 
                  className={`absolute top-4 right-4 text-4xl font-black font-mono transition-colors duration-300 ${
                    player.rank === 1 
                      ? 'text-editorial-gold/15 group-hover:text-editorial-gold/30' 
                      : 'text-editorial-border group-hover:text-editorial-gold/15'
                  }`}
                >
                  {stats.code}
                </div>

                {/* Seat details / Profile card with Circular profile image & Player Name */}
                <div className="flex items-center gap-4 z-10">
                  <div className="relative group/avatar">
                    <PlayerAvatar
                      name={player.name}
                      avatarUrl={player.avatarUrl}
                      size="w-14 h-14 sm:w-16 sm:h-16"
                      onClick={isEditAllowed ? () => handleAvatarClick(player.id) : undefined}
                      editable={isEditAllowed}
                    />
                    <input
                      type="file"
                      id={`avatar-upload-${player.id}`}
                      onChange={(e) => handleFileChange(player, e)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-editorial-muted font-bold mb-1 flex flex-wrap items-center gap-x-1.5 font-mono">
                      <span>{stats.label}</span>
                      <span className="text-editorial-gold/40">•</span>
                      <span>Rank {player.rank}</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white truncate max-w-[95%] leading-none" title={player.officialName}>
                      {player.officialName || player.name}
                    </div>
                    {player.nickname && (
                      <div className="text-[11px] text-editorial-gold font-mono font-medium mt-0.5 uppercase tracking-wider">
                        "{player.nickname}"
                      </div>
                    )}
                    {isEditAllowed && (
                      <button
                        onClick={() => handleAvatarClick(player.id)}
                        className="text-[9px] text-[#8e8271] hover:text-editorial-gold font-mono uppercase tracking-wider block mt-1 hover:underline cursor-pointer"
                      >
                        Change DP
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Total points & Round indicator */}
                <div className="flex items-baseline justify-between mt-6 pt-3 border-t border-editorial-border/40">
                  <div className="flex items-baseline gap-2">
                    <span 
                      className={`text-5xl font-black tracking-tighter ${
                        player.rank === 1 ? 'text-editorial-gold' : 'text-slate-200'
                      }`}
                    >
                      <AnimatedNumber value={player.total} />
                    </span>
                    <span className="text-[10px] text-editorial-muted uppercase tracking-widest font-mono">pts</span>
                  </div>

                  {/* Change badge */}
                  {rounds.length > 0 && player.lastChange !== 0 && (
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        hasGained
                          ? 'text-emerald-400'
                          : hasLost
                          ? 'text-red-400'
                          : 'text-editorial-muted'
                      }`}
                    >
                      {hasGained ? '+' : ''}{player.lastChange} Last
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {status === 'playing' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-transparent border border-editorial-border/60 p-5 gap-4">
          <p className="text-xs text-editorial-muted leading-relaxed font-mono font-medium max-w-lg">
            Agnibina Sangha club guidelines recommend locking in scores once rounds conclude. Keep recording points or close the table when ready.
          </p>
          <button
            onClick={onEndGame}
            className="px-4 py-2.5 bg-red-950/20 hover:bg-red-950 text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-500 rounded-none font-bold uppercase tracking-widest text-[10px] font-mono transition-all cursor-pointer shrink-0"
            id="end-game-btn"
          >
            Declare Winner
          </button>
        </div>
      )}

      <ShareCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        players={players}
        rounds={rounds}
      />
    </div>
  );
}
