import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Key, RotateCcw, Trash2, UserX, LogOut, CheckCircle, AlertCircle, Unlock, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, SavedGame } from '../types';

interface AdminPanelProps {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  onResetActiveGameTable: () => void;
  onClearAllGameHistory: () => void;
  onResetAllClubhouseData: () => void;
  savedPlayers: Player[];
  games: SavedGame[];
}

export default function AdminPanel({
  isAdmin,
  setIsAdmin,
  onResetActiveGameTable,
  onClearAllGameHistory,
  onResetAllClubhouseData,
  savedPlayers,
  games
}: AdminPanelProps) {
  const DEFAULT_PIN = '7908'; // New secure admin numeric PIN
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Dangerous action modal confirms
  const [showDeleteHistoryConfirm, setShowDeleteHistoryConfirm] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);
  const [showResetCurrentConfirm, setShowResetCurrentConfirm] = useState(false);

  // Keypad key handler
  const handleKeyPress = (num: string) => {
    setPinError('');
    if (pinInput.length < 4) {
      setPinInput(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPinError('');
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPinError('');
    setPinInput('');
  };

  // Keyboard support for entry
  useEffect(() => {
    if (isAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pinInput, isAdmin]);

  // Auto-verify PIN when 4 characters are entered
  useEffect(() => {
    if (pinInput.length === 4) {
      if (pinInput === DEFAULT_PIN) {
        setIsAdmin(true);
        setPinError('');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        setPinError('Incorrect Clubhouse Administrative PIN');
        setPinInput('');
        // Trigger a slight shake animation using ref or class if wanted
      }
    }
  }, [pinInput]);

  return (
    <div className="space-y-8" id="admin-panel-root">
      
      {/* Dynamic Notifications */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#162a1a] border border-emerald-800 text-emerald-400 px-6 py-3 shadow-2xl flex items-center gap-3 font-mono text-xs uppercase"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Clubhouse Admin Session Established • Access Verified</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="bg-editorial-dark border border-editorial-border p-6 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="admin-banner">
        <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-700" />
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.25em] font-black text-editorial-gold font-mono block">Secured Operations Center</span>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none flex items-center gap-2">
            Agnibina Command Core
          </h2>
          <p className="text-xs text-editorial-muted">
            Establish administrative oversight to lock standings, protect membership accounts, or clean ledger records.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setIsAdmin(false);
              setPinInput('');
              setPinError('');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-[#1a1815] text-red-400 hover:text-red-300 border border-neutral-800 hover:border-red-950 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer rounded-none"
            id="admin-logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" /> Revoke Admin Access
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isAdmin ? (
          /* SECTION A: AUTHENTICATION LOCKPAD */
          <motion.div
            key="lock-shield"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-md mx-auto bg-editorial-dark border border-editorial-border p-8 text-center space-y-6 relative"
            id="pin-keypad-envelope"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 border border-neutral-800 text-editorial-gold rounded-none mb-2">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#ece5d8]">ADMIN AUTHORIZATION</h3>
              <p className="text-xs text-editorial-muted max-w-xs mx-auto">
                Agnibina Clubhouse security protocols require a PIN to verify administrator authority.
              </p>
            </div>

            {/* Hidden hint but premium look */}
            <div className="bg-[#12110e] border border-neutral-800/60 p-2.5 text-[9px] font-mono text-editorial-gold/80 uppercase tracking-widest max-w-xs mx-auto">
              🔑 Admin passcode setup completed. (Passcode: {DEFAULT_PIN})
            </div>

            {/* Input PIN Display dots */}
            <div className="flex justify-center items-center gap-4 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4.5 h-4.5 border transition-all duration-300 flex items-center justify-center ${
                    pinInput.length > idx
                      ? 'bg-editorial-gold border-editorial-gold scale-110 shadow-lg shadow-editorial-gold/10'
                      : 'border-editorial-border bg-neutral-950'
                  }`}
                >
                  {pinInput.length > idx && (
                    <span className="w-1.5 h-1.5 bg-black rounded-full" />
                  )}
                </div>
              ))}
            </div>

            {pinError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-mono text-red-500 bg-red-950/15 border border-red-950/50 py-2 px-3 flex items-center justify-center gap-1.5"
                id="pin-error-container"
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{pinError}</span>
              </motion.div>
            )}

            {/* Numeric Screen Keypad Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pt-2" id="keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  disabled={pinInput.length >= 4}
                  className="h-14 bg-neutral-950 hover:bg-[#12110e] active:bg-[#1d1a15] border border-editorial-border hover:border-editorial-gold/30 text-lg font-mono font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="h-14 bg-neutral-950/40 hover:bg-red-950/20 active:bg-red-950/40 border border-editorial-border/40 text-[10px] font-mono uppercase tracking-widest text-[#8e8271] hover:text-red-400 transition-all flex items-center justify-center cursor-pointer select-none"
              >
                Clear
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                disabled={pinInput.length >= 4}
                className="h-14 bg-neutral-950 hover:bg-[#12110e] active:bg-[#1d1a15] border border-editorial-border hover:border-editorial-gold/30 text-lg font-mono font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer select-none"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="h-14 bg-neutral-950/40 hover:bg-[#12110e] active:bg-[#1a1815] border border-editorial-border/40 text-xs font-mono font-bold text-[#8e8271] hover:text-white transition-all flex items-center justify-center cursor-pointer select-none"
              >
                ⌫
              </button>
            </div>
          </motion.div>
        ) : (
          /* SECTION B: LOGGED IN SECURED ACTIONS */
          <motion.div
            key="operations-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Status indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-stats-grid">
              <div className="bg-editorial-dark border border-editorial-border p-5 relative">
                <span className="text-[8px] font-mono uppercase tracking-widest text-editorial-muted">Club Registry</span>
                <div className="text-2xl font-black font-mono text-white mt-1.5">{savedPlayers.length} Members</div>
                <div className="text-[10px] font-serif text-editorial-muted italic mt-1">Management options unlocked in "Club Directory" tab.</div>
              </div>
              <div className="bg-editorial-dark border border-editorial-border p-5 relative">
                <span className="text-[8px] font-mono uppercase tracking-widest text-editorial-muted">Archived games</span>
                <div className="text-2xl font-black font-mono text-editorial-gold mt-1.5">{games.length} Saved Matches</div>
                <div className="text-[10px] font-serif text-editorial-muted italic mt-1">Deletion tools unlocked in "Club Archives" tab.</div>
              </div>
              <div className="bg-editorial-dark border border-editorial-border p-5 relative">
                <span className="text-[8px] font-mono uppercase tracking-widest text-editorial-muted">Authority level</span>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5" /> ROOT SECURE
                </div>
                <div className="text-[10px] font-serif text-editorial-muted italic mt-1">Credentials verified dynamically via localized handshake.</div>
              </div>
            </div>

            {/* Quick Helper Notice */}
            <div className="bg-[#1a1c1d] border border-sky-900/40 p-5 flex items-start gap-4">
              <div className="w-9 h-9 bg-[#111c21] border border-sky-950 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                <Unlock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs uppercase font-black tracking-widest text-sky-300 font-mono">Dynamic Oversight System Active</h4>
                <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                  The entire Agnibina Clubhouse system is now operating in **Administrative Mode**. Actions requiring credentials have been unlocked across respective tabs. You can customize player portraits, modify member IDs, add or remove registry portraits under the <strong>Club Directory</strong> tab, or delete single match journals under the <strong>Agnibina Archive Records</strong> tab.
                </p>
              </div>
            </div>

            {/* Core Dangerous Actions Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="actions-bento-panels">
              
              {/* Reset Tables Panel */}
              <div className="bg-editorial-dark border border-editorial-border p-6 space-y-4">
                <div className="space-y-1 border-b border-editorial-border/40 pb-3">
                  <span className="text-[9px] uppercase tracking-wider text-editorial-gold font-mono block">Reset Tally Toggles</span>
                  <h4 className="text-md font-bold uppercase tracking-tight text-white">Match Active Table Reset</h4>
                  <p className="text-[10px] text-[#8e8271]">
                    Terminate the current ongoing tournament, wiping player scores of active seats and returning the clubhouse table to setup stage.
                  </p>
                </div>
                
                <button
                  onClick={() => setShowResetCurrentConfirm(true)}
                  className="w-full py-3 bg-red-950/20 hover:bg-neutral-900 text-red-400 border border-red-950/40 hover:border-red-500/40 text-[10px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer"
                  id="admin-reset-table-btn"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" /> Reset Current Card Table
                </button>
              </div>

              {/* Game History Ledger Wipe */}
              <div className="bg-editorial-dark border border-editorial-border p-6 space-y-4">
                <div className="space-y-1 border-b border-editorial-border/40 pb-3">
                  <span className="text-[9px] uppercase tracking-wider text-red-400 font-mono block">Purge Archives</span>
                  <h4 className="text-md font-bold uppercase tracking-tight text-white">Wipe Match Archives</h4>
                  <p className="text-[10px] text-[#8e8271]">
                    Permanently delete all historic tournament logs. Clear tournament points records of all matches won.
                  </p>
                </div>

                <button
                  onClick={() => setShowDeleteHistoryConfirm(true)}
                  className="w-full py-3 bg-red-950/30 hover:bg-red-950 text-red-300 border border-red-900 hover:border-red-500 text-[10px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer"
                  id="admin-clear-history-btn"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1.5" /> Purge Past Game History
                </button>
              </div>

              {/* Master System Reset Card */}
              <div className="md:col-span-2 bg-[#1c0d0c]/35 border border-red-950 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black uppercase tracking-tight text-red-400 font-mono">Master Clubhouse Database Reset</h4>
                  <p className="text-[10px] text-[#b8a098] max-w-xl leading-relaxed">
                    Instantly wipes all databases back to factory defaults. This clear-out deletes all active card game scores, wipes out all saved Agnibina match history logs, and restores default registered test members (Ashu, Sanju, Nobi, and Amits).
                  </p>
                </div>
                
                <button
                  onClick={() => setShowResetAllConfirm(true)}
                  className="px-6 py-4 bg-red-950/80 hover:bg-red-900 hover:text-white text-red-200 border border-red-800 font-mono font-black uppercase tracking-widest text-[10px] cursor-pointer whitespace-nowrap active:scale-98"
                  id="admin-factory-reset-btn"
                >
                  ⚠️ Reset All Clubhouse Data
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CONFIRMATION MODALS --- */}

      {/* Delete Game History Confirm Modal */}
      <AnimatePresence>
        {showDeleteHistoryConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-red-950/70 p-8 max-w-md w-full space-y-6 shadow-2xl relative"
              id="confirm-purge-history"
            >
              <div className="flex flex-col gap-2">
                <span className="text-[10px] tracking-[0.25em] font-black text-rose-500 uppercase block font-mono">CRITICAL ACTION REQUIRED</span>
                <h4 className="text-2xl font-black uppercase tracking-tight text-white">
                  Purge Game Archives?
                </h4>
              </div>

              <div className="text-xs text-[#d1b0a8] font-medium leading-relaxed font-sans bg-[#1a0c0a]/50 p-4 border border-red-950">
                This will permanently delete all game history. Continue?
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowDeleteHistoryConfirm(false)}
                  className="flex-1 py-3 bg-transparent hover:bg-neutral-900 border border-[#2a2620] text-xs uppercase tracking-widest font-black text-[#8e8271] hover:text-white transition-colors cursor-pointer"
                  id="abort-purge-history-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearAllGameHistory();
                    setShowDeleteHistoryConfirm(false);
                    // Open a small overlay or let user know
                  }}
                  className="flex-1 py-3 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-900 rounded-none text-xs uppercase tracking-widest font-black transition-colors cursor-pointer"
                  id="commit-purge-history-btn"
                >
                  Purge Logs
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Master Reset All Confirm Modal */}
      <AnimatePresence>
        {showResetAllConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-red-950/70 p-8 max-w-md w-full space-y-6 shadow-2xl relative"
              id="confirm-master-reset"
            >
              <div className="flex flex-col gap-2">
                <span className="text-[10px] tracking-[0.25em] font-black text-rose-500 uppercase block font-mono">WARNING: MASTER RESET</span>
                <h4 className="text-2xl font-black uppercase tracking-tight text-white">
                  Wipe Back To Factory?
                </h4>
              </div>

              <div className="text-xs text-[#d1b0a8] font-medium leading-relaxed font-sans bg-[#1a0c0a]/50 p-4 border border-red-950">
                This will permanently delete all game history. Continue?
              </div>

              <p className="text-[10px] text-editorial-muted font-mono leading-relaxed uppercase">
                ⚠️ All registry portraits, nickname links, scoreboard sessions, and the currently active game table are wiped instantly. Clear cached local storage keys.
              </p>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowResetAllConfirm(false)}
                  className="flex-1 py-3 bg-transparent hover:bg-neutral-900 border border-[#2a2620] text-xs uppercase tracking-widest font-black text-[#8e8271] hover:text-white transition-colors cursor-pointer"
                  id="abort-master-reset"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onResetAllClubhouseData();
                    setShowResetAllConfirm(false);
                    setIsAdmin(false); // Log out of admin panel on hard reset
                  }}
                  className="flex-1 py-3 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-900 rounded-none text-xs uppercase tracking-widest font-black transition-colors cursor-pointer"
                  id="commit-master-reset animate-pulse"
                >
                  Factory Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Current Game Modal */}
      <AnimatePresence>
        {showResetCurrentConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-editorial-dark border border-red-950/70 p-8 max-w-sm w-full space-y-6 shadow-2xl relative"
              id="confirm-reset-current"
            >
              <div className="flex flex-col gap-2">
                <span className="text-[10px] tracking-[0.25em] font-black text-rose-500 uppercase block font-mono">DANGEROUS ACTION</span>
                <h4 className="text-xl font-black uppercase tracking-tight text-white">
                  Reset Current Table?
                </h4>
              </div>

              <p className="text-xs text-editorial-muted leading-relaxed font-sans">
                Are you sure you want to delete the active card table score tallies and seat registration records? Normal users will be redirected back to the setup stage.
              </p>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowResetCurrentConfirm(false)}
                  className="flex-1 py-2.5 bg-transparent border border-editorial-border hover:bg-white/5 font-black uppercase tracking-widest text-[10px] text-editorial-muted hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onResetActiveGameTable();
                    setShowResetCurrentConfirm(false);
                  }}
                  className="flex-1 py-2.5 bg-red-950/30 hover:bg-red-900 text-red-300 hover:text-white border border-red-900 font-black uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
