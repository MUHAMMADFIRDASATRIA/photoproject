import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useKioskStore, DesignItem } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { KioskHeader } from './KioskHeader';
import { DesignPreview } from './DesignPreview';
import { SessionCountdown } from './SessionCountdown';
import {
  MOCK_DESIGNS,
  ExtendedDesignItem,
} from '../lib/kioskMockData';

export const SelectDesignScreen: React.FC = () => {
  const {
    selectedFrame,
    designs,
    selectDesign,
    setStep,
    fetchDesignsForFrame,
    printCopies,
  } = useKioskStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  // Ambil desain yang dibuat di http://localhost:3001/designs untuk frame ini
  useEffect(() => {
    if (selectedFrame) {
      void fetchDesignsForFrame(selectedFrame.id);
    }
  }, [selectedFrame, fetchDesignsForFrame]);

  // Gabungkan desain server jika ada, atau gunakan mock designs sebagai fallback
  const allDesigns: ExtendedDesignItem[] = useMemo(() => {
    if (designs.length > 0) {
      return designs.map((d, index) => {
        const fallback = MOCK_DESIGNS[index % MOCK_DESIGNS.length];
        return {
          ...fallback,
          ...d,
          numberLabel: String(index + 1).padStart(2, '0'),
          category: fallback.category,
        };
      });
    }
    return MOCK_DESIGNS;
  }, [designs]);

  const [activeDesignId, setActiveDesignId] = useState<number>(() => {
    return allDesigns[0]?.id || 201;
  });

  useEffect(() => {
    if (allDesigns.length > 0 && !allDesigns.some((d) => d.id === activeDesignId)) {
      setActiveDesignId(allDesigns[0].id);
    }
  }, [allDesigns, activeDesignId]);

  // Handler Scroll Horizontal (Panah, Wheel, Drag)
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
  }, [allDesigns]);

  const handleScrollBtn = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const amount = 360;

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

  const chosenDesign =
    allDesigns.find((d) => d.id === activeDesignId) || allDesigns[0] || null;

  const handleConfirmDesign = () => {
    if (chosenDesign) {
      void selectDesign(chosenDesign);
    }
  };

  return (
    <KioskBackground>
      {/* Header dengan Stepper Langkah 3 */}
      <div className="relative w-full">
        <KioskHeader currentStepIndex={3} />
        <div className="absolute top-2.5 right-40 hidden md:block">
          <SessionCountdown />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="my-auto flex flex-col items-center justify-center px-4 w-full overflow-hidden">
        {/* Judul & Subjudul */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-900 tracking-tight">
            Pilih Desain Frame
          </h1>
          <p className="mt-1 text-sm sm:text-base text-zinc-500 font-medium">
            Pilih desain artwork favoritmu untuk hasil fotomu!
          </p>
        </div>

        {/* Track Desain Frame Horizontal (Penuh & 360 Loop) */}
        <div className="relative w-full max-w-7xl overflow-hidden flex items-center px-10 sm:px-14">
          {/* Tombol Panah Kiri (Selalu Tampil untuk 360 Scroll) */}
          <button
            onClick={() => handleScrollBtn('left')}
            className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-800 shadow-xl border border-zinc-200/90 transition hover:bg-amber-400 hover:text-zinc-900 active:scale-95 cursor-pointer"
            title="Geser ke kiri (360° Loop)"
          >
            <svg className="h-6 w-6 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Tombol Panah Kanan (Selalu Tampil untuk 360 Scroll) */}
          <button
            onClick={() => handleScrollBtn('right')}
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-800 shadow-xl border border-zinc-200/90 transition hover:bg-amber-400 hover:text-zinc-900 active:scale-95 cursor-pointer"
            title="Geser ke kanan (360° Loop)"
          >
            <svg className="h-6 w-6 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Track Scroll Horizontal Desain Lebih Besar */}
          <div
            ref={scrollRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMove}
            className="flex items-center gap-6 overflow-x-auto p-4 px-2 snap-x snap-mandatory scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing [scrollbar-width:thin] [scrollbar-color:#F59E0B_#F4F2EB] w-full"
          >
            {allDesigns.map((design, idx) => {
              const isSelected = design.id === activeDesignId;
              const numStr = String(idx + 1).padStart(2, '0');

              return (
                <div
                  key={design.id}
                  onClick={() => setActiveDesignId(design.id)}
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

                  {/* Preview Artwork Desain Besar */}
                  <div className="relative aspect-[3/4] h-60 sm:h-68 w-full overflow-hidden rounded-2xl border border-zinc-200/60 bg-zinc-50 flex items-center justify-center shadow-inner">
                    <DesignPreview frame={selectedFrame!} design={design} />
                  </div>

                  {/* Label & Nama Desain */}
                  <div className="mt-3 flex items-center gap-2.5 text-center">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-zinc-900 shrink-0">
                      {numStr}
                    </span>
                    <span className="text-lg font-black text-zinc-900 truncate max-w-[200px]" title={design.name}>
                      {design.name}
                    </span>
                  </div>

                  {/* Tombol Pill Pilih Desain */}
                  <div className="mt-4 w-full">
                    <div
                      className={`w-full py-3 rounded-full text-center text-sm font-extrabold transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-zinc-900 shadow-sm'
                          : 'bg-[#EFECE6] text-zinc-800 group-hover:bg-[#E4E0D7]'
                      }`}
                    >
                      {isSelected ? 'Desain Terpilih' : 'Pilih Desain Ini'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Navigasi Bawah */}
      <footer className="flex w-full shrink-0 items-center justify-between px-6 sm:px-12 py-3">
        <button
          onClick={() => setStep('PAYMENT')}
          className="flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white px-8 py-3 text-sm sm:text-base font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 active:scale-95 cursor-pointer"
        >
          <svg className="h-5 w-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Kembali</span>
        </button>

        <button
          onClick={handleConfirmDesign}
          disabled={!chosenDesign}
          className="flex items-center gap-2 rounded-full bg-amber-400 px-10 py-3 text-sm sm:text-base font-extrabold text-zinc-900 shadow-md transition hover:bg-amber-500 active:scale-95 cursor-pointer disabled:opacity-40"
        >
          <span>Pilih Desain</span>
          <svg className="h-5 w-5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </KioskBackground>
  );
};
