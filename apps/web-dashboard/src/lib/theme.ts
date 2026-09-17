export type Theme = 'dark' | 'light';

const THEME_KEY = 'photobox_theme';

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* localStorage tidak tersedia — abaikan */
  }
}

export function themeClass(theme: Theme): string {
  return theme === 'light' ? 'theme-light' : '';
}