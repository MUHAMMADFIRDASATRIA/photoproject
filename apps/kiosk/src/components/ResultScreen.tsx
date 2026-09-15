import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useKioskStore } from '../store/kioskStore';
import { isDesktop } from '../lib/desktop';

export const ResultScreen: React.FC = () => {
  const {
    finalCompositeUrl,
    downloadUrl,
    currentTransaction,
    capturedPhotos,
    selectedFrame,
    printCopies,
    retakeSpecificPhoto,
    retakeAllPhotos,
    resetCustomerSession,
  } = useKioskStore();

  const desktop = isDesktop();
  const [reprintState, setReprintState] = useState<'idle' | 'printing' | 'error'>('idle');
  const [reprintMsg, setReprintMsg] = useState('');

  const handleReprint = async () => {
    if (!finalCompositeUrl || reprintState === 'printing') return;
    setReprintState('printing');
    setReprintMsg('');
    try {
      const res = await window.photoboxDesktop!.printPhoto({
        dataUrl: finalCompositeUrl,
        width: selectedFrame?.width || 1200,
        height: selectedFrame?.height || 1800,
        copies: printCopies,
      });
      if (res.ok) {
        setReprintState('idle');
        setReprintMsg(`Cetak ulang terkirim ke printer (${res.printer || 'default'}).`);
      } else {
        setReprintState('error');
        setReprintMsg(res.error || 'Cetak ulang gagal.');
      }
    } catch (e) {
      setReprintState('error');
      setReprintMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const qrDownloadLink =
    downloadUrl ||
    `http://localhost:4000/api/kiosk/photos/${currentTransaction?.id || 1}/download`;

  return (
    <div className="relative flex min-h-screen w-screen flex-col justify-between bg-zinc-950 p-6 md:p-8 font-sans text-white select-none overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 font-bold text-lg">
            ✓
          </span>
          <div>
            <h1 className="text-2xl font-black text-white">CETAK FOTO SELESAI!</h1>
            <p className="text-xs text-zinc-400">
              Foto fisikmu siap keluar di dispenser printer • Kamu juga bisa retake foto yang kurang pas di bawah
            </p>
          </div>
        </div>

        <button
          onClick={resetCustomerSession}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 active:scale-95 cursor-pointer"
        >
          <span>Selesai Sesi</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      {/* Main Content: 3-column or responsive grid */}
      <div className="my-auto max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start py-4">
        {/* Left Column (4 cols): Printed Photo Mockup */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="relative max-h-[500px] overflow-hidden rounded-2xl border-4 border-white bg-black shadow-2xl p-1">
            {finalCompositeUrl ? (
              <img
                src={finalCompositeUrl}
                alt="Printed Composite"
                className="max-h-[460px] w-auto object-contain rounded-xl"
              />
            ) : (
              <div className="h-96 w-64 flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs">
                Foto Komposit Siap
              </div>
            )}
          </div>
          <span className="mt-2 text-[11px] text-zinc-400 font-mono">
            Preview Cetak Kertas Foto • 300 DPI
          </span>

          {/* Cetak Ulang (hanya di aplikasi desktop/Electron) */}
          {desktop && (
            <div className="mt-3 flex flex-col items-center space-y-1.5">
              <button
                onClick={handleReprint}
                disabled={reprintState === 'printing'}
                className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                {reprintState === 'printing' ? 'Mencetak ulang...' : 'Cetak Ulang'}
              </button>
              {reprintMsg && (
                <p className={`text-[11px] ${reprintState === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {reprintMsg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Center Column (4 cols): Interactive Pose Retake Panel */}
        <div className="lg:col-span-4 rounded-3xl border border-zinc-800/80 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-2xl flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                🔄 Foto Ulang (Retake)
              </span>
              <button
                onClick={retakeAllPhotos}
                className="text-[11px] font-semibold text-zinc-400 hover:text-amber-300 transition underline underline-offset-2"
              >
                Foto Ulang Semua
              </button>
            </div>
            <h2 className="mt-3 text-lg font-bold text-white">Ada Pose Kurang Pas?</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Jika ada foto yang ngeblur, mata tertutup, atau salah gaya, pilih pose di bawah untuk diambil ulang:
            </p>
          </div>

          {/* List of Captured Poses */}
          <div className="space-y-3 my-2 overflow-y-auto max-h-[300px] pr-1">
            {capturedPhotos.map((photo, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-amber-500/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-700 bg-black">
                    <img src={photo} alt={`Pose ${idx + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      #{idx + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Pose #{idx + 1}</h3>
                    <p className="text-[10px] text-zinc-500">Slot foto ke-{idx + 1}</p>
                  </div>
                </div>

                <button
                  onClick={() => retakeSpecificPhoto(idx)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-black transition active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Take Ulang</span>
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-zinc-950/40 p-3 border border-zinc-800/60 text-[11px] text-zinc-400">
            💡 Foto yang di-retake akan otomatis menggantikan slot foto lama dan memperbarui cetakan serta file digitalmu.
          </div>
        </div>

        {/* Right Column (4 cols): QR Code Download Card */}
        <div className="lg:col-span-4 rounded-3xl border border-zinc-800/80 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-2xl text-center space-y-4 flex flex-col justify-between h-full">
          <div>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              📲 Versi Digital
            </span>
            <h2 className="mt-3 text-lg font-bold text-white">Scan Untuk Unduh Foto</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Arahkan kamera smartphone ke kode QR untuk menyimpan softcopy HD.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="mx-auto inline-flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-xl">
            <QRCodeSVG value={qrDownloadLink} size={160} level="M" />
            <span className="mt-1.5 text-[10px] font-mono text-gray-500">Scan via Kamera HP</span>
          </div>

          <div className="rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/80 text-left text-[11px] space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-300">
              <span>🔒 Foto tersimpan aman di cloud</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <span>✨ Siap disimpan ke galeri atau media sosial</span>
            </div>
          </div>

          <button
            onClick={resetCustomerSession}
            className="w-full rounded-xl bg-zinc-800 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition active:scale-95"
          >
            Selesai & Keluar Sesi
          </button>
        </div>
      </div>

      {/* Bottom info */}
      <div className="text-center text-[11px] text-zinc-500 pt-2 border-t border-zinc-900">
        Terima kasih telah berfoto di Photobox Studio! Silakan ambil hasil cetakan foto Anda di slot dispenser bawah mesin.
      </div>
    </div>
  );
};
