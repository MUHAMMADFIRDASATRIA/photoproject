import React, { useEffect, useState } from 'react';
import { useKioskStore, FrameItem } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { KioskHeader } from './KioskHeader';
import { PolaroidMockup } from './PolaroidMockup';
import { DEFAULT_FRAMES } from '../lib/kioskMockData';

export const SelectFrameScreen: React.FC = () => {
  const {
    frames,
    selectFrame,
    resetCustomerSession,
    fetchFrames,
    selectedFrame,
    printCopies,
    setPrintCopies,
  } = useKioskStore();

  useEffect(() => {
    fetchFrames();
  }, [fetchFrames]);

  // Utamakan frame yang sudah dibuat di dashboard (http://localhost:3001/frames).
  // Jika database masih kosong, sediakan fallback default (2R, 4R, STRIP).
  const displayFrames: FrameItem[] = frames.length > 0 ? frames : DEFAULT_FRAMES;

  // Frame aktif terpilih
  const [activeFrameId, setActiveFrameId] = useState<number>(() => {
    if (selectedFrame) return selectedFrame.id;
    return displayFrames[0]?.id || 101;
  });

  // Pastikan jika frames berubah dari server, activeFrameId tetap valid
  useEffect(() => {
    if (displayFrames.length > 0 && !displayFrames.some((f) => f.id === activeFrameId)) {
      setActiveFrameId(displayFrames[0].id);
    }
  }, [displayFrames, activeFrameId]);

  const currentChosenFrame =
    displayFrames.find((f) => f.id === activeFrameId) || displayFrames[0];

  const handleContinue = () => {
    if (currentChosenFrame) {
      selectFrame(currentChosenFrame);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <KioskBackground>
      {/* Header dengan Stepper Langkah 1 */}
      <KioskHeader currentStepIndex={1} />

      {/* Main Content Area */}
      <main className="my-auto flex flex-col items-center justify-center px-4 w-full">
        {/* Judul & Subjudul */}
        <div className="text-center mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight">
            Pilih Frame
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 font-medium">
            Mau cetak foto seperti apa?
          </p>

          {/* Kontrol Jumlah Cetakan */}
          <div className="mx-auto mt-2.5 flex items-center justify-center gap-3 rounded-full border border-zinc-200/90 bg-white px-4 py-1.5 shadow-2xs w-fit">
            <span className="text-xs font-bold text-zinc-700">Jumlah Cetakan:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrintCopies(printCopies - 1)}
                disabled={printCopies <= 1}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 font-black text-zinc-700 transition hover:bg-zinc-200 active:scale-95 disabled:opacity-30 cursor-pointer text-xs"
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-black text-zinc-900">
                {printCopies}
              </span>
              <button
                onClick={() => setPrintCopies(printCopies + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 font-black text-zinc-700 transition hover:bg-zinc-200 active:scale-95 cursor-pointer text-xs"
              >
                +
              </button>
            </div>
            {printCopies > 1 && (
              <span className="text-[11px] font-bold text-amber-600 ml-1">
                ({printCopies} lembar)
              </span>
            )}
          </div>
        </div>

        {/* Daftar Frame Utama dari Dashboard */}
        <div className="relative w-full max-w-5xl">
          <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto p-2 px-4 snap-x snap-mandatory [scrollbar-width:none]">
            {displayFrames.map((frame) => {
              const isSelected = frame.id === activeFrameId;
              const photoLabel = `${frame.photoCount} Foto`;
              const totalPrice = frame.price * printCopies;

              return (
                <div
                  key={frame.id}
                  onClick={() => setActiveFrameId(frame.id)}
                  className={`group relative flex flex-col items-center justify-between rounded-3xl bg-white p-5 sm:p-6 cursor-pointer transition-all duration-200 w-64 sm:w-72 shrink-0 h-[370px] sm:h-[400px] snap-center ${
                    isSelected
                      ? 'border-2.5 border-amber-400 shadow-xl ring-3 ring-amber-400/20 scale-[1.02]'
                      : 'border border-zinc-200/80 shadow-2xs hover:border-amber-300 hover:shadow-md'
                  }`}
                >
                  {/* Badge Centang Pojok Kanan Atas */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-zinc-900 shadow-xs animate-in fade-in zoom-in duration-200">
                      <svg className="h-4 w-4 stroke-[3.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Mockup Preview Foto Polaroid atau Thumbnail Frame */}
                  <div className="flex h-44 w-full items-center justify-center overflow-hidden">
                    {frame.thumbnailUrl ? (
                      <div className="h-full w-full rounded-xl overflow-hidden bg-zinc-100 p-1 border border-zinc-200/60 shadow-inner flex items-center justify-center">
                        <img
                          src={frame.thumbnailUrl}
                          alt={frame.name}
                          className="h-full w-auto object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <PolaroidMockup type={frame.name} className="scale-75" />
                    )}
                  </div>

                  {/* Informasi Frame */}
                  <div className="mt-2 text-center">
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-900 truncate max-w-[240px]">
                      {frame.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500 font-bold">
                      {photoLabel} • {frame.width}x{frame.height}px
                    </p>
                  </div>

                  {/* Tombol Harga Pill */}
                  <div className="mt-3 w-full">
                    <div
                      className={`w-full py-2.5 rounded-full text-center text-base font-extrabold transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-zinc-900 shadow-sm'
                          : 'bg-[#EFECE6] text-zinc-800 group-hover:bg-[#E4E0D7]'
                      }`}
                    >
                      {formatRupiah(totalPrice)}
                    </div>
                    {printCopies > 1 && (
                      <span className="block text-center text-[10px] text-zinc-400 font-bold mt-1">
                        {printCopies} × {formatRupiah(frame.price)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Navigasi Bawah */}
      <footer className="flex w-full shrink-0 items-center justify-between px-6 sm:px-12 py-2">
        {/* Tombol Kembali */}
        <button
          onClick={resetCustomerSession}
          className="flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white px-7 py-2.5 text-sm font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 active:scale-95 cursor-pointer"
        >
          <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Kembali</span>
        </button>

        {/* Tombol Lanjut */}
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 rounded-full bg-amber-400 px-9 py-2.5 text-sm font-extrabold text-zinc-900 shadow-md transition hover:bg-amber-500 active:scale-95 cursor-pointer"
        >
          <span>Lanjut</span>
          <svg className="h-4 w-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </KioskBackground>
  );
};
