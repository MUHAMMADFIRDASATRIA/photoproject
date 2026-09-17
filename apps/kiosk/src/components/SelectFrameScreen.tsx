import React, { useEffect, useState, useRef } from 'react';
import { useKioskStore, FrameItem } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { KioskHeader } from './KioskHeader';
import { PolaroidMockup } from './PolaroidMockup';
import { FrameTemplatePreview } from './FrameTemplatePreview';
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  useEffect(() => {
    fetchFrames();
  }, [fetchFrames]);

  const displayFrames: FrameItem[] = frames.length > 0 ? frames : DEFAULT_FRAMES;

  const [activeFrameId, setActiveFrameId] = useState<number>(() => {
    if (selectedFrame) return selectedFrame.id;
    return displayFrames[0]?.id || 101;
  });

  useEffect(() => {
    if (displayFrames.length > 0 && !displayFrames.some((f) => f.id === activeFrameId)) {
      setActiveFrameId(displayFrames[0].id);
    }
  }, [displayFrames, activeFrameId]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [displayFrames]);

  const handleScrollBtn = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const amount = 340;

    if (direction === 'right') {
      if (scrollLeft + clientWidth >= scrollWidth - 25) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      }
    } else {
      if (scrollLeft <= 25) {
        scrollRef.current.scrollTo({ left: scrollWidth - clientWidth, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: -amount, behavior: 'smooth' });
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      if (e.deltaY !== 0) {
        scrollRef.current.scrollBy({ left: e.deltaY, behavior: 'auto' });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    startScrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseLeaveOrUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollRef.current.scrollLeft = startScrollLeftRef.current - walk;
  };

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
      <main className="my-auto flex flex-col items-center justify-center px-4 w-full overflow-hidden">
        {/* Judul & Subjudul */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-900 tracking-tight">
            Pilih Frame
          </h1>
          <p className="mt-1 text-sm sm:text-base text-zinc-500 font-medium">
            Mau cetak foto seperti apa?
          </p>

          {/* Kontrol Jumlah Cetakan */}
          <div className="mx-auto mt-3 flex items-center justify-center gap-3.5 rounded-full border border-zinc-200/90 bg-white px-5 py-2 shadow-xs w-fit">
            <span className="text-xs sm:text-sm font-bold text-zinc-700">Jumlah Cetakan:</span>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setPrintCopies(printCopies - 1)}
                disabled={printCopies <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 font-black text-zinc-800 transition hover:bg-zinc-200 active:scale-95 disabled:opacity-30 cursor-pointer text-sm"
              >
                −
              </button>
              <span className="w-6 text-center text-base font-black text-zinc-900">
                {printCopies}
              </span>
              <button
                onClick={() => setPrintCopies(printCopies + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 font-black text-zinc-800 transition hover:bg-zinc-200 active:scale-95 cursor-pointer text-sm"
              >
                +
              </button>
            </div>
            {printCopies > 1 && (
              <span className="text-xs font-bold text-amber-600 ml-1">
                ({printCopies} lembar)
              </span>
            )}
          </div>
        </div>

        {/* Container Track Frame dengan Tombol Geser Panah 360° Loop */}
        <div className="relative w-full max-w-7xl px-10 sm:px-14">
          {/* Tombol Panah Kiri (Selalu Tampil untuk 360 Loop) */}
          <button
            onClick={() => handleScrollBtn('left')}
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-800 shadow-xl border border-zinc-200/90 transition hover:bg-amber-400 hover:text-zinc-900 active:scale-95 cursor-pointer"
            title="Geser ke kiri (360° Loop)"
          >
            <svg className="h-6 w-6 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Tombol Panah Kanan (Selalu Tampil untuk 360 Loop) */}
          <button
            onClick={() => handleScrollBtn('right')}
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-800 shadow-xl border border-zinc-200/90 transition hover:bg-amber-400 hover:text-zinc-900 active:scale-95 cursor-pointer"
            title="Geser ke kanan (360° Loop)"
          >
            <svg className="h-6 w-6 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Track Scroll Horizontal Frame Besar */}
          <div
            ref={scrollRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMove}
            className="flex items-center gap-6 overflow-x-auto p-4 px-2 snap-x snap-mandatory scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing [scrollbar-width:thin] [scrollbar-color:#F59E0B_#F4F2EB] w-full"
          >
            {displayFrames.map((frame) => {
              const isSelected = frame.id === activeFrameId;
              const photoLabel = `${frame.photoCount} Foto`;
              const totalPrice = frame.price * printCopies;

              return (
                <div
                  key={frame.id}
                  onClick={() => setActiveFrameId(frame.id)}
                  className={`group relative flex flex-col items-center justify-between rounded-3xl bg-white p-6 sm:p-7 cursor-pointer transition-all duration-200 w-72 sm:w-84 shrink-0 h-[430px] sm:h-[470px] snap-center ${
                    isSelected
                      ? 'border-3 border-amber-400 shadow-2xl ring-4 ring-amber-400/20 scale-[1.03]'
                      : 'border border-zinc-200/80 shadow-xs hover:border-amber-300 hover:shadow-lg'
                  }`}
                >
                  {/* Badge Centang Pojok Kanan Atas */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-zinc-900 shadow-sm animate-in fade-in zoom-in duration-200">
                      <svg className="h-5 w-5 stroke-[3.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Preview Template Frame Putih Besar */}
                  <div className="flex h-56 sm:h-64 w-full items-center justify-center overflow-hidden py-1">
                    <FrameTemplatePreview frame={frame} />
                  </div>

                  {/* Informasi Frame */}
                  <div className="mt-2 text-center">
                    <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 truncate max-w-[260px]">
                      {frame.name}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-500 font-bold">
                      {photoLabel} • {frame.width}x{frame.height}px
                    </p>
                  </div>

                  {/* Tombol Harga Pill Besar */}
                  <div className="mt-3.5 w-full">
                    <div
                      className={`w-full py-3 rounded-full text-center text-lg font-black transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-zinc-900 shadow-sm'
                          : 'bg-[#EFECE6] text-zinc-800 group-hover:bg-[#E4E0D7]'
                      }`}
                    >
                      {formatRupiah(totalPrice)}
                    </div>
                    {printCopies > 1 && (
                      <span className="block text-center text-xs text-zinc-400 font-bold mt-1">
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
      <footer className="flex w-full shrink-0 items-center justify-between px-6 sm:px-12 py-3">
        {/* Tombol Kembali */}
        <button
          onClick={resetCustomerSession}
          className="flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white px-8 py-3 text-sm sm:text-base font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 active:scale-95 cursor-pointer"
        >
          <svg className="h-5 w-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Kembali</span>
        </button>

        {/* Tombol Lanjut */}
        <button
          onClick={handleContinue}
          className="flex items-center gap-2 rounded-full bg-amber-400 px-10 py-3 text-sm sm:text-base font-extrabold text-zinc-900 shadow-md transition hover:bg-amber-500 active:scale-95 cursor-pointer"
        >
          <span>Lanjut</span>
          <svg className="h-5 w-5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </KioskBackground>
  );
};
