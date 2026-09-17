import React from 'react';
import { FrameItem } from '../store/kioskStore';

interface FrameTemplatePreviewProps {
  frame: FrameItem;
  className?: string;
}

/**
 * Render preview frame putih otentik (persis seperti PNG template yang diunduh
 * di halaman http://localhost:3001/frames):
 * - Latar belakang putih bersih dengan rasio aspek asli (width / height)
 * - Slot-slot foto abu-abu (#EDEDEE) dengan garis putus-putus (#A1A1AA)
 * - Nomor pose di tengah slot (1, 2, 3...)
 * - Mendukung posisi x, y, width, height, rotasi, dan radius dari slotsConfig
 */
export const FrameTemplatePreview: React.FC<FrameTemplatePreviewProps> = ({
  frame,
  className = '',
}) => {
  const width = frame.width || 1200;
  const height = frame.height || 1800;
  const slots =
    frame.slotsConfig && frame.slotsConfig.length > 0
      ? frame.slotsConfig
      : [{ x: 0, y: 0, width, height, rotation: 0, radius: 0 }];

  return (
    <div className={`flex items-center justify-center p-2 h-full w-full ${className}`}>
      {/* Kanvas Template Frame Putih dengan Rasio Asli (Width / Height) */}
      <div
        className="relative overflow-hidden bg-white shadow-xl rounded-lg border border-zinc-300 transition-transform duration-300 group-hover:scale-[1.03]"
        style={{
          aspectRatio: `${width} / ${height}`,
          height: '100%',
          maxHeight: '100%',
          maxWidth: '100%',
        }}
      >
        {slots.map((s, i) => {
          const slotW = (s.width / width) * 100;
          const slotH = (s.height / height) * 100;
          const scale = 100 / Math.min(width, height);

          return (
            <div
              key={i}
              className="absolute flex items-center justify-center bg-[#EDEDEE] border-2 border-dashed border-[#A1A1AA] text-zinc-500 font-black shadow-inner select-none"
              style={{
                left: `${(s.x / width) * 100}%`,
                top: `${(s.y / height) * 100}%`,
                width: `${slotW}%`,
                height: `${slotH}%`,
                transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
                borderRadius: Math.max(0, (s.radius ?? 0) * scale),
              }}
            >
              <span className="text-xs sm:text-sm lg:text-base font-black text-zinc-500 opacity-80">
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
