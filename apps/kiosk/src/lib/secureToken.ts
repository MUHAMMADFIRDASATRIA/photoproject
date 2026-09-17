import { isDesktop } from './desktop';

const LEGACY_TOKEN_KEY = 'kiosk_device_token';

/**
 * Penyimpanan token device kiosk.
 * - Browser: sesi memakai cookie httpOnly (token tidak disentuh JS sama sekali).
 * - Electron: token disimpan terenkripsi lewat safeStorage di main process.
 * localStorage TIDAK lagi dipakai untuk token (rawan dicuri lewat XSS).
 */
export function purgeLegacyToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function saveDeviceToken(token: string): Promise<void> {
  purgeLegacyToken();
  if (!isDesktop()) return;
  try {
    await window.photoboxDesktop!.setDeviceToken(token);
  } catch {
    /* ignore */
  }
}

export async function loadDeviceToken(): Promise<string | null> {
  purgeLegacyToken();
  if (!isDesktop()) return null;
  try {
    return (await window.photoboxDesktop!.getDeviceToken()) ?? null;
  } catch {
    return null;
  }
}

export async function clearDeviceToken(): Promise<void> {
  purgeLegacyToken();
  if (!isDesktop()) return;
  try {
    await window.photoboxDesktop!.clearDeviceToken();
  } catch {
    /* ignore */
  }
}
