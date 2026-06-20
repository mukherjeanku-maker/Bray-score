import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, Calendar, Copy, Check, Download, Share2, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { Player, Round } from '../types';
import { generateResultCard } from '../utils/ResultCardGenerator';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  rounds: Round[];
  dateString?: string;
  matchId?: string;
}

export function ShareCardModal({
  isOpen,
  onClose,
  players,
  rounds,
  dateString,
  matchId
}: ShareCardModalProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [standaloneImageSrc, setStandaloneImageSrc] = useState<string | null>(null);

  // 1. Calculate overall score sums (Lowest score wins in Bray!)
  const calculateTotal = (playerId: string) => {
    return rounds.reduce((sum, round) => sum + (round.scores[playerId] || 0), 0);
  };

  const standings = players.map((player) => {
    const total = calculateTotal(player.id);
    return {
      ...player,
      total,
    };
  }).sort((a, b) => a.total - b.total);

  const winner = standings[0];
  const lastPlayer = standings[standings.length - 1];
  const isTied = standings.length > 1 && standings[0].total === standings[1].total;

  const displayDate = dateString || new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const rankedStandings = standings.map((item, idx, arr) => {
    let rank = idx + 1;
    if (idx > 0 && item.total === arr[idx - 1].total) {
      rank = idx;
    }
    return {
      ...item,
      rank
    };
  });

  // Trigger our centralized Canvas generator when modal is shown/rendered
  useEffect(() => {
    if (isOpen) {
      setGenerating(true);
      setErrorMessage('');
      generateResultCard({ players, rounds, dateString })
        .then((imgDataUrl) => {
          setStandaloneImageSrc(imgDataUrl);
        })
        .catch((err: any) => {
          console.error("Canvas compilation error: ", err);
          setErrorMessage('Could not draw the premium digital certificate. Please close and re-open to trigger canvas generation.');
        })
        .finally(() => {
          setGenerating(false);
        });
    } else {
      setStandaloneImageSrc(null);
    }
  }, [isOpen, players, rounds, dateString]);

  if (!isOpen) return null;

  // Copy textual synopsis as fallback
  const handleCopyText = () => {
    const title = `🔥 AGNIBINA SANGHA (Est. 1947) 🔥\n🏆 CHAMPION: ${winner?.name || 'Unknown'} (${winner?.total || 0} pts)\n`;
    const trollTitle = `👑 আজকের তাসের জনক 🤣: ${lastPlayer?.name || 'Unknown'} (${lastPlayer?.total || 0} pts)\n\n`;
    const gameInfo = `📅 ${displayDate}\n🏟️ Rounds: ${rounds.length} played\n-----------------------------\n`;
    
    let standingsText = `📊 BRAY STANDINGS LEDGER:\n`;
    rankedStandings.forEach((p, idx) => {
      const isThisLast = p.id === lastPlayer?.id;
      let roleSymbol = `${idx + 1}. `;
      if (idx === 0) {
        roleSymbol = `🏆 [CHAMPION] `;
      } else if (isThisLast) {
        roleSymbol = `🤣 [তাসের জনক] `;
      }
      
      const suffix = idx === 0 && isTied ? ' (Tied)' : '';
      standingsText += `${roleSymbol}${p.name} • ${p.total} pts${suffix}\n`;
    });

    const footer = `\n💬 Friendly club banter from Agnibina Sangha Bray Tracker!`;
    const combined = title + trollTitle + gameInfo + standingsText + footer;

    navigator.clipboard.writeText(combined).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setErrorMessage('Clipboard action failed. Standalone image is still available.');
    });
  };

  // Direct save using HTML5 browser pipeline
  const handleDownloadImage = () => {
    if (!standaloneImageSrc) return;
    setDownloading(true);
    try {
      const link = document.createElement('a');
      link.download = `agnibina_bray_result_${Date.now()}.png`;
      link.href = standaloneImageSrc;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Direct browser sandbox download blocked. Please use Tap and Hold (long press) on the image to save natively, or use Open Image in New Tab.');
    } finally {
      setDownloading(false);
    }
  };

  // Open in a standalone clean tab to completely bypass sandbox container constraints
  const handleOpenNewTab = () => {
    if (!standaloneImageSrc) return;
    try {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(`
          <html style="background:#0a0907; margin:0; padding:0; display:flex; justify-content:center; align-items:center; min-height:100vh;">
            <head>
              <title>Agnibina Sangha Club Champion Card</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0; padding:16px;">
              <img src="${standaloneImageSrc}" style="max-width:100%; height:auto; border: 4px solid #1b1712; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" alt="Agnibina Champion"/>
              <p style="color:#8e8271; font-family:monospace; text-align:center; margin-top:12px; font-size:12px;">Tap & Hold or Right-Click to save this card to your device</p>
            </body>
          </html>
        `);
      } else {
        throw new Error('Popup blocked');
      }
    } catch (err) {
      setErrorMessage("Popup blocked! To view image independently, please long-press the certificate directly inside this modal to copy/save.");
    }
  };

  // Native mobile sharing API integration
  const handleShareSystemImage = async () => {
    if (!standaloneImageSrc) return;
    setSharing(true);
    setErrorMessage('');
    
    try {
      // Convert base64 data to native binary blob
      const res = await fetch(standaloneImageSrc);
      const blob = await res.blob();
      const file = new File([blob], `agnibina_bray_result_${Date.now()}.png`, { type: 'image/png' });

      // Check support for file sharing
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Agnibina Sangha Match Result',
          text: `🏆 Champion: ${winner?.name} (${winner?.total} pts) • আজকের 🤣 "তাসের জনক" 👑: ${lastPlayer?.name} (${lastPlayer?.total} pts)`,
        });
      } else if (navigator.share) {
        // Share text if file is not supported
        await navigator.share({
          title: '🔥 Agnibina Sangha Match Result 🔥',
          text: `🏆 Winner: ${winner?.name} compiled ${winner?.total} pts! আজকের 🤣 "তাসের জনক" 👑 (Highest score): ${lastPlayer?.name} (${lastPlayer?.total} pts) inside Agnibina Sangha. Tracked via Bray Score Tracker.`,
        });
      } else {
        throw new Error('Web Share API unsupported');
      }
    } catch (err: any) {
      console.warn("Direct sharing declined or unsupported.", err);
      if (err.name !== 'AbortError') {
        setErrorMessage('This browser does not support raw image stream sharing. Please save the image to your device and share on WhatsApp directly!');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
      <div className="max-w-4xl w-full flex flex-col md:flex-row gap-6 my-4 select-none" id="share-card-container">
        
        {/* LEFT COLUMN: THE PREMIUM PHYSICAL CARD FOR SCREENSHOT / RENDER */}
        <div className="flex-1 flex justify-center items-center">
          
          {generating ? (
            <div className="w-full max-w-[420px] aspect-[2/3] min-h-[480px] bg-[#0a0907] border-4 border-[#1b1712] flex flex-col justify-center items-center text-center space-y-4 p-6" id="card-generating-overlay">
              <Flame className="w-12 h-12 text-[#dcae44] fill-[#dcae44] animate-bounce" />
              <div className="space-y-1">
                <span className="text-[10px] tracking-[0.25em] font-black uppercase text-editorial-gold font-mono block">FORGING IMMERSIVE GRAPHICS</span>
                <p className="text-xs text-editorial-muted">Aligning double borders, custom vector weights & gold seals...</p>
              </div>
            </div>
          ) : standaloneImageSrc ? (
            <div className="w-full max-w-[420px] relative group" id="compiled-card-wrapper">
              <img 
                src={standaloneImageSrc} 
                alt="Agnibina Sangha Match Result Card" 
                className="w-full h-auto border-4 border-[#191510] shadow-2xl brightness-105 active:scale-[0.99] transition-transform duration-200"
              />
              <div className="absolute top-3 right-3 bg-black/85 border border-[#dcae44]/30 px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-editorial-gold backdrop-blur-sm select-none">
                Standalone PNG Certificate
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[420px] aspect-[2/3] bg-[#0a0907] border-4 border-red-950/40 flex flex-col justify-center items-center text-center p-6 text-red-400">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#8e8271]">System Render Failure</span>
              <p className="text-xs font-sans text-red-300/80 mt-1">{errorMessage || "Visual generation was blocked."}</p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: ACTION CONTROLS & HOW TO SHARE */}
        <div className="w-full md:w-80 flex flex-col justify-between bg-[#111111] border border-editorial-border p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.25em] text-editorial-gold font-mono block">Certificate Hub</span>
                <h3 className="text-xl font-black uppercase text-white tracking-tight">Share Your Victory</h3>
                <p className="text-xs text-editorial-muted">
                  Agnibina Clubhouse pre-rendered your victory card as a standalone image, ideal for WhatsApp Status or groups.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-none border border-editorial-border hover:border-white/50 text-editorial-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                id="close-share-hub-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0b0a08] border border-editorial-gold/15 p-4 rounded-none space-y-2">
              <h4 className="text-[10px] uppercase font-black text-editorial-gold font-mono tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> High-Resolution standalone Artwork
              </h4>
              <p className="text-[11px] text-[#8e8271] leading-relaxed">
                If direct download buttons are sandboxed by your browser, simply <span className="text-editorial-gold font-bold">Tap & Hold (Long Press) the image</span> on the left to copy or save directly onto your phone natively.
              </p>
            </div>

            {errorMessage && (
              <div className="bg-amber-950/15 border border-amber-900/30 p-3 flex gap-2 items-start" id="share-error-log">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-amber-200 leading-normal font-sans font-medium">{errorMessage}</p>
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-4 border-t border-editorial-border/50">
            {/* Device-Level native system share API */}
            <button
              onClick={handleShareSystemImage}
              disabled={generating || !standaloneImageSrc}
              className="w-full py-3 bg-editorial-gold hover:bg-amber-400 text-black text-[10.5px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-none shadow-md disabled:bg-neutral-800 disabled:text-neutral-600"
              id="native-browser-share-btn"
            >
              <Share2 className="w-3.5 h-3.5" />
              {sharing ? 'Activating Device Share...' : 'Device Share / Send Image'}
            </button>

            {/* Direct download browser link */}
            <button
              onClick={handleDownloadImage}
              disabled={generating || !standaloneImageSrc}
              className="w-full py-3 bg-[#1c1914] hover:bg-[#2e261b] text-editorial-gold border border-editorial-gold/30 hover:border-editorial-gold/60 text-[10.5px] font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-none disabled:bg-neutral-800 disabled:border-transparent disabled:text-neutral-600"
              id="download-png-btn"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Exporting File...' : 'Download Standalone Card'}
            </button>

            {/* Standalone New Tab Open (The ultimate fail-safe for iframe sandboxes) */}
            <button
              onClick={handleOpenNewTab}
              disabled={generating || !standaloneImageSrc}
              className="w-full py-2.5 bg-transparent hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-[10px] font-mono uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-none"
              id="open-tab-btn"
            >
              <ExternalLink className="w-3 h-3 text-editorial-gold" />
              Open Card In Clean Tab
            </button>

            {/* Copy neat text synopsis */}
            <button
              onClick={handleCopyText}
              className="w-full py-2.5 bg-transparent hover:bg-neutral-900 text-neutral-400 border border-neutral-800 text-[10px] font-mono uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-none"
              id="copy-whatsapp-text-btn"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied Synopsis!' : 'Copy Text Synopsis'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
