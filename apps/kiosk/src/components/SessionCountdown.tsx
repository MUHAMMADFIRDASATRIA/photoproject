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
      className={`flex items-center gap-2 rounded-2xl border px-4 py-2 backdrop-blur-xl shadow-xl transition-colors ${
        isLow
          ? 'border-red-500/60 bg-red-500/15 text-red-300 animate-pulse'
          : 'border-zinc-700/80 bg-zinc-950/70 text-zinc-200'
      }`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="text-right">
        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Sisa Waktu Sesi</div>
        <div className="font-mono text-lg font-black leading-none">
          {mm}:{ss}
        </div>
      </div>
    </div>
  );
};