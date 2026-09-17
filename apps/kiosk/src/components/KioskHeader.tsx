import React from 'react';

export interface KioskHeaderProps {
  currentStepIndex: 1 | 2 | 3 | 4 | 5;
}

const STEPS = [
  { step: 1, label: 'Frame' },
  { step: 2, label: 'Bayar' },
  { step: 3, label: 'Desain' },
  { step: 4, label: 'Foto' },
  { step: 5, label: 'Hasil' },
] as const;

export const KioskHeader: React.FC<KioskHeaderProps> = ({ currentStepIndex }) => {
  return (
    <header className="flex w-full shrink-0 items-center justify-between px-3 sm:px-6 py-1">
      {/* Kiri: Brand Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent">
          <svg
            className="h-7 w-7 text-zinc-900"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3.2" strokeWidth="2.3" />
            <circle cx="17.5" cy="9.5" r="0.7" fill="currentColor" />
          </svg>
        </div>
        <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">PHOTOBOX</span>
      </div>

      {/* Tengah: Stepper 5 Langkah */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {STEPS.map((item, index) => {
          const isDone = item.step < currentStepIndex;
          const isActive = item.step === currentStepIndex;

          return (
            <React.Fragment key={item.step}>
              {/* Connector Line */}
              {index > 0 && (
                <div
                  className={`h-0.5 w-5 sm:w-8 transition-colors duration-300 rounded-full ${
                    item.step <= currentStepIndex ? 'bg-amber-400' : 'bg-zinc-300'
                  }`}
                />
              )}

              {/* Step Circle & Label */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                    isDone
                      ? 'bg-amber-400 text-zinc-900 shadow-2xs'
                      : isActive
                      ? 'bg-amber-400 text-zinc-900 ring-2.5 ring-amber-400/30 shadow-xs scale-105'
                      : 'bg-[#E7E4DC] text-zinc-500 font-bold'
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="h-4 w-4 stroke-[3]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    item.step
                  )}
                </div>
                <span
                  className={`mt-0.5 text-[11px] tracking-tight transition-colors ${
                    isActive || isDone ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Kanan: Doodle Capture Your Happy Moment */}
      <div className="relative flex flex-col items-center justify-center pr-1">
        <div className="flex flex-col items-center text-center">
          <span className="font-['Caveat',cursive] text-base sm:text-lg font-bold leading-none text-zinc-800 rotate-[-4deg]">
            Capture
          </span>
          <span className="font-['Caveat',cursive] text-base sm:text-lg font-bold leading-tight text-zinc-800 rotate-[-4deg]">
            Your Happy
          </span>
          <span className="font-['Caveat',cursive] text-base sm:text-lg font-bold leading-none text-zinc-800 rotate-[-4deg]">
            Moment
          </span>
        </div>

        {/* Doodle Smiley & Sparkle */}
        <div className="flex items-center gap-1 text-zinc-800">
          <svg width="18" height="10" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3C6 8 16 8 19 3" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1.5 text-amber-500">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" />
          </svg>
        </div>
      </div>
    </header>
  );
};
