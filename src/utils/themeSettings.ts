export type ThemeId = 'ocean' | 'warung' | 'emerald' | 'royal' | 'crimson';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  description: string;
  primaryHex: string;
  secondaryHex: string;
  softHex: string;
  canvasHex: string;
  themeColorMeta: string;
}

export const DEFAULT_THEME_ID: ThemeId = 'ocean';

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'ocean',
    name: 'Biru Pintar',
    description: 'Tema standar cerah, bersih & profesional',
    primaryHex: '#2563eb',
    secondaryHex: '#4f46e5',
    softHex: '#eff6ff',
    canvasHex: '#f8fafc',
    themeColorMeta: '#2563eb',
  },
  {
    id: 'warung',
    name: 'Oranye Warung',
    description: 'Hangat & akrab selaras logo Warung Pintar',
    primaryHex: '#ea580c',
    secondaryHex: '#d97706',
    softHex: '#fff7ed',
    canvasHex: '#fffaf5',
    themeColorMeta: '#ea580c',
  },
  {
    id: 'emerald',
    name: 'Hijau Zamrud',
    description: 'Segar, tenang & nyaman dipandang lama',
    primaryHex: '#059669',
    secondaryHex: '#0d9488',
    softHex: '#ecfdf5',
    canvasHex: '#f4fbf7',
    themeColorMeta: '#059669',
  },
  {
    id: 'royal',
    name: 'Ungu Elegan',
    description: 'Modern, tegas & berkarakter premium',
    primaryHex: '#7c3aed',
    secondaryHex: '#6366f1',
    softHex: '#f5f3ff',
    canvasHex: '#f8f6fc',
    themeColorMeta: '#7c3aed',
  },
  {
    id: 'crimson',
    name: 'Merah Marun',
    description: 'Berani, energik & kontras tinggi untuk kasir',
    primaryHex: '#e11d48',
    secondaryHex: '#db2777',
    softHex: '#fff1f2',
    canvasHex: '#fff8f9',
    themeColorMeta: '#e11d48',
  },
] as const;

export const isValidThemeId = (val: unknown): val is ThemeId => {
  return typeof val === 'string' && THEME_PRESETS.some((preset) => preset.id === val);
};

export const getThemePreset = (id: unknown): ThemePreset => {
  if (isValidThemeId(id)) {
    return THEME_PRESETS.find((p) => p.id === id) || THEME_PRESETS[0];
  }
  return THEME_PRESETS[0];
};

export const applyThemeToDocument = (
  themeId: unknown,
  doc: Pick<Document, 'documentElement' | 'querySelector'> | undefined = typeof document !== 'undefined'
    ? document
    : undefined
): ThemePreset => {
  const preset = getThemePreset(themeId);
  if (!doc) return preset;

  if (doc.documentElement) {
    doc.documentElement.dataset.theme = preset.id;
  }

  const metaTheme = doc.querySelector('meta[name="theme-color"]');
  if (metaTheme && typeof metaTheme.setAttribute === 'function') {
    metaTheme.setAttribute('content', preset.themeColorMeta);
  }

  return preset;
};
