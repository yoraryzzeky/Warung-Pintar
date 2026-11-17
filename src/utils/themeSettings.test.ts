import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THEME_ID,
  THEME_PRESETS,
  isValidThemeId,
  getThemePreset,
  applyThemeToDocument,
} from './themeSettings';

test('THEME_PRESETS contains distinct valid theme presets including default ocean', () => {
  assert.ok(THEME_PRESETS.length >= 5);
  const ids = new Set(THEME_PRESETS.map((p) => p.id));
  assert.equal(ids.size, THEME_PRESETS.length);
  assert.ok(ids.has(DEFAULT_THEME_ID));
  assert.ok(ids.has('warung'));
  assert.ok(ids.has('emerald'));
  assert.ok(ids.has('royal'));
  assert.ok(ids.has('crimson'));
});

test('isValidThemeId validates known theme IDs and rejects invalid values', () => {
  assert.equal(isValidThemeId('ocean'), true);
  assert.equal(isValidThemeId('warung'), true);
  assert.equal(isValidThemeId('emerald'), true);
  assert.equal(isValidThemeId('neon-invalid'), false);
  assert.equal(isValidThemeId(null), false);
  assert.equal(isValidThemeId(123), false);
});

test('getThemePreset resolves known preset or falls back to default ocean', () => {
  assert.equal(getThemePreset('warung').name, 'Oranye Warung');
  assert.equal(getThemePreset('unknown-theme').id, DEFAULT_THEME_ID);
});

test('applyThemeToDocument updates data-theme and meta theme-color', () => {
  let metaContent = '';
  const mockDoc = {
    documentElement: { dataset: {} as Record<string, string> },
    querySelector: (selector: string) =>
      selector === 'meta[name="theme-color"]'
        ? ({ setAttribute: (_attr: string, val: string) => { metaContent = val; } } as unknown as Element)
        : null,
  } as unknown as Document;

  const applied = applyThemeToDocument('emerald', mockDoc);
  assert.equal(applied.id, 'emerald');
  assert.equal(mockDoc.documentElement.dataset.theme, 'emerald');
  assert.equal(metaContent, '#059669');
});
