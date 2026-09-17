import React, { useEffect, useState } from 'react';
import { useKioskStore } from '../store/kioskStore';

/**
 * Timer batas waktu sesi foto (setelah pembayaran).
 * Muncul di layar pilih desain & layar foto. Saat waktu habis,
 * store otomatis mem-finalisasi sesi ke halaman hasil.
 */
export const SessionCountdown: React.FC = () => {
  const sessionDeadline = useKioskStore((s) => s.sessionDeadline);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!sessionDeadline) return null;

  const remainingMs = sessionDeadline - Date.now();
  if (remainingMs <= 0) return null;

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  const isLow = totalSeconds <= 60;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-full border-2 px-5 py-2 shadow-md transition-colors ${
        isLow
          ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
          : 'border-amber-400/90 bg-white text-zinc-800'
      }`}
    >
      <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-zinc-400">SISA:</span>
        <span className="font-mono text-base sm:text-lg font-black tracking-wider text-zinc-900">
          {mm}:{ss}
        </span>
      </div>
    </div>
  );
};