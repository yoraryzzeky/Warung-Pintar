import { useCallback, useEffect, useState } from 'react';
import {
  detectIOSDevice,
  detectIOSSafari,
  detectInstallPlatform,
  detectStandaloneMode,
  type BeforeInstallPromptEvent,
  type DeviceInstallPlatform,
} from '../utils/pwaInstallLogic';

let earlyDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptSubscribers = new Set<(event: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    earlyDeferredPrompt = e as BeforeInstallPromptEvent;
    promptSubscribers.forEach((cb) => cb(earlyDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    earlyDeferredPrompt = null;
    promptSubscribers.forEach((cb) => cb(null));
  });
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => earlyDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return detectStandaloneMode(
      window.matchMedia('(display-mode: standalone)').matches,
      (window.navigator as unknown as { standalone?: boolean }).standalone
    );
  });
  const [isIOS, setIsIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return detectIOSDevice(
      window.navigator.userAgent,
      window.navigator.maxTouchPoints,
      window.navigator.platform
    );
  });
  const [platform, setPlatform] = useState<DeviceInstallPlatform>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return detectInstallPlatform(
      window.navigator.userAgent,
      window.navigator.maxTouchPoints,
      window.navigator.platform
    );
  });
  const [isIOSSafari, setIsIOSSafari] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return detectIOSSafari(window.navigator.userAgent);
  });
  const [isInIframe, setIsInIframe] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const syncEnvironment = () => {
      setIsInstalled(
        detectStandaloneMode(
          standaloneMedia.matches,
          (window.navigator as unknown as { standalone?: boolean }).standalone
        )
      );
      setIsIOS(
        detectIOSDevice(
          window.navigator.userAgent,
          window.navigator.maxTouchPoints,
          window.navigator.platform
        )
      );
      setPlatform(
        detectInstallPlatform(
          window.navigator.userAgent,
          window.navigator.maxTouchPoints,
          window.navigator.platform
        )
      );
      setIsIOSSafari(detectIOSSafari(window.navigator.userAgent));
      try {
        setIsInIframe(window.self !== window.top);
      } catch {
        setIsInIframe(true);
      }
    };

    syncEnvironment();

    const subscriber = (nextPrompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(nextPrompt);
    };
    promptSubscribers.add(subscriber);

    if (earlyDeferredPrompt) {
      setDeferredPrompt(earlyDeferredPrompt);
    }

    const handleAppInstalled = () => {
      earlyDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneMedia.addEventListener?.('change', syncEnvironment);

    return () => {
      promptSubscribers.delete(subscriber);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMedia.removeEventListener?.('change', syncEnvironment);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || earlyDeferredPrompt;
    if (!activePrompt) return false;
    await activePrompt.prompt();
    const { outcome } = await activePrompt.userChoice;
    if (outcome === 'accepted') {
      earlyDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isIOSSafari,
    platform,
    isInIframe,
    install,
  };
}
