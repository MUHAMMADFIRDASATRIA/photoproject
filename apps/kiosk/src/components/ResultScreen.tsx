import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useKioskStore } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { KioskHeader } from './KioskHeader';
import { isDesktop } from '../lib/desktop';
import { SAMPLE_FRIENDS_PHOTO } from '../lib/kioskMockData';

export const ResultScreen: React.FC = () => {
  const {
    finalCompositeUrl,
    downloadUrl,
    currentTransaction,
    capturedPhotos,
    selectedFrame,
    printCopies,
    printerName,
    retakeAllPhotos,
    resetCustomerSession,
  } = useKioskStore();

  const desktop = isDesktop();
  const [reprintState, setReprintState] = useState<'idle' | 'printing' | 'error'>('idle');
  const [reprintMsg, setReprintMsg] = useState('');

  const handleReprint = async () => {
    if (reprintState === 'printing') return;
    const photoToPrint = finalCompositeUrl || SAMPLE_FRIENDS_PHOTO;

    if (!desktop) {
      setReprintState('error');
      setReprintMsg('Pencetakan fisik hanya aktif di Desktop Kiosk Electron.');
      return;
    }

    setReprintState('printing');
    setReprintMsg('');
    try {
      const res = await window.photoboxDesktop!.printPhoto({
        dataUrl: photoToPrint,
        width: selectedFrame?.width || 1200,
        height: selectedFrame?.height || 1800,
        copies: printCopies,
        printer: printerName || undefined,
      });
      if (res.ok) {
        setReprintState('idle');
        setReprintMsg(`Cetak terkirim ke printer (${res.printer || 'default'}).`);
      } else {
        setReprintState('error');
        setReprintMsg(res.error || 'Cetak gagal.');
      }
    } catch (e) {
      setReprintState('error');
      setReprintMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const qrDownloadLink =
    downloadUrl ||
    `http://localhost:4000/api/kiosk/photos/${currentTransaction?.id || 1}/download`;

  const displayComposite = finalCompositeUrl || SAMPLE_FRIENDS_PHOTO;
  const displayPhotos =
    capturedPhotos.length > 0 ? capturedPhotos : [SAMPLE_FRIENDS_PHOTO, SAMPLE_FRIENDS_PHOTO, SAMPLE_FRIENDS_PHOTO];

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDateTime = `${dateStr}, ${timeStr}`;

  return (
    <KioskBackground>
      {/* Header dengan Stepper Langkah 5 */}
      <KioskHeader currentStepIndex={5} />

      {/* Main Content Area */}
      <main className="my-auto flex flex-col items-center justify-center px-4 w-full">
        {/* Badge Pill: Selesai! */}
        <div className="mb-2">
          <span className="rounded-full bg-amber-300/90 px-6 py-1 text-xs sm:text-sm font-bold tracking-wide text-zinc-900 shadow-2xs">
            Selesai!
          </span>
        </div>

        {/* Judul & Subjudul */}
        <div className="text-center mb-5">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight">
            Foto Kamu Sudah Jadi!
          </h1>
          <p className="mt-1 text-sm sm:text-base text-zinc-500 font-medium">
            Terima kasih sudah menggunakan Photobox!
          </p>
        </div>

        {/* 3 Kolom Layout: Polaroid Besar | Foto yang Diambil + Retake | Unduh QR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full max-w-6xl">
          {/* Kolom 1: Mockup Polaroid Besar (5 cols) */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-4 pb-14 shadow-xl border border-zinc-200/80 rotate-[-1deg]">
              {/* Siku Kuning Kiri Atas */}
              <div className="absolute top-2.5 left-2.5 z-20 h-7 w-7 border-t-3 border-l-3 border-amber-400 rounded-tl-sm pointer-events-none" />
              {/* Siku Kuning Kanan Bawah */}
              <div className="absolute bottom-12 right-2.5 z-20 h-7 w-7 border-b-3 border-r-3 border-amber-400 rounded-br-sm pointer-events-none" />

              {/* Doodle Hati Pojok Kanan Atas */}
              <div className="absolute top-4 right-5 z-20 text-zinc-800">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>

              {/* Gambar Komposit */}
              <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100 shadow-inner">
                <img
                  src={displayComposite}
                  alt="Hasil Komposit"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Stiker Badge Good Vibes Only */}
              <div className="absolute -bottom-3 left-4 z-30 flex items-center gap-1.5 rounded-xl bg-amber-300 px-4 py-1.5 text-xs sm:text-sm font-black text-zinc-900 shadow-md rotate-[-8deg] border-2 border-white">
                <span>Good Vibes Only</span>
                <span className="text-sm">😊</span>
              </div>
            </div>
          </div>

          {/* Kolom 2: Foto yang Berhasil Diambil + Retake (4 cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-white p-6 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3 mb-3">
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Foto yang Berhasil Diambil</span>
              </div>

              {/* List Foto Baris */}
              <div className="space-y-2.5">
                {displayPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-[#FAF9F5] p-2 border border-zinc-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="aspect-[4/3] w-16 overflow-hidden rounded-md bg-zinc-200 border border-zinc-200/80 shadow-inner">
                        <img src={photo} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                          Foto {idx + 1}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-medium">
                          {formattedDateTime}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = photo;
                        link.download = `photo-${idx + 1}.jpg`;
                        link.click();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-800 shadow-2xs border border-zinc-200/80 hover:bg-zinc-100 cursor-pointer"
                      title="Unduh Pose Ini"
                    >
                      <svg className="h-4 w-4 stroke-[2.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tombol Retake Foto */}
            <div className="mt-4 pt-3 border-t border-zinc-100">
              <button
                onClick={retakeAllPhotos}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[#FEF3C7] py-2.5 text-xs sm:text-sm font-bold text-zinc-900 shadow-2xs transition hover:bg-amber-200 active:scale-95 cursor-pointer"
              >
                <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Retake Foto</span>
              </button>
            </div>
          </div>

          {/* Kolom 3: Unduh Foto Kamu QR Code (3 cols) */}
          <div className="lg:col-span-3 rounded-3xl bg-white p-6 border border-zinc-200/80 shadow-sm flex flex-col items-center justify-between">
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3 w-full mb-4">
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Unduh Foto Kamu</span>
              </div>

              {/* QR Code dengan Siku Kuning */}
              <div className="relative p-2.5 bg-white">
                <div className="absolute top-0 left-0 h-5 w-5 border-t-2.5 border-l-2.5 border-amber-400 rounded-tl-sm pointer-events-none" />
                <div className="absolute top-0 right-0 h-5 w-5 border-t-2.5 border-r-2.5 border-amber-400 rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2.5 border-l-2.5 border-amber-400 rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2.5 border-r-2.5 border-amber-400 rounded-br-sm pointer-events-none" />

                <QRCodeSVG value={qrDownloadLink} size={150} level="M" />
              </div>

              <p className="mt-3 text-center text-xs text-zinc-500 font-medium leading-relaxed">
                Scan QR di bawah ini untuk mengunduh foto kamu.
              </p>
            </div>

            {/* Pill Berlaku selama 24 jam */}
            <div className="mt-4 flex items-center gap-1.5 rounded-full bg-[#F4F2EB] px-4 py-1.5 text-xs font-medium text-zinc-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Berlaku selama 24 jam</span>
            </div>
          </div>
        </div>

        {/* Tombol Cetak Kuning di Bawah Tengah */}
        <div className="relative mt-6 sm:mt-7 flex flex-col items-center">
          {/* Doodle Sinar Kiri */}
          <div className="pointer-events-none absolute -left-14 top-2 text-amber-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <line x1="4" y1="12" x2="10" y2="12" />
              <line x1="6" y1="6" x2="11" y2="10" />
              <line x1="6" y1="18" x2="11" y2="14" />
            </svg>
          </div>

          <button
            onClick={handleReprint}
            disabled={reprintState === 'printing'}
            className="group flex items-center gap-3.5 rounded-2xl bg-amber-400 px-14 py-3.5 shadow-xl transition-all hover:bg-amber-500 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <svg className="h-8 w-8 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <div className="text-left">
              <span className="block text-lg sm:text-xl font-black text-zinc-900 leading-tight">
                Cetak
              </span>
              <span className="block text-xs font-bold text-zinc-800">
                Cetak hasil fotomu langsung!
              </span>
            </div>
          </button>

          {/* Doodle Sinar Kanan */}
          <div className="pointer-events-none absolute -right-14 top-2 text-amber-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <line x1="20" y1="12" x2="14" y2="12" />
              <line x1="18" y1="6" x2="13" y2="10" />
              <line x1="18" y1="18" x2="13" y2="14" />
            </svg>
          </div>

          {reprintMsg && (
            <p className={`mt-2 text-xs sm:text-sm font-bold ${reprintState === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
              {reprintMsg}
            </p>
          )}

          {/* Tombol Selesai Sesi */}
          <button
            onClick={resetCustomerSession}
            className="mt-3 text-xs sm:text-sm font-bold text-zinc-400 hover:text-zinc-700 underline cursor-pointer"
          >
            Selesai dan Kembali ke Awal
          </button>
        </div>
      </main>
    </KioskBackground>
  );
};
