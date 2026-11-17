import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPpobToastSummary, PPOB_TOAST_DURATION_MS } from './ppobToast';
import { formatRp, type DigitalTransaction } from './storeLogic';

test('buildPpobToastSummary formats Pulsa transaction target and total payment cleanly', () => {
  const tx: DigitalTransaction = {
    id: 'DIG-123456',
    date: '2026-11-16T08:00:00.000Z',
    serviceType: 'Pulsa',
    provider: 'Telkomsel',
    targetNumber: ' 081234567890 ',
    baseAmount: 50000,
    fee: 2500,
    sellAmount: 52500,
    customer: 'Pelanggan Umum',
    status: 'LUNAS',
    type: 'DIGITAL',
    paymentMethod: 'TUNAI',
    handledBy: 'Owner',
  };

  const summary = buildPpobToastSummary(tx);

  assert.equal(summary.id, 'DIG-123456');
  assert.equal(summary.title, 'Transaksi PPOB Berhasil');
  assert.equal(summary.serviceLine, 'Pulsa · Telkomsel');
  assert.equal(summary.targetNumber, '081234567890');
  assert.equal(summary.totalFormatted, formatRp(52500));
  assert.match(summary.totalFormatted, /Rp\s?52\.500/);
  assert.equal(summary.adminFeeFormatted, formatRp(2500));
  assert.equal(summary.customerNote, null);
});

test('buildPpobToastSummary includes custom customer note when provided', () => {
  const tx: DigitalTransaction = {
    id: 'DIG-998877',
    date: '2026-11-16T08:05:00.000Z',
    serviceType: 'Token PLN',
    provider: 'Token PLN Prabayar',
    targetNumber: '521040123456',
    baseAmount: 100000,
    fee: 3000,
    sellAmount: 103000,
    customer: 'Pak Budi RT 04',
    status: 'LUNAS',
    type: 'DIGITAL',
    paymentMethod: 'TUNAI',
    handledBy: 'Owner',
  };

  const summary = buildPpobToastSummary(tx);

  assert.equal(summary.serviceLine, 'Token PLN · Token PLN Prabayar');
  assert.equal(summary.targetNumber, '521040123456');
  assert.equal(summary.totalFormatted, formatRp(103000));
  assert.match(summary.totalFormatted, /Rp\s?103\.000/);
  assert.equal(summary.customerNote, 'Pak Budi RT 04');
});

test('PPOB_TOAST_DURATION_MS provides sensible auto-dismiss duration', () => {
  assert.ok(PPOB_TOAST_DURATION_MS >= 4000 && PPOB_TOAST_DURATION_MS <= 8000);
});
