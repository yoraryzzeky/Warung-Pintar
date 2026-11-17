export type DeviceInstallPlatform = 'ios' | 'android' | 'desktop';

export type InstallButtonAction = 'hidden' | 'native-prompt' | 'guide-modal';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const detectIOSDevice = (
  userAgent: string,
  maxTouchPoints: number = 0,
  platform: string = ''
): boolean => {
  const ua = (userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return true;
  }
  const normalizedPlatform = (platform || '').toLowerCase();
  const isIPadOS =
    (normalizedPlatform === 'macintel' || /macintosh/.test(ua)) && maxTouchPoints > 1;
  return isIPadOS;
};

export const detectAndroidDevice = (userAgent: string): boolean => {
  return /android/i.test(userAgent || '');
};

export const detectInstallPlatform = (
  userAgent: string,
  maxTouchPoints: number = 0,
  platform: string = ''
): DeviceInstallPlatform => {
  if (detectIOSDevice(userAgent, maxTouchPoints, platform)) {
    return 'ios';
  }
  if (detectAndroidDevice(userAgent)) {
    return 'android';
  }
  return 'desktop';
};

export const detectIOSSafari = (userAgent: string): boolean => {
  const ua = userAgent || '';
  const isWebKit = /AppleWebKit/i.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA/i.test(ua);
  return isWebKit && !isOtherBrowser;
};

export const detectStandaloneMode = (
  matchMediaStandalone: boolean,
  navigatorStandalone?: boolean
): boolean => {
  return Boolean(matchMediaStandalone || navigatorStandalone === true);
};

export const getInstallButtonAction = (state: {
  isInstalled: boolean;
  isInstallable: boolean;
}): InstallButtonAction => {
  if (state.isInstalled) {
    return 'hidden';
  }
  if (state.isInstallable) {
    return 'native-prompt';
  }
  return 'guide-modal';
};
