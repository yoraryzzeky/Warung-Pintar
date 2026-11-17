import type { PaymentMethodType } from './storeLogic';

export type SoundKind = 'click' | 'success' | 'tunai' | 'qris' | 'kasbon';
export type CheckoutSoundKind = 'tunai' | 'qris' | 'kasbon';

export interface SoundToneStep {
  freq: number;
  delaySec: number;
  durationSec: number;
  wave: OscillatorType;
  volume: number;
}

const SOUND_PATTERNS: Record<SoundKind, readonly SoundToneStep[]> = {
  click: [
    { freq: 800, delaySec: 0, durationSec: 0.08, wave: 'sine', volume: 0.08 },
  ],
  success: [
    { freq: 523.25, delaySec: 0, durationSec: 0.12, wave: 'triangle', volume: 0.12 },
    { freq: 659.25, delaySec: 0.08, durationSec: 0.18, wave: 'triangle', volume: 0.12 },
  ],
  // Tunai: Efek bel laci kasir klasik "Cha-Ching!" (2 nada tinggi tajam & berdering)
  tunai: [
    { freq: 987.77, delaySec: 0, durationSec: 0.11, wave: 'triangle', volume: 0.16 },
    { freq: 1318.51, delaySec: 0.085, durationSec: 0.28, wave: 'triangle', volume: 0.18 },
    { freq: 2637.02, delaySec: 0.085, durationSec: 0.24, wave: 'sine', volume: 0.07 },
  ],
  // QRIS: Melodi digital naik 4 nada halus khas dompet digital "tu-du-du-ding!"
  qris: [
    { freq: 587.33, delaySec: 0, durationSec: 0.09, wave: 'sine', volume: 0.14 },
    { freq: 783.99, delaySec: 0.075, durationSec: 0.09, wave: 'sine', volume: 0.14 },
    { freq: 1046.5, delaySec: 0.15, durationSec: 0.11, wave: 'sine', volume: 0.15 },
    { freq: 1567.98, delaySec: 0.23, durationSec: 0.3, wave: 'sine', volume: 0.16 },
  ],
  // Kasbon: 2 nada turun lembut sebagai penanda pencatatan piutang
  kasbon: [
    { freq: 440, delaySec: 0, durationSec: 0.12, wave: 'triangle', volume: 0.13 },
    { freq: 392, delaySec: 0.12, durationSec: 0.22, wave: 'triangle', volume: 0.12 },
  ],
};

export function getSoundPattern(kind: SoundKind): readonly SoundToneStep[] {
  return SOUND_PATTERNS[kind] || SOUND_PATTERNS.click;
}

export function getCheckoutSoundKind(
  paymentMethod: PaymentMethodType,
  status?: 'LUNAS' | 'MENUNGGU'
): CheckoutSoundKind {
  if (paymentMethod === 'KASBON' || status === 'MENUNGGU') {
    return 'kasbon';
  }
  if (paymentMethod === 'QRIS') {
    return 'qris';
  }
  return 'tunai';
}

export function getCheckoutSoundLabel(kind: CheckoutSoundKind): string {
  switch (kind) {
    case 'qris':
      return 'Nada QRIS (Non-Tunai)';
    case 'kasbon':
      return 'Nada Kasbon';
    default:
      return 'Nada Tunai (Cha-Ching)';
  }
}

let sharedAudioCtx: AudioContext | null = null;

function getDefaultAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
}

export function playSoundEffect(
  kind: SoundKind = 'click',
  enabled: boolean = true,
  ctxOverride?: AudioContext | null
): boolean {
  if (!enabled) return false;
  try {
    const ctx = ctxOverride !== undefined ? ctxOverride : getDefaultAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }

    const pattern = getSoundPattern(kind);
    const baseTime = ctx.currentTime;

    pattern.forEach((step) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = step.wave;
      osc.frequency.setValueAtTime(step.freq, baseTime + step.delaySec);

      const start = baseTime + step.delaySec;
      const end = start + step.durationSec;

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(step.volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.01);
    });

    return true;
  } catch {
    return false;
  }
}
