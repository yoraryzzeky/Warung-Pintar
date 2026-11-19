export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';
export type ViewportOrientation = 'portrait' | 'landscape';
export type DeviceOsFamily = 'android' | 'ios' | 'other';
export type AdaptiveLayoutMode =
  | 'mobile-portrait'
  | 'mobile-landscape'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'desktop';

export interface DeviceLayoutInput {
  width: number;
  height: number;
  userAgent?: string;
  maxTouchPoints?: number;
  isCoarsePointer?: boolean;
}

export interface DeviceLayoutState {
  device: DeviceCategory;
  orientation: ViewportOrientation;
  os: DeviceOsFamily;
  layoutMode: AdaptiveLayoutMode;
  rootFontSizePx: number;
  uiScale: number;
  isCompactPhone: boolean;
  isPhoneLandscape: boolean;
  width: number;
  height: number;
}

export function detectDeviceOs(
  userAgent: string = '',
  maxTouchPoints: number = 0
): DeviceOsFamily {
  const ua = (userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'other';
}

export function detectOrientation(width: number, height: number): ViewportOrientation {
  return width > height ? 'landscape' : 'portrait';
}

export function detectDeviceLayout(input: DeviceLayoutInput): DeviceLayoutState {
  const width = Math.max(240, Math.round(Number(input.width) || 390));
  const height = Math.max(240, Math.round(Number(input.height) || 844));
  const ua = (input.userAgent || '').toLowerCase();
  const maxTouchPoints = Number(input.maxTouchPoints) || 0;
  const isCoarsePointer = Boolean(input.isCoarsePointer) || maxTouchPoints > 0;
  const os = detectDeviceOs(ua, maxTouchPoints);
  const orientation = detectOrientation(width, height);

  const isTabletUa = /ipad|tablet|playbook|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua));
  const isPhoneUa =
    /iphone|ipod/.test(ua) ||
    (/android/.test(ua) && /mobile/.test(ua)) ||
    /windows phone|blackberry|opera mini|mobile/.test(ua);

  const shortDimension = Math.min(width, height);
  const longDimension = Math.max(width, height);

  let device: DeviceCategory;

  if (orientation === 'portrait') {
    if (width < 640) {
      device = 'mobile';
    } else if (width <= 1024 && (isTabletUa || isCoarsePointer || os !== 'other')) {
      device = 'tablet';
    } else if (width < 900) {
      device = 'tablet';
    } else {
      device = 'desktop';
    }
  } else {
    // Landscape orientation: distinguish phones held sideways from tablets and desktops.
    // Modern phones in landscape often reach 667px–932px width while height stays <= 500px.
    if (
      height <= 500 ||
      (isPhoneUa && shortDimension <= 540) ||
      (isCoarsePointer && shortDimension <= 540 && longDimension <= 1024)
    ) {
      device = 'mobile';
    } else if (
      isTabletUa ||
      (isCoarsePointer && width <= 1366 && height <= 1024) ||
      (width < 1024 && height <= 768)
    ) {
      device = 'tablet';
    } else {
      device = 'desktop';
    }
  }

  let layoutMode: AdaptiveLayoutMode;
  if (device === 'mobile') {
    layoutMode = orientation === 'landscape' ? 'mobile-landscape' : 'mobile-portrait';
  } else if (device === 'tablet') {
    layoutMode = orientation === 'landscape' ? 'tablet-landscape' : 'tablet-portrait';
  } else {
    layoutMode = 'desktop';
  }

  let rootFontSizePx = 16;
  if (layoutMode === 'mobile-portrait') {
    rootFontSizePx = width <= 360 ? 13 : 13.5;
  } else if (layoutMode === 'mobile-landscape') {
    rootFontSizePx = height <= 380 ? 11.5 : 12;
  } else if (layoutMode === 'tablet-portrait') {
    rootFontSizePx = 15;
  } else if (layoutMode === 'tablet-landscape') {
    rootFontSizePx = 14.5;
  }

  const uiScale = Number((rootFontSizePx / 16).toFixed(3));

  return {
    device,
    orientation,
    os,
    layoutMode,
    rootFontSizePx,
    uiScale,
    isCompactPhone: device === 'mobile',
    isPhoneLandscape: layoutMode === 'mobile-landscape',
    width,
    height,
  };
}

export function applyDeviceLayoutToDocument(
  state: DeviceLayoutState,
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined
): void {
  if (!doc || !doc.documentElement) return;
  const root = doc.documentElement;
  root.setAttribute('data-device', state.device);
  root.setAttribute('data-orientation', state.orientation);
  root.setAttribute('data-os', state.os);
  root.setAttribute('data-layout-mode', state.layoutMode);
  root.style.setProperty('--wp-root-font-size', `${state.rootFontSizePx}px`);
  root.style.setProperty('--wp-ui-scale', String(state.uiScale));
  root.style.fontSize = `${state.rootFontSizePx}px`;
}
