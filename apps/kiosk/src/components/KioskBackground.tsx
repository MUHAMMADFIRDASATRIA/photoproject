import React from 'react';

/**
 * Background dekoratif pastel krem hangat (#FAF7F0)
 * dengan aksen ombak kuning emas, polka dots, dan doodle ceria.
 * Ukuran dioptimalkan agar pas di layar Kiosk tanpa scrollbar vertikal berlebih.
 */
export const KioskBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#FAF7F0] font-['Plus_Jakarta_Sans',sans-serif] text-zinc-900 select-none flex flex-col justify-between">
      {/* Gelombang Kuning Pojok Kanan Atas */}
      <div className="pointer-events-none absolute -top-12 -right-12 z-0 h-56 w-56 md:h-72 md:w-72 opacity-95">
        <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <path d="M50 0C160 0 300 140 300 250V0H50Z" fill="#FBBF24" />
          <path d="M120 0C200 0 300 100 300 180V0H120Z" fill="#F59E0B" opacity="0.25" />
        </svg>
      </div>

      {/* Gelombang Kuning Pojok Kiri Bawah */}
      <div className="pointer-events-none absolute -bottom-14 -left-14 z-0 h-60 w-60 md:h-80 md:w-80 opacity-95">
        <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <path d="M0 50C0 160 140 300 250 300H0V50Z" fill="#FBBF24" />
          <path d="M0 120C0 200 100 300 180 300H0V120Z" fill="#F59E0B" opacity="0.2" />
        </svg>
      </div>

      {/* Polka Dots Kuning Pojok Kanan Bawah */}
      <div className="pointer-events-none absolute right-6 bottom-3 z-0 h-28 w-40 opacity-75">
        <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <pattern id="dot-pattern-br" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2" fill="#F59E0B" />
          </pattern>
          <rect width="160" height="120" fill="url(#dot-pattern-br)" />
        </svg>
      </div>

      {/* Polka Dots Kuning Pojok Kiri Atas */}
      <div className="pointer-events-none absolute left-6 top-5 z-0 h-24 w-36 opacity-60">
        <svg viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <pattern id="dot-pattern-tl" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2" fill="#FBBF24" />
          </pattern>
          <rect width="140" height="100" fill="url(#dot-pattern-tl)" />
        </svg>
      </div>

      {/* Ornamen Bintang & Sparkles Mengambang */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Sparkle Atas Kanan */}
        <div className="absolute top-16 right-72 text-amber-400 opacity-80 animate-pulse">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>

        {/* Sparkle Tengah Kiri */}
        <div className="absolute top-1/3 left-10 text-amber-500 opacity-70 animate-bounce duration-1000">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>

        {/* Doodle Hati Tengah Kanan */}
        <div className="absolute top-1/2 right-12 text-amber-400 opacity-60 rotate-12">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>

        {/* Sparkle Bawah Kanan */}
        <div className="absolute bottom-20 right-48 text-amber-500 opacity-75">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>

        {/* Doodle Sinar Matahari / Sparkle Bawah Kiri */}
        <div className="absolute bottom-28 left-20 text-amber-400 opacity-70 rotate-[-15deg]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" fill="#FBBF24" />
            <line x1="12" y1="1" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="23" y2="12" />
          </svg>
        </div>
      </div>

      {/* Konten Utama */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between p-3 sm:p-5 lg:p-6 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
