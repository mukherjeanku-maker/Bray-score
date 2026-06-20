import { Player, Round } from '../types';

/**
 * Interface representing the inputs required to generate a Bray championship result card.
 */
interface GeneratorOptions {
  players: Player[];
  rounds: Round[];
  dateString?: string;
}

/**
 * Helper to compute placements (with lowest scores winning in Bray)
 */
function getStandings(players: Player[], rounds: Round[]) {
  const calculateTotal = (playerId: string) => {
    return rounds.reduce((sum, round) => sum + (round.scores[playerId] || 0), 0);
  };

  return players
    .map((player) => ({
      ...player,
      total: calculateTotal(player.id),
    }))
    .sort((a, b) => a.total - b.total);
}

const getRankRoleLabel = (rank: number) => {
  switch (rank) {
    case 1: return "🏆 তাসের জনক (Champion)";
    case 2: return "🥈 Challenger";
    case 3: return "🥉 Contender";
    default: return "🏅 Clubhouse Player";
  }
};

/**
 * Generates a high-resolution base64 PNG data URL of the premium victory card.
 * Uses native HTML5 Canvas API to draw borders, texts, and render custom winner avatars.
 */
export async function generateResultCard({
  players,
  rounds,
  dateString
}: GeneratorOptions): Promise<string> {
  const standings = getStandings(players, rounds);
  const winner = standings[0];
  if (!winner) {
    throw new Error("No players recorded in match.");
  }

  // Set up 800x1200 canvas optimized for WhatsApp Status (2:3 Aspect ratio)
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Fallback failed: HTML5 Canvas API of the container frame could not initialize.');
  }

  const displayDate = dateString || new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Calculate ranks handling ties safely
  const rankedStandings = standings.map((item, idx, arr) => {
    let rank = idx + 1;
    if (idx > 0 && item.total === arr[idx - 1].total) {
      rank = idx;
    }
    return { ...item, rank };
  });

  // 1. Draw elegant background dark canvas theme
  ctx.fillStyle = '#0a0907';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw outer gold vintage margin borders
  ctx.strokeStyle = '#dcae44';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  // 3. Thick custom bronze framing borders
  ctx.strokeStyle = '#1b1712';
  ctx.lineWidth = 14;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  // 4. Fine highlight gold lining inner border
  ctx.strokeStyle = 'rgba(220,174,68,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, canvas.width - 88, canvas.height - 88);

  // 5. Ornament card corner suit symbols for visual depth
  ctx.fillStyle = 'rgba(220,174,68,0.3)';
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText("A ♠", 64, 80);
  ctx.textAlign = 'right';
  ctx.fillText("1947 ♣", canvas.width - 64, 80);
  
  ctx.textAlign = 'left';
  ctx.fillText("BRAY ♥", 64, canvas.height - 70);
  ctx.textAlign = 'right';
  ctx.fillText("SANGHA ♦", canvas.width - 64, canvas.height - 70);

  // 6. Header club branding
  ctx.fillStyle = '#dcae44';
  ctx.textAlign = 'center';
  ctx.font = '900 28px "Inter", sans-serif';
  ctx.fillText("🔥 AGNIBINA SANGHA 🔥", canvas.width / 2, 130);

  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 14px "Inter", monospace';
  ctx.fillText("ESTABLISHED CLUB • 1947", canvas.width / 2, 160);

  // Gradient line separator
  const lineGrad = ctx.createLinearGradient(160, 0, canvas.width - 160, 0);
  lineGrad.addColorStop(0, 'rgba(220,174,68,0)');
  lineGrad.addColorStop(0.5, 'rgba(220,174,68,0.3)');
  lineGrad.addColorStop(1, 'rgba(220,174,68,0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 185);
  ctx.lineTo(canvas.width - 160, 185);
  ctx.stroke();

  // 7. Large Bengali Title: "তাসের জনক"
  const textGrad = ctx.createLinearGradient(0, 200, 0, 270);
  textGrad.addColorStop(0, '#f3e1c6');
  textGrad.addColorStop(1, '#bfa175');
  ctx.fillStyle = textGrad;
  ctx.font = '900 60px "Inter", "Georgia", sans-serif';
  ctx.shadowColor = 'rgba(220,174,68,0.18)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillText("তাসের জনক", canvas.width / 2, 245);
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = 'rgba(220,174,68,0.7)';
  ctx.font = 'bold 13px "Inter", monospace';
  ctx.fillText("♠♣ BRAY CHAMPIONSHIP LEDGER ♣♦", canvas.width / 2, 275);

  // 8. Winner Spotlight Section
  const avY = 390;
  const avR = 80;

  // Double golden circular frames around profile avatar
  ctx.strokeStyle = '#dcae44';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, avY, avR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(220,174,68,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, avY, avR + 6, 0, Math.PI * 2);
  ctx.stroke();

  // Fetch and Draw avatar with crop safety
  let avatarDrawn = false;
  if (winner.avatarUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = winner.avatarUrl!;
      });
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(canvas.width / 2, avY, avR - 1.5, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, canvas.width / 2 - avR, avY - avR, avR * 2, avR * 2);
      ctx.restore();
      avatarDrawn = true;
    } catch (e) {
      console.warn("Avatar cross-origin load bypassed. Standard styling applies.", e);
    }
  }

  if (!avatarDrawn) {
    // Beautiful luxury letter placeholder
    ctx.fillStyle = '#161410';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, avY, avR - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dcae44';
    ctx.font = '900 68px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(winner.name.trim().charAt(0).toUpperCase(), canvas.width / 2, avY);
    ctx.textBaseline = 'alphabetic'; // Restore standard
  }

  // Champion Ribbon Badge
  const bannerX = canvas.width / 2 - 100;
  const bannerY = avY + avR + 15; // y = 485
  const bannerW = 200;
  const bannerH = 34;
  
  ctx.fillStyle = '#dcae44';
  ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

  ctx.fillStyle = '#0a0907';
  ctx.font = '900 13px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("🏆 CHAMPION 🏆", canvas.width / 2, bannerY + 21);

  // Target Winner Competitor Names
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px "Inter", sans-serif';
  ctx.fillText(winner.name, canvas.width / 2, bannerY + 75);

  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`NICKNAME: "${winner.nickname || winner.name}"`, canvas.width / 2, bannerY + 104);

  // Score Showcase Badge Box
  const scX = canvas.width / 2 - 170;
  const scY = bannerY + 125; // y = 644
  const scW = 340;
  const scH = 76;

  ctx.fillStyle = '#12110e';
  ctx.strokeStyle = 'rgba(220,174,68,0.35)';
  ctx.lineWidth = 2;
  ctx.fillRect(scX, scY, scW, scH);
  ctx.strokeRect(scX, scY, scW, scH);

  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 11px monospace';
  ctx.fillText("FINAL BRAY TALLY", canvas.width / 2, scY + 25);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 34px monospace';
  ctx.fillText(`${winner.total} PTS`, canvas.width / 2, scY + 60);

  // 9. Competitor Rankings List
  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("SANGHA LEDGER COMPETITOR PLACEMENTS", 110, 765);
  
  ctx.textAlign = 'right';
  ctx.fillText("TOTAL", canvas.width - 110, 765);

  ctx.strokeStyle = 'rgba(220,174,68,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(110, 775);
  ctx.lineTo(canvas.width - 110, 775);
  ctx.stroke();

  let rowY = 795;
  rankedStandings.slice(0, 4).forEach((item, index) => {
    ctx.fillStyle = index === 0 ? 'rgba(220,174,68,0.06)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(110, rowY, canvas.width - 220, 42);

    ctx.strokeStyle = index === 0 ? 'rgba(220,174,68,0.25)' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(110, rowY, canvas.width - 220, 42);

    // Draw Rank
    ctx.fillStyle = '#dcae44';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(item.rank), 130, rowY + 26);

    // Draw Name
    ctx.fillStyle = index === 0 ? '#dcae44' : '#ffffff';
    ctx.font = 'bold 15px "Inter", sans-serif';
    ctx.fillText(item.name, 160, rowY + 26);

    // Rank role label placement
    ctx.fillStyle = '#8e8271';
    ctx.font = '9.5px monospace';
    ctx.fillText(getRankRoleLabel(item.rank), 360, rowY + 26);

    // Score placement info
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${item.total} pts`, canvas.width - 130, rowY + 26);

    rowY += 49;
  });

  // 10. Core Match stats metadata
  const statsY = rowY + 12;
  ctx.fillStyle = 'rgba(255,255,255,0.01)';
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;

  // Round stats container
  ctx.fillRect(110, statsY, 280, 48);
  ctx.strokeRect(110, statsY, 280, 48);
  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("MATCH ROUND COUNTS", 250, statsY + 19);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`${rounds.length} ROUNDS PLAYED`, 250, statsY + 36);

  // Time / Date container
  ctx.fillRect(canvas.width - 390, statsY, 280, 48);
  ctx.strokeRect(canvas.width - 390, statsY, 280, 48);
  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 9px monospace';
  ctx.fillText("MATCH DATE", canvas.width - 250, statsY + 19);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(displayDate.toUpperCase(), canvas.width - 250, statsY + 36);

  // 11. Footer details
  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 11px monospace';
  ctx.fillText("POWERED BY AGNIBINA SANGHA BRAY SCORE TRACKER", canvas.width / 2, canvas.height - 90);

  ctx.fillStyle = 'rgba(220,174,68,0.5)';
  ctx.font = 'bold 9.5px monospace';
  ctx.fillText("SUITABLE FOR DIRECT EXPORT TO WHATSAPP STATUS", canvas.width / 2, canvas.height - 74);

  return canvas.toDataURL('image/png');
}
