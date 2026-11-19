import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDeviceLayout,
  detectDeviceOs,
  detectOrientation,
} from './deviceLayout';

const ANDROID_PHONE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

test('detectDeviceOs identifies Android, iOS, and desktop/other accurately', () => {
  assert.equal(detectDeviceOs(ANDROID_PHONE_UA, 5), 'android');
  assert.equal(detectDeviceOs(IPHONE_UA, 5), 'ios');
  assert.equal(detectDeviceOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), 'ios');
  assert.equal(detectDeviceOs(DESKTOP_UA, 0), 'other');
});

test('detectOrientation returns portrait or landscape based on dimensions', () => {
  assert.equal(detectOrientation(390, 844), 'portrait');
  assert.equal(detectOrientation(844, 390), 'landscape');
  assert.equal(detectOrientation(768, 768), 'portrait');
});

test('Android smartphone portrait scales down cleanly', () => {
  const layout = detectDeviceLayout({
    width: 390,
    height: 844,
    userAgent: ANDROID_PHONE_UA,
    maxTouchPoints: 5,
    isCoarsePointer: true,
  });

  assert.equal(layout.device, 'mobile');
  assert.equal(layout.orientation, 'portrait');
  assert.equal(layout.os, 'android');
  assert.equal(layout.layoutMode, 'mobile-portrait');
  assert.equal(layout.isCompactPhone, true);
  assert.equal(layout.isPhoneLandscape, false);
  assert.equal(layout.rootFontSizePx, 13.5);
  assert.ok(layout.uiScale < 0.9);
});

test('Ultra-narrow smartphone portrait (360px) scales down even further', () => {
  const layout = detectDeviceLayout({
    width: 360,
    height: 780,
    userAgent: ANDROID_PHONE_UA,
    maxTouchPoints: 5,
    isCoarsePointer: true,
  });

  assert.equal(layout.device, 'mobile');
  assert.equal(layout.layoutMode, 'mobile-portrait');
  assert.equal(layout.rootFontSizePx, 13);
});

test('iOS iPhone landscape (844x390 and 667x375) stays mobile-landscape, not tablet/desktop', () => {
  const iphone14Landscape = detectDeviceLayout({
    width: 844,
    height: 390,
    userAgent: IPHONE_UA,
    maxTouchPoints: 5,
    isCoarsePointer: true,
  });

  assert.equal(iphone14Landscape.device, 'mobile');
  assert.equal(iphone14Landscape.orientation, 'landscape');
  assert.equal(iphone14Landscape.os, 'ios');
  assert.equal(iphone14Landscape.layoutMode, 'mobile-landscape');
  assert.equal(iphone14Landscape.isPhoneLandscape, true);
  assert.equal(iphone14Landscape.rootFontSizePx, 12);

  const iphoneSeLandscape = detectDeviceLayout({
    width: 667,
    height: 375,
    userAgent: IPHONE_UA,
    maxTouchPoints: 5,
    isCoarsePointer: true,
  });
  assert.equal(iphoneSeLandscape.device, 'mobile');
  assert.equal(iphoneSeLandscape.layoutMode, 'mobile-landscape');
  assert.equal(iphoneSeLandscape.rootFontSizePx, 11.5);
});

test('Short landscape viewport without mobile UA (e.g. responsive emulator) still detects mobile-landscape', () => {
  const layout = detectDeviceLayout({
    width: 844,
    height: 390,
    userAgent: DESKTOP_UA,
    maxTouchPoints: 0,
    isCoarsePointer: false,
  });

  assert.equal(layout.device, 'mobile');
  assert.equal(layout.orientation, 'landscape');
  assert.equal(layout.layoutMode, 'mobile-landscape');
});

test('Tablet portrait and landscape get balanced medium scale', () => {
  const tabletPortrait = detectDeviceLayout({
    width: 768,
    height: 1024,
    userAgent: IPAD_UA,
    maxTouchPoints: 5,
    isCoarsePointer: true,
  });
  assert.equal(tabletPortrait.device, 'tablet');
  assert.equal(tabletPortrait.layoutMode, 'tablet-portrait');
  assert.equal(tabletPortrait.rootFontSizePx, 15);

  const tabletLandscape = detectDeviceLayout({
    width: 1024,
    height: 768,
    userAgent: IPAD_UA,
    maxTouchPoints: 5,
    isCoarsePointer: true,
  });
  assert.equal(tabletLandscape.device, 'tablet');
  assert.equal(tabletLandscape.layoutMode, 'tablet-landscape');
  assert.equal(tabletLandscape.rootFontSizePx, 14.5);
});

test('Desktop viewport retains full 16px base scale', () => {
  const desktop = detectDeviceLayout({
    width: 1440,
    height: 900,
    userAgent: DESKTOP_UA,
    maxTouchPoints: 0,
    isCoarsePointer: false,
  });

  assert.equal(desktop.device, 'desktop');
  assert.equal(desktop.orientation, 'landscape');
  assert.equal(desktop.layoutMode, 'desktop');
  assert.equal(desktop.isCompactPhone, false);
  assert.equal(desktop.isPhoneLandscape, false);
  assert.equal(desktop.rootFontSizePx, 16);
  assert.equal(desktop.uiScale, 1);
});
