import React from 'react';
import { useKioskStore } from '../store/kioskStore';

const API_CLOUD_ORIGIN = 'http://localhost:4001';

/** Resolve gambar URL — jika path relatif (/uploads/...) tambahkan origin API Cloud */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_CLOUD_ORIGIN}${url}`;
  return url;
}

export const SelectDesignScreen: React.FC = () => {
  const { selectedFrame, designs, selectDesign, setStep } = useKioskStore();

  return (
    <div className="relative flex min-h-screen w-screen flex-col justify-between bg-zinc-950 p-10 font-sans text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep('SELECT_FRAME')}
          className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-xs font-semibold text-zinc-300 backdrop-blur-xl transition hover:bg-zinc-800 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Ganti Bentuk Frame
        </button>

        <div className="text-center">
          <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-xs font-bold text-purple-400 uppercase tracking-wider">
            Langkah 3 dari 5
          </span>
          <h1 className="mt-2 text-3xl font-black text-white">PILIH TEMA DESAIN ARTWORK</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Pembayaran Lunas • Bentuk: <strong className="text-indigo-400">{selectedFrame?.name}</strong> ({selectedFrame?.photoCount} Pose)
          </p>
        </div>

        <div className="w-32"></div>
      </div>

      {/* Main Grid: Frame Designs */}
      <div className="my-auto max-w-6xl mx-auto w-full">
        {designs.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-12 text-center text-zinc-500 text-sm">
            Sedang memuat tema desain untuk frame ini...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {designs.map((design) => {
              const isStrip = (selectedFrame?.height ?? 0) > (selectedFrame?.width ?? 0);
              const photoCount = selectedFrame?.photoCount ?? 3;

              return (
                <div
                  key={design.id}
                  onClick={() => selectDesign(design)}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-purple-500/60 hover:bg-zinc-900/90 hover:scale-[1.03] active:scale-[0.99]"
                >
                  {/* High fidelity frame mockup card (Background + Neutral Grey Pose Slots + Overlay PNG) */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center p-3"
                    style={{
                      backgroundColor: design.bgColorHex || '#ffffff',
                      backgroundImage: design.backgroundUrl ? `url(${resolveImageUrl(design.backgroundUrl)})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Neutral Grey Photo Slots */}
                    {isStrip ? (
                      <div className="flex h-full w-28 flex-col gap-2 p-1">
                        {Array.from({ length: photoCount }).map((_, i) => (
                          <div
                            key={i}
                            className="flex flex-1 items-center justify-center rounded bg-zinc-400/80 border border-zinc-500/40 shadow-inner"
                          >
                            <span className="text-[10px] font-bold text-zinc-700 opacity-60">Pose {i + 1}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid h-full w-52 grid-cols-2 gap-2 p-1">
                        {Array.from({ length: photoCount }).map((_, i) => (
                          <div
                            key={i}
                            className="flex flex-1 items-center justify-center rounded bg-zinc-400/80 border border-zinc-500/40 shadow-inner"
                          >
                            <span className="text-[10px] font-bold text-zinc-700 opacity-60">Pose {i + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-15 pointer-events-none"></div>

                    <div className="absolute bottom-3 left-3 right-3 z-20">
                      <span className="text-xs font-bold text-white block drop-shadow">{design.name}</span>
                      <span className="text-[11px] font-semibold text-emerald-300 drop-shadow">Termasuk Dalam Frame</span>
                    </div>
                  </div>

                  {/* Button */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Pilih Desain & Mulai Foto</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/30 group-hover:scale-110 transition">
                      ➔
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-zinc-500">
        Pilih tema artwork yang paling cocok dengan gayamu!
      </div>
    </div>
  );
};
