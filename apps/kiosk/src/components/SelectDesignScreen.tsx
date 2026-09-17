import React, { useEffect, useState } from 'react';
import { useKioskStore, DesignItem } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { KioskHeader } from './KioskHeader';
import { PolaroidMockup } from './PolaroidMockup';
import { DesignPreview } from './DesignPreview';
import { SessionCountdown } from './SessionCountdown';

export const SelectDesignScreen: React.FC = () => {
  const {
    selectedFrame,
    designs,
    selectDesign,
    setStep,
    fetchDesignsForFrame,
    printCopies,
  } = useKioskStore();

  // Ambil desain yang dibuat di http://localhost:3001/designs untuk frame ini
  useEffect(() => {
    if (selectedFrame) {
      void fetchDesignsForFrame(selectedFrame.id);
    }
  }, [selectedFrame, fetchDesignsForFrame]);

  const [activeDesignId, setActiveDesignId] = useState<number | null>(() => {
    return designs[0]?.id || null;
  });

  // Sinkronkan activeDesignId ketika daftar desain dari server termuat
  useEffect(() => {
    if (designs.length > 0 && (!activeDesignId || !designs.some((d) => d.id === activeDesignId))) {
      setActiveDesignId(designs[0].id);
    }
  }, [designs, activeDesignId]);

  const chosenDesign =
    designs.find((d) => d.id === activeDesignId) || designs[0] || null;

  const handleConfirmDesign = () => {
    if (chosenDesign) {
      void selectDesign(chosenDesign);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalPrice = (selectedFrame?.price || 15000) * printCopies;

  return (
    <KioskBackground>
      {/* Header dengan Stepper Langkah 3 */}
      <div className="relative w-full">
        <KioskHeader currentStepIndex={3} />
        <div className="absolute top-2 right-36 hidden md:block">
          <SessionCountdown />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="my-auto flex flex-col items-center justify-center px-4 w-full overflow-hidden">
        {/* Judul & Subjudul */}
        <div className="text-center mb-3 sm:mb-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight">
            Pilih Desain Frame
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 font-medium">
            Pilih desain artwork favoritmu untuk hasil fotomu!
          </p>
        </div>

        {/* Layout: Kiri Ringkasan Frame | Kanan Grid Desain dari Dashboard */}
        <div className="flex flex-col lg:flex-row items-stretch gap-5 w-full max-w-5xl">
          {/* Kolom Kiri: Kartu Ringkasan Frame Terpilih */}
          <div className="relative w-full lg:w-72 shrink-0 rounded-2xl bg-white p-5 border border-zinc-200/80 shadow-sm flex flex-col justify-between items-center h-[380px]">
            {/* Doodle Hati */}
            <div className="absolute top-4 right-5 text-zinc-800">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>

            {/* Preview Frame */}
            <div className="flex h-40 w-full items-center justify-center overflow-hidden">
              {selectedFrame?.thumbnailUrl ? (
                <div className="h-full w-full rounded-xl overflow-hidden bg-zinc-100 p-1 border border-zinc-200/60 flex items-center justify-center">
                  <img
                    src={selectedFrame.thumbnailUrl}
                    alt={selectedFrame.name}
                    className="h-full w-auto object-contain rounded-lg"
                  />
                </div>
              ) : (
                <PolaroidMockup type={selectedFrame?.name || '2R'} className="scale-70" />
              )}
            </div>

            <div className="mt-2 text-left w-full">
              <h3 className="text-xl font-extrabold text-zinc-900 truncate">
                {selectedFrame?.name || 'Frame'}
              </h3>
              <p className="text-xs text-zinc-500 font-bold mt-0.5">
                {selectedFrame?.photoCount || 1} Foto • {printCopies} Lembar Cetak
              </p>

              <div className="mt-2.5">
                <span className="inline-block rounded-full bg-amber-100 px-4 py-1 text-xs font-black text-zinc-900">
                  Total: {formatRupiah(totalPrice)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400 font-medium border-t border-zinc-100 pt-2.5">
                <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path strokeWidth={2} d="M21 15l-5-5L5 21" />
                </svg>
                <span>Dimensi: {selectedFrame?.width}x{selectedFrame?.height}px</span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Grid Desain Frame dari http://localhost:3001/designs */}
          <div className="flex-1 w-full flex flex-col justify-center">
            {designs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-8 border border-zinc-200/80 shadow-2xs text-center h-[380px]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-xl mb-3">
                  🎨
                </div>
                <h4 className="text-base font-bold text-zinc-800">
                  Belum ada tema desain untuk frame ini
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Desain dapat dibuat dan diatur di Dashboard Admin (<span className="font-mono text-zinc-700 font-semibold">http://localhost:3001/designs</span>).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto p-1 [scrollbar-width:none]">
                {designs.map((design, idx) => {
                  const isSelected = design.id === activeDesignId;
                  const numStr = String(idx + 1).padStart(2, '0');

                  return (
                    <div
                      key={design.id}
                      onClick={() => setActiveDesignId(design.id)}
                      className={`group relative flex flex-col items-center rounded-2xl bg-white p-2.5 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-2 border-amber-400 shadow-md ring-2.5 ring-amber-400/25 scale-[1.02]'
                          : 'border border-zinc-200/80 shadow-2xs hover:border-amber-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Badge Centang Terpilih */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-zinc-900 shadow-xs">
                          <svg className="h-4 w-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {/* Komponen DesignPreview Otentik dari Dashboard */}
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 flex items-center justify-center shadow-inner">
                        <DesignPreview frame={selectedFrame!} design={design} />
                      </div>

                      {/* Label Bawah */}
                      <div className="mt-2 flex items-center gap-1.5 text-center w-full justify-center">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-zinc-900 shrink-0">
                          {numStr}
                        </span>
                        <span className="text-xs font-bold text-zinc-800 truncate max-w-[100px]" title={design.name}>
                          {design.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Navigasi Bawah */}
      <footer className="flex w-full shrink-0 items-center justify-between px-6 sm:px-12 py-2">
        <button
          onClick={() => setStep('PAYMENT')}
          className="flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white px-7 py-2.5 text-sm font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 active:scale-95 cursor-pointer"
        >
          <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Kembali</span>
        </button>

        <button
          onClick={handleConfirmDesign}
          disabled={!chosenDesign}
          className="flex items-center gap-2 rounded-full bg-amber-400 px-9 py-2.5 text-sm font-extrabold text-zinc-900 shadow-md transition hover:bg-amber-500 active:scale-95 cursor-pointer disabled:opacity-40"
        >
          <span>Pilih Desain</span>
          <svg className="h-4 w-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </KioskBackground>
  );
};
