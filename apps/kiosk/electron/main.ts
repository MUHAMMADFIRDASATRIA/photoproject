import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { print as printPdf, getPrinters, getDefaultPrinter } from 'pdf-to-printer';

const isDev = !app.isPackaged;
// Default port harus match dengan server.port di vite.config.ts (3000)
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

console.log(`[Electron] mode=${isDev ? 'dev' : 'prod'} loading=${isDev ? devServerUrl : 'dist/index.html'}`);

const preloadPath = path.join(__dirname, 'preload.js');

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    fullscreen: !isDev,
    kiosk: !isDev,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  }
}

// ---------------------------------------------------------------------------
// Pencetakan foto via pdf-to-printer (SumatraPDF):
//  1) tulis file HTML temp berisi <img src="dataURL jpeg">
//  2) render di hidden BrowserWindow, lalu printToPDF dengan ukuran kertas
//     proporsional terhadap canvas frame (mm dikonversi ke micron)
//  3) kirim ke printer sistem, lalu bersihkan semua file temp
// ---------------------------------------------------------------------------
interface PrintPhotoRequest {
  dataUrl: string;
  width?: number;
  height?: number;
  copies?: number;
  printer?: string;
}

function computePageSizeInches(width: number, height: number) {
  const maxDimMm = 152; // kira-kira ukuran kertas foto 4R (10x15cm)
  const ratio = width / height;
  let mmW = maxDimMm;
  let mmH = Math.round(mmW / ratio);
  if (mmH > maxDimMm) {
    mmH = maxDimMm;
    mmW = Math.round(mmH * ratio);
  }
  const inPerMm = 1 / 25.4;
  return { width: mmW * inPerMm, height: mmH * inPerMm };
}

async function handlePrintPhoto(opts: PrintPhotoRequest) {
  const { dataUrl, width = 1200, height = 1800, copies = 1, printer } = opts;
  const token = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const htmlPath = path.join(os.tmpdir(), `photobox_${token}.html`);
  const pdfPath = path.join(os.tmpdir(), `photobox_${token}.pdf`);

  try {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff}img{display:block;width:100%;height:100%;object-fit:fill}</style></head><body><img src="${dataUrl}"/></body></html>`;
    fs.writeFileSync(htmlPath, html, 'utf8');

    const printWin = new BrowserWindow({
      show: false,
      width: 800,
      height: 1200,
    });
    await printWin.loadFile(htmlPath);

    // Tunggu gambar benar-benar ter-decode sebelum render PDF
    await printWin.webContents.executeJavaScript(
      `new Promise((resolve) => { const img = document.querySelector('img'); if (img.complete) resolve(true); else { img.onload = () => resolve(true); img.onerror = () => resolve(false); } })`
    );

    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: computePageSizeInches(width, height),
      margins: { marginType: 'none' },
    });
    printWin.destroy();
    fs.writeFileSync(pdfPath, pdfBuffer);

    let usedPrinter: string | null = null;
    if (printer) {
      usedPrinter = printer;
    } else {
      const def = await getDefaultPrinter().catch(() => null);
      if (def) usedPrinter = def.name;
    }

    await printPdf(pdfPath, {
      printer: usedPrinter || undefined,
      copies,
      silent: true,
    });

    return { ok: true, printer: usedPrinter || 'default' };
  } catch (e) {
    console.error('[Photobox][Print] error:', e);
    return { ok: false, printer: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    for (const p of [htmlPath, pdfPath]) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
}

function registerIpcHandlers() {
  ipcMain.handle('photobox:get-printers', async () => {
    try {
      const printers = await getPrinters();
      const defaultPrinter = await getDefaultPrinter();
      return { ok: true, printers, defaultPrinter };
    } catch (e) {
      return {
        ok: false,
        printers: [],
        defaultPrinter: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

  ipcMain.handle('photobox:print-photo', (_event, opts: PrintPhotoRequest) => handlePrintPhoto(opts));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });

  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});