import { WordTimestamp } from './types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSFX(type: 'pop' | 'whoosh' | 'ding' | 'step' | 'buzzer') {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'pop': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      case 'whoosh': {
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.21);
        break;
      }

      case 'ding': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1760, now + 0.04);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
        break;
      }

      case 'step': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }

      case 'buzzer': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }
    }
  } catch {
    // Ignore audio errors if browser blocks autoplay
  }
}

export function calculateWordTimestamps(
  text: string,
  totalDurationSec: number,
  startOffsetSec: number = 0
): WordTimestamp[] {
  const cleanWords = text.trim().split(/\s+/).filter(Boolean);
  if (cleanWords.length === 0) return [];

  const weights = cleanWords.map((w) => Math.max(2, w.length));
  const totalWeight = weights.reduce((acc, v) => acc + v, 0);

  const words: WordTimestamp[] = [];
  let currentStart = startOffsetSec;

  for (let i = 0; i < cleanWords.length; i++) {
    const wordDuration = (weights[i] / totalWeight) * totalDurationSec;
    words.push({
      word: cleanWords[i],
      start: Number(currentStart.toFixed(2)),
      end: Number((currentStart + wordDuration).toFixed(2)),
    });
    currentStart += wordDuration;
  }

  return words;
}

export function speakVoiceover(
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    onWord?: (word: string, charIndex: number) => void;
    onEnd?: () => void;
  } = {}
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    options.onEnd?.();
    return () => {};
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate || 1.05;
  utterance.pitch = options.pitch || 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onboundary = (e) => {
    if (e.name === 'word') {
      const spokenWord = text.substring(e.charIndex, e.charIndex + (e.charLength || 5));
      options.onWord?.(spokenWord, e.charIndex);
    }
  };

  utterance.onend = () => {
    options.onEnd?.();
  };

  utterance.onerror = () => {
    options.onEnd?.();
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}
