import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  normalizeBarcodeText,
  encodeCode128BModules,
  buildCode128SvgData,
} from './receiptBarcode';

const require = createRequire(import.meta.url);
const { Code128Reader, BitArray } = require('@zxing/library');

test('normalizeBarcodeText trims and keeps printable ASCII or falls back', () => {
  assert.equal(normalizeBarcodeText(' TX-166407 '), 'TX-166407');
  assert.equal(normalizeBarcodeText(''), 'WARUNG');
});

test('encodeCode128BModules builds valid Code 128B decodable by ZXing Code128Reader', () => {
  const samples = ['TX-166407', 'DIG-202601', 'TX-998812-A'];
  const reader = new Code128Reader();

  samples.forEach((sample) => {
    const { normalizedText, modules } = encodeCode128BModules(sample);
    assert.equal(normalizedText, sample);

    // 10 quiet + Start(11) + payload*11 + checksum(11) + Stop(13) + 10 quiet
    const expectedLength = 10 + 11 * (sample.length + 2) + 13 + 10;
    assert.equal(modules.length, expectedLength);

    // Leading and trailing 10-module quiet zones must be spaces (0)
    assert.ok(modules.slice(0, 10).every((m) => m === 0));
    assert.ok(modules.slice(-10).every((m) => m === 0));

    // Feed bit row into ZXing Code128Reader to guarantee real scanner compatibility
    const row = new BitArray(modules.length);
    modules.forEach((bit, idx) => {
      if (bit === 1) row.set(idx);
    });
    const decoded = reader.decodeRow(0, row, null);
    assert.equal(decoded.getText(), sample);
  });
});

test('buildCode128SvgData produces non-empty bar rects bounded by totalWidth', () => {
  const svg = buildCode128SvgData('TX-166407', 40);
  assert.equal(svg.normalizedText, 'TX-166407');
  assert.equal(svg.height, 40);
  assert.ok(svg.rects.length > 10);
  assert.ok(svg.rects.every((r) => r.x >= 10 && r.x + r.width <= svg.totalWidth - 10));
});
