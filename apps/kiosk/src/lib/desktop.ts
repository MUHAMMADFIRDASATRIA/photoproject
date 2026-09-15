export interface DesktopPrinter {
  deviceId: string;
  name: string;
  paperSizes: string[];
}

export interface DesktopPrinterResponse {
  ok: boolean;
  printers: DesktopPrinter[];
  defaultPrinter: DesktopPrinter | null;
  error?: string;
}

export interface DesktopPrintOptions {
  dataUrl: string;
  width: number;
  height: number;
  copies: number;
  printer?: string;
}

export interface DesktopPrintResult {
  ok: boolean;
  printer?: string | null;
  error?: string;
}

export interface PhotoboxDesktopApi {
  platform: string;
  isDesktop: boolean;
  getPrinters: () => Promise<DesktopPrinterResponse>;
  printPhoto: (opts: DesktopPrintOptions) => Promise<DesktopPrintResult>;
}

declare global {
  interface Window {
    photoboxDesktop?: PhotoboxDesktopApi;
  }
}

/** True jika berjalan di dalam Electron (bukan browser biasa). */
export const isDesktop = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.photoboxDesktop?.isDesktop);