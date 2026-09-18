import React, { useEffect, useState } from 'react';
import { useKioskStore } from '../store/kioskStore';

/**
 * Timer batas waktu sesi foto (setelah pembayaran).
 * Muncul di layar pilih desain & layar foto. Saat waktu habis,
 * store otomatis mem-finalisasi sesi ke halaman hasil.
 */
export const SessionCountdown: React.FC = () => {
  const sessionDeadline = useKioskStore((s) => s.sessionDeadline);
  const timerExpired = useKioskStore((s) => s.timerExpired);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!sessionDeadline && !timerExpired) return null;

  const remainingMs = sessionDeadline ? sessionDeadline - Date.now() : 0;
  const isExpired = timerExpired || (sessionDeadline !== null && remainingMs <= 0);

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 rounded-full border-2 border-red-300 bg-red-50 px-4 py-1 text-red-600 shadow-2xs">
        <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wider text-red-400">SISA:</span>
          <span className="font-mono text-sm font-black tracking-wider text-red-600">00:00</span>
          <span className="text-[10px] font-extrabold text-red-500">(HABIS)</span>
        </div>
      </div>
    );
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  const isLow = totalSeconds <= 60;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border-2 px-4 py-1 shadow-2xs transition-colors ${
        isLow
          ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
          : 'border-amber-400/90 bg-white text-zinc-800'
      }`}
    >
      <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">SISA:</span>
        <span className="font-mono text-sm font-black tracking-wider text-zinc-900">
          {mm}:{ss}
        </span>
      </div>
    </div>
  );
};