import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSoundPattern,
  getCheckoutSoundKind,
  getCheckoutSoundLabel,
  playSoundEffect,
} from './soundEffects';

test('getSoundPattern provides distinct acoustic signatures for tunai and qris', () => {
  const tunai = getSoundPattern('tunai');
  const qris = getSoundPattern('qris');
  const kasbon = getSoundPattern('kasbon');

  assert.notDeepEqual(tunai, qris);
  assert.notEqual(tunai.length, qris.length);
  assert.equal(tunai[0].wave, 'triangle');
  assert.equal(qris[0].wave, 'sine');
  assert.ok(qris.every((s) => s.freq > 0 && s.durationSec > 0));
  assert.ok(kasbon.length >= 2);
});

test('getCheckoutSoundKind maps Tunai, QRIS, and Kasbon transaction outcomes accurately', () => {
  assert.equal(getCheckoutSoundKind('TUNAI', 'LUNAS'), 'tunai');
  assert.equal(getCheckoutSoundKind('QRIS', 'LUNAS'), 'qris');
  assert.equal(getCheckoutSoundKind('KASBON', 'MENUNGGU'), 'kasbon');
  assert.equal(getCheckoutSoundKind('TUNAI', 'MENUNGGU'), 'kasbon');
  assert.match(getCheckoutSoundLabel('qris'), /QRIS/);
  assert.match(getCheckoutSoundLabel('tunai'), /Tunai/i);
});

test('playSoundEffect skips audio when muted and schedules pattern oscillators when enabled', () => {
  let createdOscillators = 0;
  const mockCtx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: async () => {},
    createOscillator: () => {
      createdOscillators += 1;
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    },
    createGain: () => ({
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    }),
  } as unknown as AudioContext;

  const mutedResult = playSoundEffect('qris', false, mockCtx);
  assert.equal(mutedResult, false);
  assert.equal(createdOscillators, 0);

  const qrisPlayed = playSoundEffect('qris', true, mockCtx);
  assert.equal(qrisPlayed, true);
  assert.equal(createdOscillators, getSoundPattern('qris').length);

  createdOscillators = 0;
  const tunaiPlayed = playSoundEffect('tunai', true, mockCtx);
  assert.equal(tunaiPlayed, true);
  assert.equal(createdOscillators, getSoundPattern('tunai').length);
});
