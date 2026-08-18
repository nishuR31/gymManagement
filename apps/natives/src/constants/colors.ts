// Central theme color palette used throughout the app.
// These values mirror the CSS variables in global.css / NativeWind config.

const light = {
  background: '#ffffff',
  foreground: '#09090b',
  card: '#f4f4f5',
  cardForeground: '#09090b',
  primary: '#8b5cf6',
  primaryForeground: '#ffffff',
  primarySoft: 'rgba(139,92,246,0.12)',
  secondary: '#f1f0f5',
  secondaryForeground: '#09090b',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  border: '#e4e4e7',
  input: '#e4e4e7',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  destructiveSoft: 'rgba(239,68,68,0.12)',
  success: '#22c55e',
  successSoft: 'rgba(34,197,94,0.12)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.12)',
  ring: '#8b5cf6',
};

const dark = {
  background: '#09090b',
  foreground: '#fafafa',
  card: '#18181b',
  cardForeground: '#fafafa',
  primary: '#a78bfa',
  primaryForeground: '#09090b',
  primarySoft: 'rgba(167,139,250,0.15)',
  secondary: '#27272a',
  secondaryForeground: '#fafafa',
  muted: '#27272a',
  mutedForeground: '#a1a1aa',
  border: '#27272a',
  input: '#27272a',
  destructive: '#f87171',
  destructiveForeground: '#09090b',
  destructiveSoft: 'rgba(248,113,113,0.15)',
  success: '#4ade80',
  successSoft: 'rgba(74,222,128,0.15)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251,191,36,0.15)',
  ring: '#a78bfa',
};

const amoled = {
  ...dark,
  background: '#000000',
  card: '#0a0a0a',
  secondary: '#111111',
  border: '#1f1f1f',
  input: '#1f1f1f',
  muted: '#111111',
};

export const themeColors = { light, dark, amoled } as const;
export type ThemeColorKey = keyof typeof themeColors;
export type ThemeColors = typeof light;
