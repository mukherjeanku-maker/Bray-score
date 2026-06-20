import React from 'react';
import { Player, SavedGame } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { Trophy, Award, Medal, HelpCircle, Activity } from 'lucide-react';

interface TopPlayersSectionProps {
  history: SavedGame[];
  savedPlayers: Player[];
}

interface PlayerStats {
  player: Player;
  totalScore: number;
  totalRounds: number;
  averageScore: number;
}

export default function TopPlayersSection({ history = [], savedPlayers = [] }: TopPlayersSectionProps) {
  // 1. Calculate stats dynamically
  const statsMap: Record<string, { totalScore: number; totalRounds: number; player: Player }> = {};

  // Track players using saved directory to ensure fresh details (name, nickname, and DP)
  savedPlayers.forEach(p => {
    statsMap[p.id] = {
      totalScore: 0,
      totalRounds: 0,
      player: p,
    };
  });

  // Aggregate stats across all saved match history
  history.forEach(game => {
    game.rounds.forEach(round => {
      Object.entries(round.scores).forEach(([pId, score]) => {
        if (!statsMap[pId]) {
          const gamePlayer = game.players.find(gp => gp.id === pId);
          if (gamePlayer) {
            statsMap[pId] = {
              totalScore: 0,
              totalRounds: 0,
              player: gamePlayer,
            };
          } else {
            return; // skip if player cannot be identified
          }
        }
        statsMap[pId].totalScore += score;
        statsMap[pId].totalRounds += 1;
      });
    });
  });

  // Convert to list, qualify, sort: lower average score is better
  const qualifiedPlayers: PlayerStats[] = Object.values(statsMap)
    .filter(stat => stat.totalRounds >= 100) // At least 100 rounds criterion
    .map(stat => ({
      player: stat.player,
      totalScore: stat.totalScore,
      totalRounds: stat.totalRounds,
      averageScore: stat.totalRounds > 0 ? stat.totalScore / stat.totalRounds : 0,
    }))
    .sort((a, b) => a.averageScore - b.averageScore); // Ascending sort: lowest average is best

  // Take top 3 players
  const top3 = qualifiedPlayers.slice(0, 3);

  // Styling helper for trophies and borders
  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          textColor: 'text-editorial-gold',
          bgColor: 'bg-editorial-gold/10',
          borderColor: 'border-editorial-gold',
          label: 'Club Champion',
          icon: <Trophy className="w-5 h-5 text-editorial-gold" />
        };
      case 1:
        return {
          textColor: 'text-slate-300',
          bgColor: 'bg-slate-300/5',
          borderColor: 'border-slate-500/40',
          label: 'Runner Up',
          icon: <Award className="w-5 h-5 text-slate-400" />
        };
      case 2:
        return {
          textColor: 'text-amber-700',
          bgColor: 'bg-amber-700/5',
          borderColor: 'border-amber-700/30',
          label: 'Third Place',
          icon: <Medal className="w-5 h-5 text-amber-700" />
        };
      default:
        return {
          textColor: 'text-editorial-muted',
          bgColor: 'bg-[#101010]',
          borderColor: 'border-editorial-border',
          label: 'Qualifiant',
          icon: null
        };
    }
  };

  return (
    <div className="bg-editorial-dark border border-editorial-border relative overflow-hidden mt-8 shadow-xl" id="top-players-container">
      {/* Editorial top gold visual design line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-editorial-gold/20 via-editorial-gold to-editorial-gold/20" />

      {/* Header section with historical context */}
      <div className="p-5 sm:p-6 border-b border-editorial-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-editorial-gold block">PERFORMANCE RECORDS</span>
          <h3 className="text-lg font-black uppercase text-white tracking-tight flex items-center gap-2 font-display">
            🏆 Top Players Leaderboard
          </h3>
          <p className="text-[11px] text-editorial-muted font-sans max-w-xl leading-relaxed">
            Dynamic statistics of qualified members ranked in accordance to traditional Bray tournament standards. 
            Rankings are determined by those with the lowest average round scores.
          </p>
        </div>

        {/* Qualification Criteria Chip */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e0e0d] border border-editorial-border font-mono text-[9px] uppercase tracking-wider text-editorial-muted">
          <Activity className="w-3 h-3 text-editorial-gold" />
          <span>Minimum 100 Rounds Required</span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {top3.length === 0 ? (
          // Humble and pristine explanation state
          <div className="border border-dashed border-editorial-border/80 p-8 text-center bg-[#0d0d0c]/30 rounded-none" id="no-qualifiers-box">
            <div className="w-12 h-12 bg-editorial-dark border border-editorial-border rounded-full flex items-center justify-center mx-auto mb-4 text-editorial-muted">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h4 className="text-xs uppercase font-mono font-bold tracking-widest text-[#ece5d8] mb-1">
              Leaderboard Inactive
            </h4>
            <p className="text-[11px] text-editorial-muted max-w-sm mx-auto font-serif italic leading-relaxed">
              No registered members have completed the eligibility benchmark of 100 recorded tournament rounds yet.
            </p>
            <div className="mt-4 pt-3 border-t border-editorial-border/30 max-w-xs mx-auto flex items-center justify-between text-[9px] font-mono text-editorial-muted uppercase">
              <span>Rounds Recorded: {history.reduce((acc, game) => acc + game.rounds.length, 0)}</span>
              <span>Need: 100 per member</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="top-players-grid">
            {top3.map((stat, idx) => {
              const rankDesign = getRankStyle(idx);
              const displayName = stat.player.nickname 
                ? `${stat.player.officialName} (${stat.player.nickname})`
                : stat.player.officialName;

              return (
                <div
                  key={stat.player.id}
                  className={`border ${rankDesign.borderColor} ${rankDesign.bgColor} p-4 sm:p-5 relative flex flex-col justify-between gap-4 group transition-all duration-300 hover:scale-[1.01]`}
                  id={`top-player-rank-${idx + 1}`}
                >
                  {/* Rank indicator label */}
                  <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
                    <span className="text-[8px] uppercase tracking-widest font-mono text-editorial-muted font-bold">
                      {rankDesign.label}
                    </span>
                    {rankDesign.icon}
                  </div>

                  <div className="flex items-center gap-3.5 mt-2 min-w-0">
                    {/* Position Label badge */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 flex items-center justify-center font-display font-black text-lg ${rankDesign.textColor} border ${rankDesign.borderColor} bg-black/60`}>
                        {idx + 1}
                      </div>
                      <span className="text-[7px] font-mono text-editorial-muted uppercase tracking-widest mt-1">RANK</span>
                    </div>

                    {/* Avatar and Name details */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar
                        name={stat.player.name}
                        avatarUrl={stat.player.avatarUrl}
                        size="w-11 h-11"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-black uppercase text-white truncate block group-hover:text-editorial-gold transition-colors">
                          {stat.player.nickname || stat.player.officialName}
                        </span>
                        {stat.player.nickname && (
                          <span className="text-[9px] text-[#8e8271] font-serif italic block truncate">
                            {stat.player.officialName}
                          </span>
                        )}
                        <span className="text-[8px] font-mono text-editorial-muted block mt-0.5 tracking-wider select-all uppercase">
                          ID: {stat.player.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating metrics row */}
                  <div className="grid grid-cols-2 gap-2 border-t border-editorial-border/40 pt-3 mt-1.5">
                    <div className="bg-black/40 border border-editorial-border/30 p-2 text-left">
                      <span className="text-[7px] font-mono uppercase tracking-widest text-editorial-muted leading-none block mb-1">
                        Average Score
                      </span>
                      <span className={`text-base font-mono font-bold leading-none ${rankDesign.textColor}`}>
                        {stat.averageScore.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-black/40 border border-editorial-border/30 p-2 text-left">
                      <span className="text-[7px] font-mono uppercase tracking-widest text-editorial-muted leading-none block mb-1">
                        Rounds Played
                      </span>
                      <span className="text-base font-mono font-bold text-slate-200 leading-none">
                        {stat.totalRounds}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
