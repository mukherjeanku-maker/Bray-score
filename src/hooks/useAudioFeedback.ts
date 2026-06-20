import { useCallback, useRef } from 'react';

export function useAudioFeedback() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    // Resume context if suspended (common browser security policy)
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch((err) => {
        console.warn("Failed to resume AudioContext:", err);
      });
    }
    return audioCtxRef.current;
  }, []);

  // Soft upward chime for saving/recording a round
  const playRoundSaved = useCallback(() => {
    // Check if sounds are globally enabled in localStorage (default is enabled)
    const muted = localStorage.getItem('clubhouse_sound_muted') === 'true';
    if (muted) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      // Node 1 (fundamental tone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5 (very pleasant fifth)
      
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Node 2 (harmonizer, delayed slightly for a physical chimes/bell texture)
      const delay = 0.06; // seconds
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + delay); // E5 Major third
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + delay + 0.15); // C6 Octave
      
      gain2.gain.setValueAtTime(0.0, now);
      gain2.gain.setValueAtTime(0.04, now + delay);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + delay + 0.2);

    } catch (error) {
      console.warn("Audio feedback failed:", error);
    }
  }, [getAudioContext]);

  // Descending analog synth-like slide for resetting
  const playResetGame = useCallback(() => {
    const muted = localStorage.getItem('clubhouse_sound_muted') === 'true';
    if (muted) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(110.00, now + 0.45); // A2 (warm downward slide)
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (error) {
      console.warn("Audio feedback failed:", error);
    }
  }, [getAudioContext]);

  return { playRoundSaved, playResetGame };
}
