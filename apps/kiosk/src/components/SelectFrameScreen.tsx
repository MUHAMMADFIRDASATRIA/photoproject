import React, { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';

export const SelectFrameScreen: React.FC = () => {
  const { frames, selectFrame, resetCustomerSession, fetchFrames, printCopies, setPrintCopies } = useKioskStore();

  useEffect(() => {
    if (frames.length === 0) {
      fetchFrames();
    }
  }, [frames.length, fetchFrames]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="relative flex min-h-screen w-screen flex-col justify-between bg-zinc-950 p-10 font-sans text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={resetCustomerSession}
          className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-xs font-semibold text-zinc-300 backdrop-blur-xl transition hover:bg-zinc-800 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Batal & Kembali
        </button>

        <div className="text-center">
          <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Langkah 1 dari 5
          </span>
          <h1 className="mt-2 text-3xl font-black text-white">PILIH BENTUK FRAME</h1>
        </div>

        <div className="w-32"></div>
      </div>

      {/* Main Grid: Frame Layouts */}
      <div className="my-auto max-w-5xl mx-auto w-full">
        <p className="text-center text-sm text-zinc-400 mb-5">
          Pilih ukuran kertas dan jumlah pose foto yang kamu inginkan
        </p>

        {/* Jumlah Cetakan */}
        <div className="mx-auto mb-8 flex max-w-xs items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-5 py-3 shadow-lg">
          <span className="text-xs font-bold text-zinc-200">Jumlah Cetakan</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPrintCopies(printCopies - 1)}
              disabled={printCopies <= 1}
              className="h-9 w-9 rounded-xl bg-zinc-800 font-black text-white transition hover:bg-zinc-700 active:scale-95 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-7 text-center text-xl font-black text-white">{printCopies}</span>
            <button
              onClick={() => setPrintCopies(printCopies + 1)}
              className="h-9 w-9 rounded-xl bg-zinc-800 font-black text-white transition hover:bg-zinc-700 active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {frames.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {frames.map((frame) => (
              <div
                key={frame.id}
                onClick={() => selectFrame(frame)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-indigo-500/60 hover:bg-zinc-900/90 hover:scale-[1.02] active:scale-[0.99]"
              >
                {/* Glow on hover */}
                <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-600/10 blur-[80px] group-hover:bg-indigo-600/25 transition-all"></div>

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 font-bold text-base">
                      📸
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition">
                        {frame.name}
                      </h3>
                      <span className="text-xs text-zinc-400 font-mono">
                        Dimensi: {frame.width}x{frame.height} px
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400">
                      {formatRupiah(frame.price * printCopies)}
                    </span>
                    {printCopies > 1 && (
                      <span className="mt-1 block text-[10px] text-zinc-500">
                        {printCopies} × {formatRupiah(frame.price)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Frame Slots Preview Wireframe */}
                <div className="mt-6 flex h-48 w-full items-center justify-center rounded-2xl bg-zinc-950/80 border border-zinc-800/60 p-4">
                  {(frame.height > frame.width) ? (
                    /* Portrait → strip layout vertikal */
                    <div className="flex h-full w-24 flex-col gap-2 rounded-lg bg-zinc-900 p-2 border border-zinc-700 shadow-lg">
                      {Array.from({ length: frame.photoCount }).map((_, i) => (
                        <div key={i} className="flex-1 rounded bg-indigo-500/20 border border-dashed border-indigo-400/40 flex items-center justify-center text-[9px] text-indigo-300">Pose {i + 1}</div>
                      ))}
                    </div>
                  ) : (
                    /* Landscape → grid layout */
                    <div className="grid h-full w-48 grid-cols-2 gap-2 rounded-lg bg-zinc-900 p-2 border border-zinc-700 shadow-lg">
                      {Array.from({ length: frame.photoCount }).map((_, i) => (
                        <div key={i} className="rounded bg-violet-500/20 border border-dashed border-violet-400/40 flex items-center justify-center text-[9px] text-violet-300">Pose {i + 1}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    🎯 Total: <strong className="text-white">{frame.photoCount} Pose Foto</strong>
                  </span>
                  <span className="font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Pilih Bentuk Ini →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-zinc-500">
        Sentuh salah satu bentuk frame untuk lanjut ke pembayaran (QRIS)
      </div>
    </div>
  );
};
