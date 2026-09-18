import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useKioskStore } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { KioskHeader } from './KioskHeader';
import { isDesktop } from '../lib/desktop';
import { SAMPLE_FRIENDS_PHOTO } from '../lib/kioskMockData';
import { SessionCountdown } from './SessionCountdown';

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
    retakeSpecificPhoto,
    resetCustomerSession,
    timerExpired,
  } = useKioskStore();

  const desktop = isDesktop();
  const [reprintState, setReprintState] = useState<'idle' | 'printing' | 'error'>('idle');
  const [reprintMsg, setReprintMsg] = useState('');
  const [selectedModalImage, setSelectedModalImage] = useState<{ url: string; title: string } | null>(null);

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
        {/* Badge Pill: Selesai! & Timer Countdown */}
        <div className="mb-1 flex items-center justify-center gap-3">
          <span className="rounded-full bg-amber-300/90 px-5 py-0.5 text-xs font-bold tracking-wide text-zinc-900 shadow-2xs">
            Selesai!
          </span>
          <SessionCountdown />
        </div>

        {/* Judul & Subjudul */}
        <div className="text-center mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-900 tracking-tight">
            Foto Kamu Sudah Jadi!
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 font-medium">
            Terima kasih sudah menggunakan Photobox!
          </p>
        </div>

        {/* 3 Kolom Layout Redesigned (4 - 5 - 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch w-full max-w-7xl px-2">
          {/* Kolom 1: Hasil Foto Komposit (4 cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-white p-5 sm:p-6 border border-zinc-200/80 shadow-md flex flex-col justify-between">
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 w-full mb-3">
                <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Hasil Komposit Foto</span>
              </div>

              {/* Gambar Komposit */}
              <div
                onClick={() => setSelectedModalImage({ url: displayComposite, title: 'Hasil Komposit Foto' })}
                className="group relative w-full h-[300px] sm:h-[330px] rounded-2xl bg-zinc-100/70 p-2 shadow-inner flex items-center justify-center overflow-hidden border border-zinc-200/40 cursor-pointer"
                title="Klik untuk melihat preview ukuran besar"
              >
                <img
                  src={displayComposite}
                  alt="Hasil Komposit"
                  className="max-h-full max-w-full object-contain rounded-lg drop-shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
                />

                {/* Overlay Hover Icon Zoom */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                  <span className="flex items-center gap-1.5 bg-white/90 text-zinc-900 px-4 py-2 rounded-full font-bold text-xs shadow-lg backdrop-blur-xs">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                    Lihat Ukuran Besar
                  </span>
                </div>
              </div>
            </div>

            {/* Tombol Preview Ukuran Besar */}
            <div className="mt-3 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setSelectedModalImage({ url: displayComposite, title: 'Hasil Komposit Foto' })}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-100/80 hover:bg-amber-200 text-amber-950 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-amber-300/80 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <svg className="h-4 w-4 stroke-[2.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                <span>Preview Ukuran Besar</span>
              </button>
            </div>
          </div>

          {/* Kolom 2: Foto yang Diambil - DIDESAIN ULANG (5 cols, Foto Besar & Jelas) */}
          <div className="lg:col-span-5 rounded-3xl bg-white p-5 sm:p-6 border border-zinc-200/80 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-zinc-900">
                  <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span>Foto yang Diambil</span>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  {displayPhotos.length} Foto
                </span>
              </div>

              {/* List Foto Baris - Foto Jauh Lebih Besar & Jelas */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {displayPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF9F5] p-3 border border-zinc-200/80 hover:border-amber-300 transition-all shadow-2xs group/item"
                  >
                    {/* Thumbnail Foto Besar dengan Click to Zoom */}
                    <div
                      onClick={() => setSelectedModalImage({ url: photo, title: `Preview Foto ${idx + 1}` })}
                      className="relative w-28 sm:w-36 h-20 sm:h-24 overflow-hidden rounded-xl bg-zinc-200 border border-zinc-300/70 shadow-xs shrink-0 cursor-pointer group/img"
                      title="Klik untuk memperbesar foto"
                    >
                      <img
                        src={photo}
                        alt={`Foto ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                      />
                      {/* Overlay Hover Icon Zoom */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-zinc-900 shadow-md backdrop-blur-xs">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                          </svg>
                          Zoom
                        </span>
                      </div>
                    </div>

                    {/* Informasi Foto */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-extrabold text-zinc-900 leading-tight">
                        Foto {idx + 1}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-zinc-400 font-medium mt-0.5">
                        {formattedDateTime}
                      </p>
                      <button
                        onClick={() => setSelectedModalImage({ url: photo, title: `Preview Foto ${idx + 1}` })}
                        className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                        </svg>
                        <span>Perbesar Foto</span>
                      </button>
                    </div>

                    {/* Tombol Retake Per Foto */}
                    <button
                      onClick={() => !timerExpired && retakeSpecificPhoto(idx)}
                      disabled={timerExpired}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                        timerExpired
                          ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-60'
                          : 'bg-amber-100 text-amber-950 shadow-2xs border border-amber-300/80 hover:bg-amber-200 active:scale-95 cursor-pointer'
                      }`}
                      title={timerExpired ? "Waktu sesi retake sudah habis" : `Retake Foto ${idx + 1}`}
                    >
                      <svg className="h-4 w-4 stroke-[2.5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Retake</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tombol Retake Semua Foto */}
            <div className="mt-3 pt-3 border-t border-zinc-100">
              <button
                onClick={() => !timerExpired && retakeAllPhotos()}
                disabled={timerExpired}
                className={`w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 sm:py-3 text-xs sm:text-sm font-bold shadow-2xs transition ${
                  timerExpired
                    ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-60'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 active:scale-95 cursor-pointer'
                }`}
                title={timerExpired ? "Waktu sesi retake sudah habis" : "Retake Semua Foto"}
              >
                <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Retake Semua Foto</span>
              </button>
              {timerExpired && (
                <p className="mt-1 text-center text-[11px] font-bold text-red-500">
                  * Waktu sesi retake foto telah habis
                </p>
              )}
            </div>
          </div>

          {/* Kolom 3: Unduh Foto Kamu QR Code (3 cols - Presisi Tengah) */}
          <div className="lg:col-span-3 rounded-3xl bg-white p-5 sm:p-6 border border-zinc-200/80 shadow-md flex flex-col justify-between items-center text-center">
            {/* Header */}
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3 w-full mb-2">
              <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="text-left flex-1">Unduh Foto Kamu</span>
            </div>

            {/* QR Area Dead Center */}
            <div className="my-auto flex flex-col items-center justify-center w-full py-1">
              <div className="relative p-3.5 bg-white shadow-2xs rounded-2xl border border-zinc-100">
                <div className="absolute top-0 left-0 h-6 w-6 border-t-3 border-l-3 border-amber-400 rounded-tl-sm pointer-events-none" />
                <div className="absolute top-0 right-0 h-6 w-6 border-t-3 border-r-3 border-amber-400 rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-3 border-l-3 border-amber-400 rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-3 border-r-3 border-amber-400 rounded-br-sm pointer-events-none" />

                <QRCodeSVG value={qrDownloadLink} size={190} level="M" />
              </div>

              <p className="mt-3 text-center text-xs text-zinc-500 font-medium leading-relaxed max-w-[220px]">
                Scan QR di atas untuk mengunduh hasil foto ke HP kamu.
              </p>
            </div>

            {/* Footer Pill */}
            <div className="w-full pt-3 border-t border-zinc-100 flex justify-center">
              <div className="flex items-center gap-1.5 rounded-full bg-[#F4F2EB] px-4 py-1.5 text-xs font-medium text-zinc-600">
                <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Berlaku 24 jam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Cetak Kuning di Bawah Tengah */}
        <div className="relative mt-4 sm:mt-5 flex flex-col items-center">
          {/* Doodle Sinar Kiri */}
          <div className="pointer-events-none absolute -left-12 top-1 text-amber-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <line x1="4" y1="12" x2="10" y2="12" />
              <line x1="6" y1="6" x2="11" y2="10" />
              <line x1="6" y1="18" x2="11" y2="14" />
            </svg>
          </div>

          <button
            onClick={handleReprint}
            disabled={reprintState === 'printing'}
            className="group flex items-center gap-3 rounded-2xl bg-amber-400 px-10 py-2.5 sm:py-3 shadow-lg transition-all hover:bg-amber-500 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <svg className="h-7 w-7 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <div className="text-left">
              <span className="block text-base sm:text-lg font-black text-zinc-900 leading-tight">
                Cetak
              </span>
              <span className="block text-[11px] sm:text-xs font-bold text-zinc-800">
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

      {/* Modal Preview Foto Ukuran Besar (Universal untuk Komposit maupun Pose Foto) */}
      {selectedModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 transition-opacity animate-fadeIn"
          onClick={() => setSelectedModalImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] rounded-3xl bg-white p-5 shadow-2xl flex flex-col items-center justify-center border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tombol Tutup */}
            <button
              onClick={() => setSelectedModalImage(null)}
              className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl border-2 border-white hover:bg-amber-400 hover:text-zinc-900 transition-all cursor-pointer z-20 font-bold"
              title="Tutup Preview"
            >
              ✕
            </button>

            {/* Container Preview Gambar Besar */}
            <div className="max-h-[80vh] w-full overflow-hidden rounded-2xl flex items-center justify-center p-3 bg-zinc-100/60 shadow-inner border border-zinc-200/50">
              <img
                src={selectedModalImage.url}
                alt={selectedModalImage.title}
                className="max-h-[75vh] max-w-full object-contain rounded-xl drop-shadow-xl"
              />
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-600">
              <span>{selectedModalImage.title}</span>
              <span>•</span>
              <button
                onClick={() => setSelectedModalImage(null)}
                className="text-amber-600 hover:underline cursor-pointer"
              >
                Klik untuk menutup
              </button>
            </div>
          </div>
        </div>
      )}
    </KioskBackground>
  );
};

