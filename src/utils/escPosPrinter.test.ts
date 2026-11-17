import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRetailEscPosLines,
  formatDigitalEscPosLines,
  buildRetailEscPosPayload,
  buildDigitalEscPosPayload,
  chunkBytesForBle,
  formatTwoColumnLine,
} from './escPosPrinter';
import { getScaledDimensions } from './imageCompression';
import { findProductByBarcode, type Product, type Transaction, type DigitalTransaction } from './storeLogic';

test('formatTwoColumnLine pads neatly within 32-column thermal width', () => {
  const line = formatTwoColumnLine('TOTAL', 'Rp 25.000');
  assert.equal(line.length, 32);
  assert.ok(line.startsWith('TOTAL'));
  assert.ok(line.endsWith('Rp 25.000'));
});

test('formatRetailEscPosLines includes store header, items, total, payment, and footer', () => {
  const tx: Transaction = {
    id: 'TX-100001',
    date: '2026-03-10T10:00:00.000Z',
    items: [
      {
        cartId: 'P-001-Bungkus',
        id: 'P-001',
        name: 'Indomie Goreng',
        priceAtTime: 3500,
        costAtTime: 2800,
        quantity: 2,
        category: 'Makanan',
      },
    ],
    totalAmount: 7000,
    totalProfit: 1400,
    status: 'LUNAS',
    buyer: 'Pelanggan Umum',
    cashPaid: 10000,
    change: 3000,
    type: 'RETAIL',
  };

  const lines = formatRetailEscPosLines(tx, {
    ownerName: 'Warung Berkah',
    address: 'Jl. Merdeka 10',
    footerNote: 'Terima kasih',
  });

  const joined = lines.join('\n');
  assert.ok(joined.includes('WARUNG BERKAH'));
  assert.ok(joined.includes('TX-100001'));
  assert.ok(joined.includes('Indomie Goreng'));
  assert.ok(joined.includes('TOTAL'));
  assert.ok(joined.includes('Kembali'));
  assert.ok(joined.includes('Terima kasih'));
  assert.ok(joined.includes('Metode Pembayaran:'));
  assert.ok(joined.includes('Tunai'));
  assert.ok(!joined.includes('Status:'));
  assert.ok(!joined.includes('Nama Pelanggan:'));

  const kasbonTx: Transaction = {
    ...tx,
    id: 'TX-100002',
    status: 'MENUNGGU',
    paymentMethod: 'KASBON',
    buyer: 'PAK BUDI',
    shortage: 7000,
    cashPaid: 0,
    change: 0,
  };
  const kasbonJoined = formatRetailEscPosLines(kasbonTx, { ownerName: 'Warung Berkah' }).join('\n');
  assert.ok(kasbonJoined.includes('Metode Pembayaran:'));
  assert.ok(kasbonJoined.includes('Kasbon'));
  assert.ok(kasbonJoined.includes('Nama Pelanggan:'));
  assert.ok(kasbonJoined.includes('PAK BUDI'));
  assert.ok(
    kasbonJoined.indexOf('Metode Pembayaran:') < kasbonJoined.indexOf('Nama Pelanggan:'),
    'Nama Pelanggan must appear below Metode Pembayaran'
  );

  const payload = buildRetailEscPosPayload(tx, { ownerName: 'Warung Berkah' });
  assert.ok(payload.length > 50);
  // Starts with ESC @
  assert.equal(payload[0], 0x1b);
  assert.equal(payload[1], 0x40);
  const payloadText = new TextDecoder().decode(payload);
  assert.ok(payloadText.includes('\x1d\x6b\x49'), 'Retail ESC/POS payload should include GS k Code128 barcode command');
  assert.ok(payloadText.includes('{BTX-100001'));
});

test('formatDigitalEscPosLines formats PPOB digital transaction cleanly', () => {
  const digTx: DigitalTransaction = {
    id: 'DIG-202601',
    date: '2026-03-10T12:00:00.000Z',
    serviceType: 'Token PLN',
    provider: 'Token PLN Prabayar',
    targetNumber: '521040998812',
    baseAmount: 50000,
    fee: 2500,
    sellAmount: 52500,
    customer: 'Pak Andi',
    status: 'LUNAS',
    type: 'DIGITAL',
  };

  const lines = formatDigitalEscPosLines(digTx, { ownerName: 'Warung Pintar' });
  const joined = lines.join('\n');
  assert.ok(joined.includes('STRUK TRANSAKSI DIGITAL'));
  assert.ok(joined.includes('521040998812'));
  assert.ok(joined.includes('Token PLN'));
  assert.ok(joined.includes('TOTAL BAYAR'));
  assert.ok(joined.includes('Metode Pembayaran:'));
  assert.ok(joined.includes('Tunai'));
  assert.ok(!joined.includes('Status:'));

  const payload = buildDigitalEscPosPayload(digTx, { ownerName: 'Warung Pintar' });
  assert.equal(payload[0], 0x1b);
  assert.equal(payload[1], 0x40);
  const digPayloadText = new TextDecoder().decode(payload);
  assert.ok(digPayloadText.includes('\x1d\x6b\x49'));
  assert.ok(digPayloadText.includes('{BDIG-202601'));
});

test('chunkBytesForBle splits buffer into BLE MTU-safe chunks', () => {
  const bytes = new Uint8Array(250).fill(0x41);
  const chunks = chunkBytesForBle(bytes, 100);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 100);
  assert.equal(chunks[1].length, 100);
  assert.equal(chunks[2].length, 50);
});

test('getScaledDimensions preserves aspect ratio within maxDimension', () => {
  assert.deepEqual(getScaledDimensions(1920, 1080, 480), { width: 480, height: 270 });
  assert.deepEqual(getScaledDimensions(800, 1600, 480), { width: 240, height: 480 });
  assert.deepEqual(getScaledDimensions(320, 240, 480), { width: 320, height: 240 });
});

test('findProductByBarcode matches trimmed barcode cleanly', () => {
  const products: Product[] = [
    {
      id: 'P-1',
      barcode: '8992696401013',
      name: 'Indomie Goreng',
      category: 'Makanan',
      costPrice: 2800,
      sellingPrice: 3500,
      stock: 10,
      isKeteng: false,
      ketengPrice: 0,
      pcsPerPack: 1,
      eceranStock: 0,
    },
  ];
  assert.equal(findProductByBarcode(products, ' 8992696401013 ')?.id, 'P-1');
  assert.equal(findProductByBarcode(products, ''), undefined);
  assert.equal(findProductByBarcode(products, '0000'), undefined);
});
