import React from 'react';
import { SAMPLE_FRIENDS_PHOTO } from '../lib/kioskMockData';

interface PolaroidMockupProps {
  type: '2R' | '4R' | 'STRIP' | string;
  className?: string;
  customPhoto?: string | null;
}

export const PolaroidMockup: React.FC<PolaroidMockupProps> = ({
  type,
  className = '',
  customPhoto,
}) => {
  const photoSrc = customPhoto || SAMPLE_FRIENDS_PHOTO;
  const normalizedType = type.toUpperCase();

  if (normalizedType.includes('4R') || normalizedType.includes('GRID')) {
    return (
      <div className={`relative flex items-center justify-center py-2 ${className}`}>
        {/* Foto 1 (Miring Kiri) */}
        <div className="relative -mr-8 w-32 sm:w-36 rotate-[-7deg] rounded-md bg-white p-2.5 pb-6 shadow-xl transition-transform duration-300 group-hover:rotate-[-9deg]">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xs bg-zinc-200">
            <img src={photoSrc} alt="Preview 1" className="h-full w-full object-cover" />
          </div>
        </div>
        {/* Foto 2 (Miring Kanan) */}
        <div className="relative z-10 w-32 sm:w-36 rotate-[6deg] rounded-md bg-white p-2.5 pb-6 shadow-xl transition-transform duration-300 group-hover:rotate-[8deg]">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xs bg-zinc-200">
            <img src={photoSrc} alt="Preview 2" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    );
  }

  if (normalizedType.includes('STRIP')) {
    return (
      <div className={`flex items-center justify-center py-2 ${className}`}>
        {/* Photostrip Vertikal */}
        <div className="w-26 sm:w-30 rounded-md bg-white p-2 pb-4 shadow-xl rotate-[-2deg] transition-transform duration-300 group-hover:rotate-0">
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="aspect-[4/3] w-full overflow-hidden rounded-xs bg-zinc-200">
                <img src={photoSrc} alt={`Pose ${idx + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default: 2R Polaroid Tunggal Proporsional
  return (
    <div className={`flex items-center justify-center py-2 ${className}`}>
      <div className="w-40 sm:w-46 rounded-md bg-white p-3 pb-8 shadow-xl rotate-[1deg] transition-transform duration-300 group-hover:rotate-0">
        <div className="aspect-square w-full overflow-hidden rounded-xs bg-zinc-200">
          <img src={photoSrc} alt="Polaroid Preview" className="h-full w-full object-cover" />
        </div>
      </div>
    </div>
  );
};
