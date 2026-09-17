import React from 'react';
import { FrameItem, DesignItem } from '../store/kioskStore';

const API_CLOUD_ORIGIN = 'http://localhost:4001';

/** Resolve URL relatif (/uploads/...) → origin API Cloud */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_CLOUD_ORIGIN}${url}`;
  return url;
}

interface FrameSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  radius?: number;
}

/**
 * Preview desain yang identik dengan mockup di halaman /designs:
 * - rasio kanvas mengikuti dimensi asli frame
 * - posisi/rotasi/radius slot mengikuti slotsConfig frame
 * - warna & ketebalan garis slot persis seperti editor (slotBorderWidth * 2 * scale)
 * - artwork dapat ditaruh di bawah atau di atas slot foto (backgroundLayer)
 */
export const DesignPreview: React.FC<{ frame: FrameItem; design: DesignItem }> = ({ frame, design }) => {
  const width = frame.width || 600;
  const height = frame.height || 1050;
  const slots: FrameSlot[] =
    frame.slotsConfig && frame.slotsConfig.length > 0
      ? frame.slotsConfig
      : [{ x: 0, y: 0, width, height, rotation: 0, radius: 0 }];
  const resolvedBg = resolveImageUrl(design.backgroundUrl);
  const bgLayer = design.backgroundLayer === 'above' ? 'above' : 'below';
  const scale = 100 / Math.min(width, height);

  return (
    <div className="flex h-full w-full items-center justify-center p-3">
      {/* Kanvas preview mempertahankan rasio asli frame (width:height), letterbox di dalam kotak */}
      <div
        className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/30"
        style={{
          aspectRatio: `${width} / ${height}`,
          height: '100%',
          maxHeight: '100%',
          maxWidth: '100%',
          backgroundColor: design.bgColorHex || '#ffffff',
          backgroundImage: bgLayer === 'below' && resolvedBg ? `url(${resolvedBg})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {slots.map((s, i) => {
          const borderActive = design.slotBorderWidth != null && design.slotBorderWidth > 0;
          const slotW = (s.width / width) * 100;
          const slotH = (s.height / height) * 100;
          const borderW = borderActive
            ? `${design.slotBorderWidth! * (2 * scale)}px solid ${design.slotBorderColor || '#EF4444'}`
            : '1px solid rgb(113 113 122 / 0.5)';

          return (
            <div
              key={i}
              className="absolute flex flex-col items-center justify-center gap-1 overflow-hidden bg-zinc-400/85 shadow-inner"
              style={{
                left: `${(s.x / width) * 100}%`,
                top: `${(s.y / height) * 100}%`,
                width: `${slotW}%`,
                height: `${slotH}%`,
                transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
                borderRadius: (s.radius ?? 0) * scale,
                border: borderW,
              }}
            >
              <span className="text-[9px] font-bold text-zinc-700 opacity-70">Pose {i + 1}</span>
            </div>
          );
        })}

        {/* Artwork di atas slot foto — hanya jika backgroundLayer = 'above' (menutupi slot) */}
        {bgLayer === 'above' && resolvedBg && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${resolvedBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        {/* Overlay PNG transparan — selalu di lapisan paling atas */}
        {resolveImageUrl(design.overlayUrl) && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${resolveImageUrl(design.overlayUrl)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
      </div>
    </div>
  );
};