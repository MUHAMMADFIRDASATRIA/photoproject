import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { DeviceSettingsModal } from './DeviceSettingsModal';

export const AttractScreen: React.FC = () => {
  const { setStep, logoutDevice } = useKioskStore();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  return (
    <KioskBackground>
      {/* Container Utama yang dapat diklik di mana saja untuk mulai */}
      <div
        onClick={() => setStep('SELECT_FRAME')}
        className="relative flex h-full w-full cursor-pointer select-none flex-col items-center justify-between py-4 text-center font-['Plus_Jakarta_Sans',sans-serif]"
      >
        {/* Top Bar: Tombol Pengaturan Perangkat / Teknisi di Kanan Atas */}
        <div className="flex w-full items-center justify-end px-4 sm:px-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfigModal(true);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-700 shadow-xs transition hover:bg-amber-400 hover:text-zinc-900 active:scale-95 cursor-pointer"
            title="Pengaturan Teknisi (Kamera & Printer)"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Center Section: Logo, Title, Subtitle, & Touch Button dengan Stiker & Doodle Dekoratif */}
        <div className="relative my-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8 px-4 max-w-4xl">
          {/* Stiker Polaroid Dekoratif Kiri (Miring Kiri) */}
          <div className="hidden lg:block absolute -left-28 xl:-left-36 top-4 rotate-[-8deg] w-32 xl:w-36 rounded-2xl bg-white p-2.5 shadow-xl border border-zinc-200/80 pointer-events-none transition-transform hover:scale-105">
            <div className="aspect-[4/3] w-full rounded-xl bg-amber-100/80 flex items-center justify-center border border-amber-200/60 overflow-hidden">
              <svg className="h-10 w-10 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
                <path strokeLinecap="round" d="M9 10h.01M15 10h.01" strokeWidth={3} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 14c1.5 2 6.5 2 8 0" strokeWidth={2} />
              </svg>
            </div>
            <span className="block mt-2 text-center font-['Caveat',cursive] text-lg font-bold text-zinc-800">
              Best Friends ♡
            </span>
          </div>

          {/* Stiker Polaroid Dekoratif Kanan (Miring Kanan) */}
          <div className="hidden lg:block absolute -right-28 xl:-right-36 top-8 rotate-[10deg] w-32 xl:w-36 rounded-2xl bg-white p-2.5 shadow-xl border border-zinc-200/80 pointer-events-none transition-transform hover:scale-105">
            <div className="aspect-[4/3] w-full rounded-xl bg-amber-200/70 flex items-center justify-center border border-amber-300/60 overflow-hidden">
              <svg className="h-10 w-10 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" strokeWidth={1.8} />
              </svg>
            </div>
            <span className="block mt-2 text-center font-['Caveat',cursive] text-lg font-bold text-zinc-800">
              Good Vibes ✨
            </span>
          </div>

          {/* Doodle Tulis Tangan Say Cheese! */}
          <div className="absolute -top-10 left-10 sm:left-20 hidden md:flex items-center gap-1 font-['Caveat',cursive] text-xl font-bold text-zinc-800 rotate-[-8deg] pointer-events-none">
            <span>Say Cheese! 📸</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 18C10 18 16 12 18 4M18 4L13 6M18 4L17 9" />
            </svg>
          </div>

          {/* Logo Kamera Kuning Membal (Bounce) */}
          <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-amber-400 p-2 shadow-2xl border-4 border-white animate-bounce">
            <svg className="h-12 w-12 sm:h-14 sm:w-14 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <circle cx="12" cy="13" r="3.2" strokeWidth="2.2" />
            </svg>
          </div>

          {/* Judul & Subjudul */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-zinc-900">
              PHOTOBOX STUDIO
            </h1>
            <p className="text-base sm:text-lg lg:text-xl font-medium text-zinc-500">
              Cetak Momen Terbaikmu Secara Instan & Seru!
            </p>
          </div>

          {/* Tombol Sentuh Layar Untuk Memulai */}
          <div className="relative pt-2">
            {/* Sparkles Sisi Tombol */}
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-amber-500 animate-pulse hidden sm:block">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-amber-500 animate-pulse hidden sm:block">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-3.5 rounded-full bg-amber-400 px-10 sm:px-12 py-4 sm:py-4.5 text-base sm:text-lg font-black text-zinc-900 shadow-xl transition-all hover:bg-amber-500 hover:scale-105 active:scale-95">
              <svg className="h-6 w-6 text-zinc-900 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.4}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              <span className="uppercase tracking-wide">SENTUH LAYAR UNTUK MEMULAI</span>
            </div>
          </div>
        </div>

        {/* Bottom space (clean without extra text) */}
        <div className="h-6 w-full shrink-0" />
      </div>

      {/* Modal Konfirmasi Pengaturan Teknisi */}
      {showConfigModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200/80 text-left">
            <h3 className="text-lg font-black text-zinc-900">Menu Pengaturan Teknisi</h3>
            <p className="mt-1 text-xs text-zinc-500 font-medium">
              Akses khusus teknisi untuk mengatur perangkat kamera & printer lokal mesin ini.
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setShowDeviceSettings(true);
                }}
                className="w-full rounded-2xl bg-amber-400 py-3 text-xs font-black text-zinc-900 shadow-sm transition hover:bg-amber-500 cursor-pointer"
              >
                ⚙️ Pengaturan Perangkat (Kamera & Printer)
              </button>

              <button
                onClick={() => {
                  setShowConfigModal(false);
                  void logoutDevice();
                }}
                className="w-full rounded-2xl bg-red-50 py-3 text-xs font-bold text-red-600 border border-red-200 hover:bg-red-100 transition cursor-pointer"
              >
                🚪 Keluar dari Akun Device Ini
              </button>

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full rounded-2xl bg-zinc-100 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Kamera & Printer Mesin */}
      {showDeviceSettings && (
        <DeviceSettingsModal onClose={() => setShowDeviceSettings(false)} />
      )}
    </KioskBackground>
  );
};
