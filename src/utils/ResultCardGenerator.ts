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

const getRankRoleLabel = (rank: number, isLast: boolean) => {
  if (isLast) {
    return "🤣 তাসের জনক";
  }
  switch (rank) {
    case 1: return "🏆 Club Champion";
    case 2: return "🥈 Challenger";
    case 3: return "🥉 Contender";
    default: return "🏅 Player";
  }
};

/**
 * Utility to draw rounded rectangles on HTML5 canvas
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: string,
  strokeColor?: string,
  strokeWidth?: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && strokeWidth) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/**
 * Generates a high-resolution base64 PNG data URL of the premium victory card.
 * Uses native HTML5 Canvas API to draw borders, dual columns, texts, and custom winner + loser avatars.
 */
export async function generateResultCard({
  players,
  rounds,
  dateString
}: GeneratorOptions): Promise<string> {
  const standings = getStandings(players, rounds);
  const winner = standings[0];
  const lastPlayer = standings[standings.length - 1];

  if (!winner || !lastPlayer) {
    throw new Error("No players recorded in match.");
  }

  // Set up 800x1200 canvas optimized for WhatsApp Status (2:3 Aspect ratio)
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Fallback failed: HTML5 Canvas API could not initialize.');
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

  // Load photos in parallel so layout load is swift and robust
  let winnerAvatar: HTMLImageElement | null = null;
  let lastPlayerAvatar: HTMLImageElement | null = null;

  try {
    const promises: Promise<any>[] = [];
    if (winner.avatarUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      promises.push(new Promise<void>((resolve) => {
        img.onload = () => {
          winnerAvatar = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = winner.avatarUrl!;
      }));
    }
    if (lastPlayer.avatarUrl && lastPlayer.id !== winner.id) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      promises.push(new Promise<void>((resolve) => {
        img.onload = () => {
          lastPlayerAvatar = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = lastPlayer.avatarUrl!;
      }));
    }
    if (promises.length > 0) {
      // Allow up to 3.5s to let avatars fetch safely before rendering fallback
      await Promise.race([
        Promise.all(promises),
        new Promise((resolve) => setTimeout(resolve, 3500))
      ]);
    }
  } catch (e) {
    console.warn("Avatar pipeline bypass:", e);
  }

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
  ctx.fillText("🔥 AGNIBINA SANGHA 🔥", canvas.width / 2, 120);

  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 13px "Inter", monospace';
  ctx.fillText("ESTABLISHED CLUB • 1947", canvas.width / 2, 145);

  // Gradient line separator
  const lineGrad = ctx.createLinearGradient(160, 0, canvas.width - 160, 0);
  lineGrad.addColorStop(0, 'rgba(220,174,68,0)');
  lineGrad.addColorStop(0.5, 'rgba(220,174,68,0.3)');
  lineGrad.addColorStop(1, 'rgba(220,174,68,0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 168);
  ctx.lineTo(canvas.width - 160, 168);
  ctx.stroke();

  // 7. Large Bengali Card Heading: "তাসের জনক"
  const textGrad = ctx.createLinearGradient(0, 180, 0, 245);
  textGrad.addColorStop(0, '#f3e1c6');
  textGrad.addColorStop(1, '#bfa175');
  ctx.fillStyle = textGrad;
  ctx.font = '900 48px "Inter", "Georgia", sans-serif';
  ctx.shadowColor = 'rgba(220,174,68,0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillText("তাসের জনক", canvas.width / 2, 218);
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = 'rgba(220,174,68,0.7)';
  ctx.font = 'bold 12px "Inter", monospace';
  ctx.fillText("♠♣ BRAY CHAMPIONSHIP BANTER CARD ♣♦", canvas.width / 2, 245);


  // 8. DUAL COLS LAYOUT (Winner vs Troll "তাসের জনক")
  // Both cards bounds layout: Y: 265, Height: 375
  const cardY = 265;
  const cardH = 375;
  const cardW = 310;
  
  // LEFT COLUMN: Winner
  const winX = 230; // Center coordinate of Winner section
  const winLeft = 75;
  drawRoundedRect(ctx, winLeft, cardY, cardW, cardH, 12, '#110f0c', '#dcae44', 2);
  
  // Right Column: Loser ("তাসের জনক")
  const loseX = 570; // Center coordinate of Loser section
  const loseLeft = 415;
  // Deep reddish-tinged grey border background for a funny look
  drawRoundedRect(ctx, loseLeft, cardY, cardW, cardH, 12, '#15100c', '#b33a24', 2);

  // --- DRAW WINNER PILE (LEFT) ---
  const winAvY = 365;
  const avR = 56;

  // Gold ring design
  ctx.strokeStyle = '#dcae44';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(winX, winAvY, avR, 0, Math.PI * 2);
  ctx.stroke();

  if (winnerAvatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(winX, winAvY, avR - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(winnerAvatar, winX - avR, winAvY - avR, avR * 2, avR * 2);
    ctx.restore();
  } else {
    // Elegant Initial
    ctx.fillStyle = '#221e17';
    ctx.beginPath();
    ctx.arc(winX, winAvY, avR - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dcae44';
    ctx.font = '900 46px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(winner.name.trim().charAt(0).toUpperCase(), winX, winAvY);
    ctx.textBaseline = 'alphabetic'; // Restore standard
  }

  // Champion Gold Ribbon overlapping
  const winBarW = 160;
  const winBarH = 26;
  ctx.fillStyle = '#dcae44';
  ctx.fillRect(winX - winBarW / 2, winAvY + avR + 10, winBarW, winBarH);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(winX - winBarW / 2, winAvY + avR + 10, winBarW, winBarH);

  ctx.fillStyle = '#0a0907';
  ctx.font = '900 11px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("🏆 CLUB CHAMPION", winX, winAvY + avR + 27);

  // Winner Details
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px "Inter", sans-serif';
  ctx.fillText(winner.name, winX, winAvY + avR + 68);

  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`NICKNAME: "${winner.nickname || 'Champ'}"`, winX, winAvY + avR + 88);

  ctx.fillStyle = '#dcae44';
  ctx.font = '900 26px monospace';
  ctx.fillText(`${winner.total} PTS`, winX, winAvY + avR + 124);
  ctx.fillStyle = 'rgba(220,174,68,0.5)';
  ctx.font = 'bold 9px monospace';
  ctx.fillText("LOWEST TOTAL (WINNER)", winX, winAvY + avR + 140);


  // --- DRAW TROLL "তাসের জনক" PILE (RIGHT) ---
  const loseAvY = 365;

  // Funny red ring design
  ctx.strokeStyle = '#b33a24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(loseX, loseAvY, avR, 0, Math.PI * 2);
  ctx.stroke();

  if (lastPlayerAvatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(loseX, loseAvY, avR - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(lastPlayerAvatar, loseX - avR, loseAvY - avR, avR * 2, avR * 2);
    ctx.restore();
  } else {
    // Reddish placeholder initials
    ctx.fillStyle = '#2c1613';
    ctx.beginPath();
    ctx.arc(loseX, loseAvY, avR - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b33a24';
    ctx.font = '900 46px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lastPlayer.name.trim().charAt(0).toUpperCase(), loseX, loseAvY);
    ctx.textBaseline = 'alphabetic'; // Restore standard
  }

  // Humorous Red/Amber Ribbon overlapping
  ctx.fillStyle = '#b33a24';
  ctx.fillRect(loseX - winBarW / 2, loseAvY + avR + 10, winBarW, winBarH);
  ctx.strokeStyle = '#f3e1c6';
  ctx.lineWidth = 1;
  ctx.strokeRect(loseX - winBarW / 2, loseAvY + avR + 10, winBarW, winBarH);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("आजকের তাসের জনক 👑", loseX, loseAvY + avR + 27);

  // Loser Details
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px "Inter", sans-serif';
  ctx.fillText(lastPlayer.name, loseX, loseAvY + avR + 68);

  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`NICKNAME: "${lastPlayer.nickname || 'Father of Cards'}"`, loseX, loseAvY + avR + 88);

  ctx.fillStyle = '#b33a24';
  ctx.font = '900 26px monospace';
  ctx.fillText(`${lastPlayer.total} PTS`, loseX, loseAvY + avR + 124);
  ctx.fillStyle = 'rgba(179,58,36,0.6)';
  ctx.font = 'bold 9px monospace';
  ctx.fillText("HIGHEST TOTAL (LOSER)", loseX, loseAvY + avR + 140);


  // 9. Competitor Rankings List
  ctx.fillStyle = '#8e8271';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("SANGHA LEDGER COMPETITOR PLACEMENTS", 110, 680);
  
  ctx.textAlign = 'right';
  ctx.fillText("TOTAL", canvas.width - 110, 680);

  ctx.strokeStyle = 'rgba(220,174,68,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(110, 690);
  ctx.lineTo(canvas.width - 110, 690);
  ctx.stroke();

  let rowY = 705;
  rankedStandings.slice(0, 4).forEach((item, index) => {
    const isThisLast = item.id === lastPlayer.id;
    ctx.fillStyle = index === 0 
      ? 'rgba(220,174,68,0.06)' 
      : isThisLast 
        ? 'rgba(179,58,36,0.04)' 
        : 'rgba(255,255,255,0.02)';
    ctx.fillRect(110, rowY, canvas.width - 220, 42);

    ctx.strokeStyle = index === 0 
      ? 'rgba(220,174,68,0.25)' 
      : isThisLast 
        ? 'rgba(179,58,36,0.25)' 
        : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(110, rowY, canvas.width - 220, 42);

    // Draw Rank
    ctx.fillStyle = index === 0 ? '#dcae44' : isThisLast ? '#b33a24' : '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(item.rank), 140, rowY + 26);

    // Draw Name
    ctx.fillStyle = index === 0 ? '#dcae44' : isThisLast ? '#e96d55' : '#ffffff';
    ctx.font = 'bold 15px "Inter", sans-serif';
    ctx.fillText(item.name, 175, rowY + 26);

    // Rank role label placement
    ctx.fillStyle = index === 0 ? '#dcae44' : isThisLast ? '#e96d55' : '#8e8271';
    ctx.font = '9.5px monospace';
    ctx.fillText(getRankRoleLabel(item.rank, isThisLast), 360, rowY + 26);

    // Score placement info
    ctx.fillStyle = index === 0 ? '#dcae44' : isThisLast ? '#e96d55' : '#ffffff';
    ctx.font = '900 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${item.total} pts`, canvas.width - 140, rowY + 26);

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
