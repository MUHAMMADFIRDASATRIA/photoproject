import React, { useEffect, useRef, useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { isDesktop } from '../lib/desktop';

const API_CLOUD_ORIGIN = 'http://localhost:4001';

/** Resolve gambar URL — jika path relatif (/uploads/...) tambahkan origin API Cloud */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_CLOUD_ORIGIN}${url}`;
  return url;
}

/** Gambar foto dengan object-cover (crop tengah) agar tidak terdistorsi dan rapi */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 8
) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const imgRatio = imgW / imgH;
  const targetRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = imgW;
  let sh = imgH;

  if (imgRatio > targetRatio) {
    sw = imgH * targetRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / targetRatio;
    sy = (imgH - sh) / 2;
  }

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

type PrintPhase = 'idle' | 'printing' | 'error';

export const PrintingScreen: React.FC = () => {
  const {
    selectedFrame,
    selectedDesign,
    capturedPhotos,
    completeTransaction,
    printCopies,
  } = useKioskStore();

  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [composing, setComposing] = useState(true);
  const [progress, setProgress] = useState(5);
  const [statusText, setStatusText] = useState('Menggabungkan foto ke dalam desain...');
  const [phase, setPhase] = useState<PrintPhase>('idle');
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [printerCount, setPrinterCount] = useState(0);
  const [printError, setPrintError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desktop = isDesktop();

  // 1. Komposisi gabungan frame + foto, cukup sekali
  useEffect(() => {
    let active = true;

    async function compose() {
      if (!selectedFrame || !selectedDesign) return;
      if (!active) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = selectedFrame.width || 1200;
      canvas.height = selectedFrame.height || 1800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      setStatusText('Menggabungkan foto ke dalam desain...');

      // Render Background Dasar (Warna)
      ctx.fillStyle = selectedDesign.bgColorHex || '#18181b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Background Image / Artwork
      const resolvedBgUrl = resolveImageUrl(selectedDesign.backgroundUrl);
      if (resolvedBgUrl) {
        try {
          const bgImg = new Image();
          bgImg.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            bgImg.onload = resolve;
            bgImg.onerror = () => resolve(null);
            bgImg.src = resolvedBgUrl;
          });
          if (bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
          }
        } catch (e) {
          console.error('Error drawing background:', e);
        }
      }

      // Render Foto User di slot-slot yang ditentukan
      const slots = selectedFrame.slotsConfig || [];
      for (let i = 0; i < capturedPhotos.length; i++) {
        const slot = slots[i] || {
          x: 100,
          y: 100 + i * 500,
          width: canvas.width - 200,
          height: 450,
        };

        const photoImg = new Image();
        photoImg.src = capturedPhotos[i];
        await new Promise((resolve) => {
          photoImg.onload = resolve;
          photoImg.onerror = resolve;
        });

        if (photoImg.complete && photoImg.naturalWidth > 0) {
          const rotation = (slot.rotation || 0) * (Math.PI / 180);
const radius = slot.radius ?? 10;
          if (rotation) {
            ctx.save();
            ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
            ctx.rotate(rotation);
            drawImageCover(ctx, photoImg, -slot.width / 2, -slot.height / 2, slot.width, slot.height, radius);
            ctx.restore();
          } else {
            drawImageCover(ctx, photoImg, slot.x, slot.y, slot.width, slot.height, radius);
          }
        }
      }

      setStatusText('Mengaplikasikan bingkai & dekorasi visual...');

      // Render Overlay PNG Transparan (jika ada)
      const resolvedOverlayUrl = resolveImageUrl(selectedDesign.overlayUrl);
      if (resolvedOverlayUrl && !resolvedOverlayUrl.includes('placeholder')) {
        try {
          const overlayImg = new Image();
          overlayImg.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            overlayImg.onload = resolve;
            overlayImg.onerror = resolve;
            overlayImg.src = resolvedOverlayUrl;
          });
          if (overlayImg.complete && overlayImg.naturalWidth > 0) {
            ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
          }
        } catch (e) {
          console.error('Error drawing overlay:', e);
        }
      }

      // Render Watermark Text
      if (!resolvedBgUrl) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        const todayStr = new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        ctx.fillText(`PHOTOBOX STUDIO • ${todayStr.toUpperCase()}`, canvas.width / 2, canvas.height - 40);
      }

      if (!active) return;
      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCompositeUrl(finalDataUrl);
      setComposing(false);
      setProgress(20);
      setStatusText('Desain siap. Tekan tombol Cetak untuk mencetak foto.');
    }

    compose();

    return () => {
      active = false;
    };
  }, [selectedFrame, selectedDesign, capturedPhotos]);

  // 2. Deteksi printer yang terpasang
  useEffect(() => {
    if (!desktop) {
      setPrinterCount(0);
      setPrinterName(null);
      return;
    }
    window.photoboxDesktop!.getPrinters().then((res) => {
      if (res.ok) {
        setPrinterCount(res.printers.length);
        setPrinterName(res.defaultPrinter?.name || res.printers[0]?.name || null);
      } else {
        setPrinterCount(0);
        setPrinterName(null);
      }
    });
  }, [desktop]);

  const runWhenPrintDone = async () => {
    if (!compositeUrl) return;
    setProgress(100);
    setStatusText('Cetak selesai! Menyiapkan QR Code...');
    await completeTransaction(compositeUrl, capturedPhotos);
  };

  const handlePrint = async () => {
    if (!compositeUrl || phase === 'printing') return;
    setPhase('printing');
    setPrintError(null);
    setProgress(35);
    setStatusText(
      desktop
        ? `Mencetak ke printer ${printerName ? `"${printerName}"` : 'default'}...`
        : 'Mencetak (mode simulasi, tanpa printer)...'
    );

    if (desktop) {
      const tick = setInterval(() => {
        setProgress((p) => Math.min(p + 4, 90));
      }, 200);

      try {
        const res = await window.photoboxDesktop!.printPhoto({
          dataUrl: compositeUrl,
          width: selectedFrame?.width || 1200,
          height: selectedFrame?.height || 1800,
          copies: printCopies,
          printer: printerName || undefined,
        });
        clearInterval(tick);
        if (res.ok) {
          await runWhenPrintDone();
        } else {
          setProgress(35);
          setPhase('error');
          setPrintError(res.error || 'Gagal mencetak. Pastikan printer terhubung dan menyala.');
          setStatusText('Cetak gagal. Periksa printer lalu coba lagi.');
        }
      } catch (e) {
        clearInterval(tick);
        setPhase('error');
        setPrintError(e instanceof Error ? e.message : String(e));
        setStatusText('Cetak gagal. Periksa printer lalu coba lagi.');
      }
    } else {
      await new Promise((r) => setTimeout(r, 1200));
      await runWhenPrintDone();
    }
  };

  const handleSkipPrint = async () => {
    if (!compositeUrl || phase === 'printing') return;
    await runWhenPrintDone();
  };

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-8 font-sans text-white select-none overflow-hidden">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Glows */}
      <div className="absolute h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>

      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 items-center gap-8 md:grid-cols-2">
        {/* Preview hasil komposit */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative max-h-[420px] overflow-hidden rounded-2xl border-4 border-white/80 bg-black shadow-2xl">
            {compositeUrl ? (
              <img
                src={compositeUrl}
                alt="Preview Cetak"
                className="max-h-[400px] w-auto rounded-xl object-contain"
              />
            ) : (
              <div className="flex h-80 w-56 items-center justify-center text-xs text-zinc-500">
                Menyiapkan desain...
              </div>
            )}
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Preview Kertas Foto • 300 DPI</span>
        </div>

        {/* Kontrol cetak */}
        <div className="flex flex-col space-y-5 rounded-3xl border border-zinc-800/80 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                {composing ? 'MENCETAK FOTO...' : 'Siap Cetak!'}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">{statusText}</p>
            </div>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-bold text-indigo-400 uppercase">
              Cetak Fisik
            </span>
          </div>

          {/* Info printer */}
          <div className="space-y-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3.5 text-xs">
            <div className="flex items-center gap-2">
              <span className={printerCount > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {printerCount > 0 ? '●' : '○'}
              </span>
              <span className="text-zinc-300">Printer:</span>
              <span className="font-semibold text-zinc-100">
                {desktop
                  ? printerName || (printerCount > 0 ? 'Mendeteksi...' : 'Tidak terdeteksi')
                  : 'Mode browser (tanpa printer)'}
              </span>
            </div>
            {desktop && printerCount === 0 && (
              <p className="text-[10px] text-amber-400/90">
                Tidak ada printer terpasang. Pastikan kabel USB/Wi-Fi printer tersambung ke mesin kiosk.
              </p>
            )}
          </div>

          {/* Jumlah cetakan (ditetapkan di awal, sebelum pembayaran) */}
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3.5">
            <span className="text-xs font-semibold text-zinc-300">Jumlah Cetakan</span>
            <span className="text-base font-black text-indigo-400">{printCopies} lembar</span>
          </div>

          {/* Tombol cetak */}
          <button
            onClick={handlePrint}
            disabled={!compositeUrl || composing || phase === 'printing'}
            className="group flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 text-lg font-black text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            {phase === 'printing' ? 'Mencetak...' : 'Cetak Sekarang'}
          </button>

          {/* Progress */}
          <div className="space-y-2">
            <div className="h-3 w-full overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Resolusi 300 DPI</span>
              <span>{progress}%</span>
            </div>
          </div>

          {phase === 'error' && (
            <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs">
              <p className="text-red-300">{printError}</p>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="rounded-lg bg-red-500 px-3 py-2 font-bold text-white transition hover:brightness-110"
                >
                  Coba Lagi
                </button>
                <button
                  onClick={handleSkipPrint}
                  className="rounded-lg bg-zinc-800 px-3 py-2 text-zinc-300 transition hover:bg-zinc-700"
                >
                  Lanjut Tanpa Cetak
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};