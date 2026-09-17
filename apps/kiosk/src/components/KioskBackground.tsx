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
          <pattern id="dot-pattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="2" fill="#F59E0B" />
          </pattern>
          <rect width="160" height="120" fill="url(#dot-pattern)" />
        </svg>
      </div>

      {/* Konten Utama */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between p-3 sm:p-5 lg:p-6 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
