import React, { useState } from 'react';
import { Player, SavedGame } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { Swords, Trophy, Activity, Calendar, Award, Star, TrendingDown, RefreshCw, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PlayerComparisonProps {
  savedPlayers: Player[];
  games: SavedGame[];
}

interface ComputedStats {
  gamesPlayed: number;
  roundsPlayed: number;
  totalScoreSum: number;
  averageScore: number;
  winsCount: number;
  winPercentage: number;
  bestRoundScore: number;
  bestGameTotalScore: number;
  recentTrend: number[];
}

export default function PlayerComparison({ savedPlayers = [], games = [] }: PlayerComparisonProps) {
  const [playerAId, setPlayerAId] = useState<string>('');
  const [playerBId, setPlayerBId] = useState<string>('');

  const pA = savedPlayers.find(p => p.id === playerAId);
  const pB = savedPlayers.find(p => p.id === playerBId);

  // Stats computer helper
  const computeStats = (player?: Player): ComputedStats | null => {
    if (!player) return null;

    let gamesPlayed = 0;
    let roundsPlayed = 0;
    let totalScoreSum = 0;
    let winsCount = 0;
    let bestRoundScore = Infinity;
    let bestGameTotalScore = Infinity;
    const recentRounds: number[] = [];

    // Evaluate stats chronological order
    games.forEach(game => {
      const isParticipant = game.players.some(gp => gp.id === player.id);
      if (!isParticipant) return;

      gamesPlayed++;

      // Winner validation (flexible check supporting both displays & IDs)
      const matchesWinnerName = (game.winnerName || '').toLowerCase().trim();
      const displayOption = (player.nickname || player.officialName).toLowerCase().trim();
      const checkOfficial = player.officialName.toLowerCase().trim();
      const checkNick = (player.nickname || '').toLowerCase().trim();

      if (
        matchesWinnerName === displayOption ||
        matchesWinnerName === checkOfficial ||
        (checkNick && matchesWinnerName === checkNick)
      ) {
        winsCount++;
      }

      let gameTotalInput = 0;
      let roundCountInGame = 0;

      game.rounds.forEach(round => {
        const score = round.scores[player.id];
        if (typeof score === 'number') {
          roundsPlayed++;
          totalScoreSum += score;
          gameTotalInput += score;
          roundCountInGame++;

          if (score < bestRoundScore) {
            bestRoundScore = score;
          }
          recentRounds.push(score);
        }
      });

      if (roundCountInGame > 0 && gameTotalInput < bestGameTotalScore) {
        bestGameTotalScore = gameTotalInput;
      }
    });

    const averageScore = roundsPlayed > 0 ? totalScoreSum / roundsPlayed : 0;
    const winPercentage = gamesPlayed > 0 ? (winsCount / gamesPlayed) * 100 : 0;
    const recentTrend = recentRounds.slice(-5);

    return {
      gamesPlayed,
      roundsPlayed,
      totalScoreSum,
      averageScore,
      winsCount,
      winPercentage,
      bestRoundScore: bestRoundScore === Infinity ? 0 : bestRoundScore,
      bestGameTotalScore: bestGameTotalScore === Infinity ? 0 : bestGameTotalScore,
      recentTrend
    };
  };

  const statsA = computeStats(pA);
  const statsB = computeStats(pB);

  // Comparison assessment: Lower Average Score wins due to Bray guidelines
  let overallWinner: 'A' | 'B' | 'TIE' | null = null;
  if (statsA && statsB) {
    if (statsA.roundsPlayed > 0 && statsB.roundsPlayed > 0) {
      if (statsA.averageScore < statsB.averageScore) {
        overallWinner = 'A';
      } else if (statsB.averageScore < statsA.averageScore) {
        overallWinner = 'B';
      } else {
        // Tie breaker on wins count
        if (statsA.winsCount > statsB.winsCount) {
          overallWinner = 'A';
        } else if (statsB.winsCount > statsA.winsCount) {
          overallWinner = 'B';
        } else {
          overallWinner = 'TIE';
        }
      }
    } else if (statsA.roundsPlayed > 0) {
      overallWinner = 'A';
    } else if (statsB.roundsPlayed > 0) {
      overallWinner = 'B';
    }
  }

  // Quick reset helper
  const handleReset = () => {
    setPlayerAId('');
    setPlayerBId('');
  };

  const otherPlayersForA = savedPlayers.filter(p => p.id !== playerBId);
  const otherPlayersForB = savedPlayers.filter(p => p.id !== playerAId);

  return (
    <div className="space-y-8" id="sandbox-vs-arena">
      {/* Title block */}
      <div className="bg-editorial-dark border border-editorial-border p-6 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="vs-header">
        <div className="absolute top-0 left-0 right-0 h-1 bg-editorial-gold" />
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.25em] font-black text-editorial-gold font-mono block">1 vs 1 CHALLENGE ARENA</span>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none flex items-center gap-2">
            <Swords className="w-5 h-5 text-editorial-gold" /> Player Performance Duel
          </h2>
          <p className="text-xs text-editorial-muted">
            Select any two club members to conduct an exhaustive stats comparison and settle friendly challenges.
          </p>
        </div>
        {(playerAId || playerBId) && (
          <button
            onClick={handleReset}
            className="text-[9px] font-mono uppercase bg-[#1d1a15] hover:bg-editorial-gold hover:text-black border border-editorial-gold/25 px-3 py-1.5 text-editorial-gold transition-all cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Reset Grid
          </button>
        )}
      </div>

      {/* Selectors grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="vs-selectors-grid">
        {/* Selector A */}
        <div className="bg-editorial-dark border border-editorial-border p-5 space-y-3">
          <label className="text-[10px] font-mono text-editorial-gold uppercase tracking-widest font-bold">Select Player One (A)</label>
          <div className="relative">
            <select
              value={playerAId}
              onChange={(e) => setPlayerAId(e.target.value)}
              className="w-full bg-[#070707] border border-editorial-border text-white text-xs p-3 focus:border-editorial-gold focus:outline-none appearance-none tracking-wide cursor-pointer uppercase font-mono"
              id="vs-selector-player-a"
            >
              <option value="">-- CHOOSE BASE PROFILES --</option>
              {otherPlayersForA.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nickname ? `${p.officialName} "${p.nickname}" (ID: ${p.id})` : `${p.officialName} (ID: ${p.id})`}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-editorial-muted">
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>
        </div>

        {/* Selector B */}
        <div className="bg-editorial-dark border border-editorial-border p-5 space-y-3">
          <label className="text-[10px] font-mono text-editorial-gold uppercase tracking-widest font-bold">Select Player Two (B)</label>
          <div className="relative">
            <select
              value={playerBId}
              onChange={(e) => setPlayerBId(e.target.value)}
              className="w-full bg-[#070707] border border-editorial-border text-white text-xs p-3 focus:border-editorial-gold focus:outline-none appearance-none tracking-wide cursor-pointer uppercase font-mono"
              id="vs-selector-player-b"
            >
              <option value="">-- CHOOSE COMPARE PROFILES --</option>
              {otherPlayersForB.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nickname ? `${p.officialName} "${p.nickname}" (ID: ${p.id})` : `${p.officialName} (ID: ${p.id})`}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-editorial-muted">
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>
        </div>
      </div>

      {(!pA || !pB) ? (
        // Placeholder instruction state when selections are incomplete
        <div className="bg-[#0e0e0e] border border-editorial-border/40 py-16 text-center shadow-inner" id="vs-empty-state">
          <Swords className="w-12 h-12 text-editorial-border mx-auto mb-4 animate-pulse stroke-[1.25]" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest font-mono">Arena Challenger Grid Open</h3>
          <p className="text-xs text-editorial-muted max-w-sm mx-auto mt-2 leading-relaxed">
            Choose two separate registered active players from the directory fields above to display comprehensive Bray performance reports side-by-side.
          </p>
        </div>
      ) : (
        // Complete duel statistics view card
        <div className="space-y-6" id="vs-results-pane">
          
          {/* Winner Banner */}
          {overallWinner && (
            <div className={`border p-5 text-center relative overflow-hidden flex flex-col items-center justify-center gap-1.5 ${
              overallWinner === 'TIE' 
                ? 'bg-[#1b1a16] border-editorial-gold/30' 
                : 'bg-[#14120e] border-editorial-gold'
            }`} id="vs-winner-announcement">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-editorial-gold" />
              <Trophy className="w-8 h-8 text-editorial-gold animate-bounce" />
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-editorial-gold">CHALLENGE RULING</span>
              <h3 className="text-lg font-black uppercase text-white tracking-widest">
                {overallWinner === 'TIE' 
                  ? "Performances are deadlocked evenly!" 
                  : `👑 Winner: ${overallWinner === 'A' ? (pA.nickname || pA.officialName) : (pB.nickname || pB.officialName)}`
                }
              </h3>
              <p className="text-[11px] text-editorial-muted font-sans max-w-md">
                {overallWinner === 'TIE' 
                  ? "Both players hold identical average round scores across historical records."
                  : <span><strong>{overallWinner === 'A' ? (pA.nickname || pA.officialName) : (pB.nickname || pB.officialName)}</strong> reigns supreme with a superior average score of <strong>{(overallWinner === 'A' ? statsA!.averageScore : statsB!.averageScore).toFixed(2)}</strong> points per round!</span>
                }
              </p>
            </div>
          )}

          {/* Versus Header Profiles Display */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center bg-editorial-dark border border-editorial-border p-6" id="vs-faceoff-banner">
            
            {/* Player A Card */}
            <div className="md:col-span-5 flex flex-col items-center text-center p-3.5 space-y-2 select-none relative">
              {overallWinner === 'A' && (
                <span className="absolute top-0 left-0 bg-editorial-gold text-black text-[8px] font-mono font-black uppercase px-2 py-0.5 tracking-wide">🏆 LEADER</span>
              )}
              <PlayerAvatar name={pA.name} avatarUrl={pA.avatarUrl} size="w-16 h-16 border-2 border-editorial-border" />
              <div className="min-w-0">
                <h4 className="text-base font-black uppercase text-white truncate">{pA.officialName}</h4>
                {pA.nickname && <span className="text-xs text-editorial-gold font-mono uppercase tracking-wide">"{pA.nickname}"</span>}
                <span className="text-[9px] text-editorial-muted font-mono block mt-1">ID: {pA.id}</span>
              </div>
            </div>

            {/* Middle Swords Icon */}
            <div className="md:col-span-1 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full border border-editorial-border bg-black/60 flex items-center justify-center text-editorial-gold">
                <Swords className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono text-editorial-muted tracking-widest mt-1">VS</span>
            </div>

            {/* Player B Card */}
            <div className="md:col-span-5 flex flex-col items-center text-center p-3.5 space-y-2 select-none relative">
              {overallWinner === 'B' && (
                <span className="absolute top-0 right-0 bg-editorial-gold text-black text-[8px] font-mono font-black uppercase px-2 py-0.5 tracking-wide">🏆 LEADER</span>
              )}
              <PlayerAvatar name={pB.name} avatarUrl={pB.avatarUrl} size="w-16 h-16 border-2 border-editorial-border" />
              <div className="min-w-0">
                <h4 className="text-base font-black uppercase text-white truncate">{pB.officialName}</h4>
                {pB.nickname && <span className="text-xs text-editorial-gold font-mono uppercase tracking-wide">"{pB.nickname}"</span>}
                <span className="text-[9px] text-editorial-muted font-mono block mt-1">ID: {pB.id}</span>
              </div>
            </div>

          </div>

          {/* Duelling Stats Grid */}
          <div className="bg-editorial-dark border border-editorial-border divide-y divide-editorial-border/40 font-mono text-xs" id="vs-metric-duels">
            
            {/* Metric Row Helper */}
            {(() => {
              const renderMetricRow = (
                title: string,
                valueA: string | number,
                valueB: string | number,
                isBetter: (valA: any, valB: any) => 'A' | 'B' | null,
                icon?: React.ReactNode
              ) => {
                const betterSide = isBetter(valueA, valueB);

                return (
                  <div className="grid grid-cols-3 py-3 px-4 sm:px-6 items-center hover:bg-[#11100f]/45 transition-colors">
                    <div className={`text-left font-bold ${betterSide === 'A' ? 'text-editorial-gold' : 'text-slate-300'}`}>
                      {valueA}
                      {betterSide === 'A' && <span className="ml-1 text-[8px] uppercase font-bold text-editorial-gold bg-editorial-gold/15 px-1 font-mono">WIN</span>}
                    </div>
                    
                    <div className="text-center font-bold text-[10px] text-editorial-muted uppercase tracking-widest flex items-center justify-center gap-1.5 min-w-0">
                      {icon}
                      <span className="truncate">{title}</span>
                    </div>

                    <div className={`text-right font-bold ${betterSide === 'B' ? 'text-editorial-gold' : 'text-slate-300'}`}>
                      {betterSide === 'B' && <span className="mr-1 text-[8px] uppercase font-bold text-editorial-gold bg-editorial-gold/15 px-1 font-mono">WIN</span>}
                      {valueB}
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {renderMetricRow(
                    "Games Played",
                    statsA!.gamesPlayed,
                    statsB!.gamesPlayed,
                    (a, b) => a > b ? 'A' : b > a ? 'B' : null,
                    <Calendar className="w-3.5 h-3.5 text-editorial-muted shrink-0" />
                  )}

                  {renderMetricRow(
                    "Rounds Played",
                    statsA!.roundsPlayed,
                    statsB!.roundsPlayed,
                    (a, b) => a > b ? 'A' : b > a ? 'B' : null,
                    <Activity className="w-3.5 h-3.5 text-editorial-muted shrink-0" />
                  )}

                  {renderMetricRow(
                    "Total Score Accum",
                    statsA!.totalScoreSum,
                    statsB!.totalScoreSum,
                    (a, b) => a < b ? 'A' : b < a ? 'B' : null, // lower overall accumulation is better in Bray!
                    <Star className="w-3.5 h-3.5 text-editorial-muted shrink-0" />
                  )}

                  {renderMetricRow(
                    "Avg round score",
                    statsA!.averageScore > 0 ? statsA!.averageScore.toFixed(2) : '0.00',
                    statsB!.averageScore > 0 ? statsB!.averageScore.toFixed(2) : '0.00',
                    (a, b) => parseFloat(a) < parseFloat(b) ? 'A' : parseFloat(b) < parseFloat(a) ? 'B' : null, // lower is better
                    <TrendingDown className="w-3.5 h-3.5 text-editorial-gold shrink-0" />
                  )}

                  {renderMetricRow(
                    "Official Tournament Wins",
                    statsA!.winsCount,
                    statsB!.winsCount,
                    (a, b) => a > b ? 'A' : b > a ? 'B' : null,
                    <Trophy className="w-3.5 h-3.5 text-editorial-muted shrink-0" />
                  )}

                  {renderMetricRow(
                    "Win Percentage",
                    `${statsA!.winPercentage.toFixed(1)}%`,
                    `${statsB!.winPercentage.toFixed(1)}%`,
                    (a, b) => parseFloat(a) > parseFloat(b) ? 'A' : parseFloat(b) > parseFloat(a) ? 'B' : null,
                    <Award className="w-3.5 h-3.5 text-editorial-muted shrink-0" />
                  )}

                  {renderMetricRow(
                    "Lowest Round Score",
                    statsA!.bestRoundScore,
                    statsB!.bestRoundScore,
                    (a, b) => a < b ? 'A' : b < a ? 'B' : null, // lower score is better
                    <Star className="w-3.5 h-3.5 text-yellow-500 shrink-0 fill-yellow-500/20" />
                  )}

                  {renderMetricRow(
                    "Lowest Game Total",
                    statsA!.bestGameTotalScore,
                    statsB!.bestGameTotalScore,
                    (a, b) => a < b ? 'A' : b < a ? 'B' : null, // lower is better
                    <Award className="w-3.5 h-3.5 text-editorial-muted shrink-0" />
                  )}
                </>
              );
            })()}

          </div>

          {/* Recent Trend display section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="vs-trends-row">
            {/* Player A Trend */}
            <div className="bg-editorial-dark border border-editorial-border p-4.5 space-y-3">
              <span className="text-[9px] font-mono text-editorial-muted uppercase tracking-widest font-black block">Recent Scoreline Duel (A)</span>
              <div className="flex items-center gap-2">
                <PlayerAvatar name={pA.name} avatarUrl={pA.avatarUrl} size="w-7 h-7" />
                <span className="text-xs font-bold text-white uppercase">{pA.nickname || pA.officialName}</span>
              </div>
              
              {statsA!.recentTrend.length === 0 ? (
                <p className="text-[10px] font-mono text-editorial-muted italic">No active scored rounds tracked.</p>
              ) : (
                <div className="flex items-center gap-2 pt-1 font-mono">
                  {statsA!.recentTrend.map((score, trendIdx) => (
                    <div
                      key={trendIdx}
                      className="bg-[#0c0c0b] border border-editorial-border/60 hover:border-editorial-gold px-2.5 py-1.5 flex flex-col items-center justify-center min-w-[42px] relative group transition-colors"
                      title="Chronological round score value"
                    >
                      <span className="text-[8px] text-editorial-muted block uppercase tracking-wide leading-none mb-1">R0{trendIdx+1}</span>
                      <span className="text-xs font-bold text-slate-100 leading-none">{score}</span>
                    </div>
                  ))}
                </div>
              )}
              <span className="text-[9px] text-[#8e8271] font-mono block italic">Chronological left-to-right score trend. Lower scores are better.</span>
            </div>

            {/* Player B Trend */}
            <div className="bg-editorial-dark border border-editorial-border p-4.5 space-y-3">
              <span className="text-[9px] font-mono text-editorial-muted uppercase tracking-widest font-black block">Recent Scoreline Duel (B)</span>
              <div className="flex items-center gap-2">
                <PlayerAvatar name={pB.name} avatarUrl={pB.avatarUrl} size="w-7 h-7" />
                <span className="text-xs font-bold text-white uppercase">{pB.nickname || pB.officialName}</span>
              </div>

              {statsB!.recentTrend.length === 0 ? (
                <p className="text-[10px] font-mono text-editorial-muted italic">No active scored rounds tracked.</p>
              ) : (
                <div className="flex items-center gap-2 pt-1 font-mono">
                  {statsB!.recentTrend.map((score, trendIdx) => (
                    <div
                      key={trendIdx}
                      className="bg-[#0c0c0b] border border-editorial-border/60 hover:border-editorial-gold px-2.5 py-1.5 flex flex-col items-center justify-center min-w-[42px] relative group transition-colors"
                      title="Chronological round score value"
                    >
                      <span className="text-[8px] text-editorial-muted block uppercase tracking-wide leading-none mb-1">R0{trendIdx+1}</span>
                      <span className="text-xs font-bold text-slate-100 leading-none">{score}</span>
                    </div>
                  ))}
                </div>
              )}
              <span className="text-[9px] text-[#8e8271] font-mono block italic">Chronological left-to-right score trend. Lower scores are better.</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
