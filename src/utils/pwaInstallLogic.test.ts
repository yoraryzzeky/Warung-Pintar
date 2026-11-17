import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAndroidDevice,
  detectIOSDevice,
  detectIOSSafari,
  detectInstallPlatform,
  detectStandaloneMode,
  getInstallButtonAction,
} from './pwaInstallLogic';

test('detectIOSDevice recognizes iPhone, iPad, and modern iPadOS MacIntel touch devices', () => {
  assert.equal(
    detectIOSDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15'),
    true
  );
  assert.equal(
    detectIOSDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5, 'MacIntel'),
    true
  );
  assert.equal(
    detectIOSDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 0, 'MacIntel'),
    false
  );
  assert.equal(
    detectIOSDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36'),
    false
  );
});

test('detectInstallPlatform classifies Android, iOS, and Desktop user agents accurately', () => {
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36'),
    'android'
  );
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'),
    'ios'
  );
  assert.equal(
    detectInstallPlatform('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'),
    'desktop'
  );
  assert.equal(detectAndroidDevice('Android 13 Mobile'), true);
});

test('detectIOSSafari distinguishes Safari from Chrome/Edge/Firefox on iOS', () => {
  assert.equal(
    detectIOSSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'),
    true
  );
  assert.equal(
    detectIOSSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1'),
    false
  );
});

test('detectStandaloneMode detects installed PWA on both Android/Desktop and iOS', () => {
  assert.equal(detectStandaloneMode(true, false), true);
  assert.equal(detectStandaloneMode(false, true), true);
  assert.equal(detectStandaloneMode(false, false), false);
});

test('getInstallButtonAction returns hidden when installed, native-prompt when ready, and guide-modal fallback otherwise', () => {
  assert.equal(getInstallButtonAction({ isInstalled: true, isInstallable: true }), 'hidden');
  assert.equal(getInstallButtonAction({ isInstalled: true, isInstallable: false }), 'hidden');
  assert.equal(getInstallButtonAction({ isInstalled: false, isInstallable: true }), 'native-prompt');
  assert.equal(getInstallButtonAction({ isInstalled: false, isInstallable: false }), 'guide-modal');
});
