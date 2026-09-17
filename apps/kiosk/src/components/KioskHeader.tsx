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
    <header className="relative flex w-full shrink-0 items-center justify-between px-6 sm:px-12 py-4 min-h-[90px]">
      {/* Kiri: Brand Logo */}
      <div className="flex items-center gap-2.5 z-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-transparent">
          <svg
            className="h-8 w-8 text-zinc-900"
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
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">PHOTOBOX</span>
      </div>

      {/* Tengah: Stepper 5 Langkah (Presisi Dead Center di Tengah Layar Kiosk) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2 sm:gap-3 pointer-events-auto">
        {STEPS.map((item, index) => {
          const isDone = item.step < currentStepIndex;
          const isActive = item.step === currentStepIndex;

          return (
            <React.Fragment key={item.step}>
              {/* Connector Line */}
              {index > 0 && (
                <div
                  className={`h-1 w-8 sm:w-12 transition-colors duration-300 rounded-full mb-4 ${
                    item.step <= currentStepIndex ? 'bg-amber-400' : 'bg-zinc-300/80'
                  }`}
                />
              )}

              {/* Step Circle & Label */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-sm font-black transition-all ${
                    isDone
                      ? 'bg-amber-400 text-zinc-900 shadow-sm'
                      : isActive
                      ? 'bg-amber-400 text-zinc-900 ring-4 ring-amber-400/25 shadow-md scale-110'
                      : 'bg-[#E7E4DC] text-zinc-500 font-bold'
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="h-5 w-5 stroke-[3.2]"
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
                  className={`mt-1 text-xs sm:text-sm tracking-tight transition-colors ${
                    isActive || isDone ? 'font-extrabold text-zinc-900' : 'font-bold text-zinc-400'
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
      <div className="relative flex flex-col items-center justify-center pr-2 sm:pr-4 z-10">
        <div className="flex flex-col items-center text-center">
          <span className="font-['Caveat',cursive] text-xl sm:text-2xl lg:text-3xl font-bold leading-none text-zinc-900 rotate-[-4deg]">
            Capture
          </span>
          <span className="font-['Caveat',cursive] text-xl sm:text-2xl lg:text-3xl font-bold leading-tight text-zinc-900 rotate-[-4deg]">
            Your Happy
          </span>
          <span className="font-['Caveat',cursive] text-xl sm:text-2xl lg:text-3xl font-bold leading-none text-zinc-900 rotate-[-4deg]">
            Moment
          </span>
        </div>

        {/* Doodle Smiley & Sparkle */}
        <div className="flex items-center gap-1 text-zinc-900 mt-1">
          <svg width="28" height="14" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 3C6 8 16 8 19 3" />
          </svg>
        </div>
        <div className="absolute -top-1.5 -right-3 text-amber-500">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" />
          </svg>
        </div>
      </div>
    </header>
  );
};
