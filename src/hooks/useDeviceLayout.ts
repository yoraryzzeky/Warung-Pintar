import { useEffect, useState } from 'react';
import {
  applyDeviceLayoutToDocument,
  detectDeviceLayout,
  type DeviceLayoutState,
} from '../utils/deviceLayout';

function readCurrentLayout(): DeviceLayoutState {
  if (typeof window === 'undefined') {
    return detectDeviceLayout({ width: 1440, height: 900 });
  }
  const coarseMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)')
      : null;
  return detectDeviceLayout({
    width: window.innerWidth,
    height: window.innerHeight,
    userAgent: window.navigator?.userAgent || '',
    maxTouchPoints: window.navigator?.maxTouchPoints || 0,
    isCoarsePointer: Boolean(coarseMedia?.matches),
  });
}

export function useDeviceLayout(): DeviceLayoutState {
  const [layout, setLayout] = useState<DeviceLayoutState>(() => {
    const initial = readCurrentLayout();
    applyDeviceLayoutToDocument(initial);
    return initial;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncLayout = () => {
      const next = readCurrentLayout();
      applyDeviceLayoutToDocument(next);
      setLayout((prev) => {
        if (
          prev.layoutMode === next.layoutMode &&
          prev.rootFontSizePx === next.rootFontSizePx &&
          prev.width === next.width &&
          prev.height === next.height &&
          prev.os === next.os
        ) {
          return prev;
        }
        return next;
      });
    };

    syncLayout();

    const coarseMedia =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)')
        : null;

    window.addEventListener('resize', syncLayout);
    window.addEventListener('orientationchange', syncLayout);
    coarseMedia?.addEventListener?.('change', syncLayout);

    return () => {
      window.removeEventListener('resize', syncLayout);
      window.removeEventListener('orientationchange', syncLayout);
      coarseMedia?.removeEventListener?.('change', syncLayout);
    };
  }, []);

  return layout;
}
