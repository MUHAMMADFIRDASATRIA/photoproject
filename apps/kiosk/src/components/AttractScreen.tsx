import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { DeviceSettingsModal } from './DeviceSettingsModal';

export const AttractScreen: React.FC = () => {
  const { device, setStep, logoutDevice, frames } = useKioskStore();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  const minPrice = frames.length > 0 ? Math.min(...frames.map((f) => f.price)) : 35000;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      onClick={() => setStep('SELECT_FRAME')}
      className="relative flex h-screen w-screen cursor-pointer select-none flex-col items-center justify-between overflow-hidden bg-zinc-950 p-12 text-center font-sans text-white transition-all"
    >
      {/* Dynamic Background Glows */}
      <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-indigo-600/30 blur-[140px] animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-purple-600/30 blur-[140px] animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-pink-600/10 blur-[180px]"></div>

      {/* Top Bar: Location & Hidden Settings */}
      <div className="relative z-10 flex w-full items-center justify-between">
        <div className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-2 backdrop-blur-xl">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-semibold tracking-wide text-zinc-300">
            📍 {device?.branchName || 'Cabang Grand Indonesia'}
          </span>
        </div>

        {/* Hidden Technician Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfigModal(true);
          }}
          className="rounded-full border border-zinc-800 bg-zinc-900/40 p-2.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
          title="Pengaturan Teknisi"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Main Center Call-To-Action */}
      <div className="relative z-10 flex flex-col items-center space-y-8 my-auto">
        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-2xl shadow-indigo-500/30 animate-bounce">
          <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-zinc-950">
            <svg className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            PHOTOBOX STUDIO
          </h1>
          <p className="mt-4 text-base md:text-xl font-medium text-zinc-400 tracking-wide">
            Cetak Momen Terbaikmu Secara Instan & Seru!
          </p>
        </div>

        {/* Pulsing Touch Indicator */}
        <div className="mt-4 inline-flex items-center gap-4 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-8 py-4 shadow-xl shadow-indigo-500/20 backdrop-blur-xl">
          <svg className="h-6 w-6 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span className="text-base font-extrabold uppercase tracking-widest text-white">
            Sentuh Layar Untuk Memulai
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-400">
          <span>✨ Beragam Frame & Desain Tema</span>
          <span>&bull;</span>
          <span>⚡ QRIS Payment Instan</span>
          <span>&bull;</span>
          <span>📲 Unduh Foto Digital via QR</span>
        </div>
      </div>

      {/* Bottom Footer Price Banner */}
      <div className="relative z-10 w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/40 py-3.5 px-6 backdrop-blur-xl flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-medium">
          Mesin Device ID: <code className="text-indigo-300 font-mono">#{device?.id || 1}</code>
        </span>
        <span className="text-indigo-300 font-semibold">
          Mulai dari <strong className="text-white text-sm font-bold">{formatRupiah(minPrice)}</strong> / sesi cetak
        </span>
      </div>

      {/* Technician Config Modal */}
      {showConfigModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-left shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Menu Pengaturan Mesin Kiosk</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Mesin ini saat ini terdaftar sebagai <strong className="text-white font-mono">{device?.username}</strong> untuk <strong className="text-white">{device?.branchName}</strong>.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowDeviceSettings(true);
                  setShowConfigModal(false);
                }}
                className="w-full rounded-xl bg-indigo-600/20 border border-indigo-600/30 py-3 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition"
              >
                🎥 Pengaturan Perangkat (Kamera & Printer)
              </button>

              <button
                onClick={() => {
                  logoutDevice();
                  setShowConfigModal(false);
                }}
                className="w-full rounded-xl bg-red-600/20 border border-red-600/30 py-3 text-xs font-semibold text-red-300 hover:bg-red-600/30 transition"
              >
                Logout Device / Reset Konfigurasi Mesin
              </button>

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full rounded-xl bg-zinc-800 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                Tutup & Kembali Siaga
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeviceSettings && <DeviceSettingsModal onClose={() => setShowDeviceSettings(false)} />}
    </div>
  );
};
