import { useAppStore } from './store';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  card: string;
  surface: string;
  modal: string;
  /** Brand / UI accent — purple in dark, orange in light */
  primary: string;
  primaryGlow: string;
  /** Commerce accent (prices, order/checkout buttons) — orange in both themes */
  accent: string;
  accentGlow: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  borderHover: string;
  text: string;
  textSub: string;
  textTertiary: string;
  /** Foreground colour for text/icons placed on top of `primary` */
  onPrimary: string;
  /** Bottom tab bar background */
  tabBar: string;
  tabBarBorder: string;
  /** Skeleton / shimmer placeholder */
  skeleton: string;
}

// Dark theme — navy/black surfaces, purple UI accent, orange for commerce.
export const darkColors: ThemeColors = {
  bg: '#0A0A12',
  card: '#15151F',
  surface: '#1C1C2A',
  modal: '#22223A',
  primary: '#8B5CF6',
  primaryGlow: 'rgba(139,92,246,0.16)',
  accent: '#FF6A1A',
  accentGlow: 'rgba(255,106,26,0.16)',
  success: '#22C55E',
  warning: '#FFB547',
  danger: '#F0506E',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  text: '#F5F5FF',
  textSub: '#9A9AB5',
  textTertiary: '#5C5C72',
  onPrimary: '#FFFFFF',
  tabBar: 'rgba(10,10,18,0.97)',
  tabBarBorder: 'rgba(255,255,255,0.07)',
  skeleton: 'rgba(255,255,255,0.06)',
};

// Light (bright) theme — white surfaces, orange accent for everything.
export const lightColors: ThemeColors = {
  bg: '#F4F4F6',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  modal: '#FFFFFF',
  primary: '#FF6A1A',
  primaryGlow: 'rgba(255,106,26,0.12)',
  accent: '#FF6A1A',
  accentGlow: 'rgba(255,106,26,0.12)',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#E11D48',
  border: 'rgba(0,0,0,0.07)',
  borderHover: 'rgba(0,0,0,0.14)',
  text: '#1A1A1F',
  textSub: '#6B6B7A',
  textTertiary: '#9A9AA8',
  onPrimary: '#FFFFFF',
  tabBar: 'rgba(255,255,255,0.98)',
  tabBarBorder: 'rgba(0,0,0,0.06)',
  skeleton: 'rgba(0,0,0,0.05)',
};

export const themes: Record<ThemeMode, ThemeColors> = {
  dark: darkColors,
  light: lightColors,
};

/** Returns the active theme palette. Re-renders when the user toggles mode. */
export function useTheme(): ThemeColors {
  const mode = useAppStore((s) => s.theme);
  return themes[mode] ?? darkColors;
}

/** Returns the active theme mode ('dark' | 'light'). */
export function useThemeMode(): ThemeMode {
  return useAppStore((s) => s.theme);
}
