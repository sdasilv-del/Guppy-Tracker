/**
 * Below are the colors and fonts that are used in the app.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Midnight gold: the navy and gold of the app icon. The app is always dark, so both schemes share one palette.
const Midnight = {
  text: '#EEE7D7',
  background: '#0A0F1C',
  backgroundElement: '#131B30',
  backgroundSelected: '#1C2540',
  textSecondary: '#8E95A6',
  accent: '#C9A96A',
  onAccent: '#0A0F1C',
  // Champagne for the numbers that matter most, such as a best score.
  highlight: '#E2CB95',
  danger: '#E07A6E',
  success: '#7FBF8E',
  // Field and chip outlines meet the 3:1 contrast minimum for controls; divider is for thin lines between rows.
  border: '#646D8C',
  divider: '#1F2840',
} as const;

export const Colors = { light: Midnight, dark: Midnight } as const;

// Cormorant Garamond for fish codes, names, headings and scores; loaded in the root layout.
export const Display = {
  medium: 'CormorantGaramond_500Medium',
  semibold: 'CormorantGaramond_600SemiBold',
  italic: 'CormorantGaramond_500Medium_Italic',
} as const;

// Stack headers: serif titles on a flat midnight bar.
export const HeaderOptions = {
  headerBackTitle: 'Back',
  headerTitleStyle: { fontFamily: Display.semibold, fontSize: 21 },
  headerLargeTitleStyle: { fontFamily: Display.semibold },
  headerShadowVisible: false,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
