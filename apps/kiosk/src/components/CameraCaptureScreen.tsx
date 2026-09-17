import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { KioskHeader } from './KioskHeader';
import { SessionCountdown } from './SessionCountdown';
import { SAMPLE_FRIENDS_PHOTO } from '../lib/kioskMockData';

export const CameraCaptureScreen: React.FC = () => {
  const {
    selectedFrame,
    selectedDesign,
    capturedPhotos,
    retakeIndex,
    addCapturedPhoto,
    replaceCapturedPhoto,
    cancelRetake,
    finalizeSession,
    cameraDeviceId,
  } = useKioskStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isRetakeMode = retakeIndex !== null;
  const totalPhotosNeeded = selectedFrame?.photoCount || 3;
  const currentPhotoIndex = isRetakeMode ? retakeIndex : capturedPhotos.length;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(5);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [hasCameraError, setHasCameraError] = useState(false);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Browser tidak mendukung akses kamera.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraDeviceId
            ? {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                deviceId: { exact: cameraDeviceId },
              }
            : {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: 'user',
              },
          audio: false,
        });

        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.warn('Camera access fallback to simulation mode:', err);
        setHasCameraError(true);
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraDeviceId]);

  const captureFrame = useCallback(() => {
    if (flashEnabled) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 250);
    }

    let photoDataUrl = '';

    if (videoRef.current && videoRef.current.videoWidth > 0 && !hasCameraError) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      }
    } else {
      photoDataUrl = SAMPLE_FRIENDS_PHOTO;
    }

    if (photoDataUrl) {
      if (isRetakeMode) {
        replaceCapturedPhoto(retakeIndex, photoDataUrl);
        void finalizeSession();
      } else {
        addCapturedPhoto(photoDataUrl);
      }
    }
    setCountdown(null);
  }, [
    flashEnabled,
    hasCameraError,
    isRetakeMode,
    retakeIndex,
    replaceCapturedPhoto,
    addCapturedPhoto,
    finalizeSession,
  ]);

  const startCountdown = () => {
    if (countdown !== null) return;
    setCountdown(timerSeconds);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => (c !== null ? c - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      captureFrame();
    }
  }, [countdown, captureFrame]);

  useEffect(() => {
    if (!isRetakeMode && capturedPhotos.length >= totalPhotosNeeded) {
      const t = setTimeout(() => {
        void finalizeSession();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [isRetakeMode, capturedPhotos.length, totalPhotosNeeded, finalizeSession]);

  return (
    <KioskBackground>
      {/* White Flash Effect */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 bg-white opacity-95 transition-opacity duration-200 pointer-events-none" />
      )}

      {/* Header dengan Stepper Langkah 4 */}
      <div className="relative w-full">
        <KioskHeader currentStepIndex={4} />
        <div className="absolute top-2.5 right-40 hidden md:block">
          <SessionCountdown />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="my-auto flex flex-col items-center justify-center px-4 w-full">
        {/* Badge Pill: Ambil Foto */}
        <div className="mb-2">
          <span className="rounded-full bg-amber-300/90 px-6 py-1 text-xs sm:text-sm font-bold tracking-wide text-zinc-900 shadow-2xs">
            Ambil Foto
          </span>
        </div>

        {/* Judul & Subjudul */}
        <div className="text-center mb-5">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight">
            Siap untuk difoto?
          </h1>
          <p className="mt-1 text-sm sm:text-base text-zinc-500 font-medium">
            Pastikan posisi kamu sudah pas dan senyum ya!
          </p>
        </div>

        {/* Banner Mode Retake */}
        {isRetakeMode && (
          <div className="mb-3 flex items-center gap-3 rounded-full bg-amber-400 px-6 py-2 text-xs sm:text-sm font-bold text-zinc-900 shadow-sm">
            <span>🔄 Sedang Mengambil Ulang Pose #{retakeIndex + 1}</span>
            <button
              onClick={cancelRetake}
              className="rounded-full bg-zinc-900 px-3 py-0.5 text-xs text-white hover:bg-zinc-800 cursor-pointer"
            >
              Batal
            </button>
          </div>
        )}

        {/* 3 Kolom Layout: Instruksi | Kamera Viewfinder + Shutter | Hasil Foto */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full max-w-6xl">
          {/* Kolom Kiri: Instruksi (3 cols) */}
          <div className="lg:col-span-3 rounded-3xl bg-white p-6 border border-zinc-200/80 shadow-sm space-y-6 flex flex-col justify-center">
            {/* Poin 1 */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-zinc-900 shadow-2xs">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-900">
                  Berdiri di depan kamera
                </h4>
                <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-relaxed">
                  Pastikan semua wajah terlihat jelas.
                </p>
              </div>
            </div>

            {/* Poin 2 */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-zinc-900 shadow-2xs">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" d="M9 10h.01M15 10h.01" strokeWidth={3} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 14c1.5 2 6.5 2 8 0" strokeWidth={2.2} />
                </svg>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-900">
                  Tersenyum!
                </h4>
                <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-relaxed">
                  Jangan lupa senyum untuk hasil terbaik.
                </p>
              </div>
            </div>

            {/* Poin 3 */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-zinc-900 shadow-2xs">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-900">
                  Tekan tombol untuk mulai
                </h4>
                <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-relaxed">
                  Foto akan langsung diambil.
                </p>
              </div>
            </div>
          </div>

          {/* Kolom Tengah: Camera Viewfinder & Shutter (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            {/* Viewfinder Frame dengan Siku Kuning */}
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border-2 border-amber-300 bg-black shadow-lg">
              {/* Siku Kuning Kiri Atas */}
              <div className="absolute top-4 left-4 z-20 h-8 w-8 border-t-4 border-l-4 border-amber-400 rounded-tl-sm pointer-events-none" />
              {/* Siku Kuning Kanan Atas */}
              <div className="absolute top-4 right-4 z-20 h-8 w-8 border-t-4 border-r-4 border-amber-400 rounded-tr-md pointer-events-none" />
              {/* Siku Kuning Kiri Bawah */}
              <div className="absolute bottom-4 left-4 z-20 h-8 w-8 border-b-4 border-l-4 border-amber-400 rounded-bl-sm pointer-events-none" />
              {/* Siku Kuning Kanan Bawah */}
              <div className="absolute bottom-4 right-4 z-20 h-8 w-8 border-b-4 border-r-4 border-amber-400 rounded-br-md pointer-events-none" />

              {/* Tombol Flash di Pojok Kanan Atas */}
              <button
                onClick={() => setFlashEnabled((f) => !f)}
                className={`absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer ${
                  flashEnabled
                    ? 'bg-white text-zinc-900 shadow-md scale-105'
                    : 'bg-zinc-800/80 text-zinc-400'
                }`}
                title="Toggle Flash"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
              </button>

              {/* Video Camera Feed atau Demo Image */}
              {hasCameraError ? (
                <div className="relative h-full w-full">
                  <img
                    src={SAMPLE_FRIENDS_PHOTO}
                    alt="Camera Simulation"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-3 left-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-amber-300">
                    Mode Simulasi Kamera
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover -scale-x-100"
                />
              )}

              {/* Big Countdown Overlay */}
              {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-amber-400 text-8xl font-black text-zinc-900 shadow-2xl animate-ping duration-1000">
                    {countdown}
                  </div>
                </div>
              )}
            </div>

            {/* Pilihan Timer Card */}
            <div className="mt-4 flex w-full max-w-sm flex-col items-center rounded-xl bg-white p-3 border border-zinc-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-800">
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <path strokeWidth={2} d="M12 7v5l3 2" />
                </svg>
                <span>Pilih Timer</span>
                <span className="text-[11px] font-normal text-zinc-400">
                  Waktu sebelum foto diambil
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2.5">
                {[3, 5, 7, 10].map((sec) => {
                  const isActive = timerSeconds === sec;
                  return (
                    <button
                      key={sec}
                      onClick={() => setTimerSeconds(sec)}
                      className={`min-w-16 rounded-full py-1 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-400 text-zinc-900 shadow-sm scale-105'
                          : 'bg-[#F4F2EB] text-zinc-600 hover:bg-[#EAE6DC]'
                      }`}
                    >
                      {sec}s
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tombol Shutter Jepret Kamera */}
            <div className="relative mt-5 flex items-center justify-center">
              {/* Doodle Sinar Kiri */}
              <div className="pointer-events-none absolute -left-14 text-amber-500">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <line x1="4" y1="12" x2="10" y2="12" />
                  <line x1="6" y1="6" x2="11" y2="10" />
                  <line x1="6" y1="18" x2="11" y2="14" />
                </svg>
              </div>

              {/* Shutter Button */}
              <button
                onClick={startCountdown}
                disabled={countdown !== null}
                className="group flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center rounded-full bg-amber-400 p-1.5 shadow-xl transition-all hover:scale-105 hover:bg-amber-500 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <div className="flex h-full w-full items-center justify-center rounded-full border-3.5 border-white">
                  <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
              </button>

              {/* Doodle Sinar Kanan */}
              <div className="pointer-events-none absolute -right-14 text-amber-500">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <line x1="20" y1="12" x2="14" y2="12" />
                  <line x1="18" y1="6" x2="13" y2="10" />
                  <line x1="18" y1="18" x2="13" y2="14" />
                </svg>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Hasil Foto (3 cols) */}
          <div className="lg:col-span-3 rounded-3xl bg-white p-6 border border-zinc-200/80 shadow-sm space-y-4 flex flex-col justify-start">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path strokeWidth={2} d="M21 15l-5-5L5 21" />
              </svg>
              <span>Hasil Foto</span>
            </div>

            {/* List Slot Foto */}
            <div className="space-y-3">
              {Array.from({ length: totalPhotosNeeded }).map((_, idx) => {
                const photo = capturedPhotos[idx];
                const isCurrent = idx === currentPhotoIndex;

                return (
                  <div
                    key={idx}
                    className={`relative flex items-center gap-3 rounded-2xl p-2 transition-all ${
                      isCurrent
                        ? 'border-2 border-amber-400 bg-amber-50/50 shadow-sm'
                        : 'border border-zinc-200/70 bg-zinc-50/50'
                    }`}
                  >
                    {/* Badge Nomor */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isCurrent || photo
                          ? 'bg-amber-400 text-zinc-900 shadow-2xs'
                          : 'bg-zinc-200 text-zinc-500'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Preview Thumbnail */}
                    <div className="aspect-[4/3] w-24 overflow-hidden rounded-lg bg-zinc-200 border border-zinc-200/80 shadow-inner">
                      {photo ? (
                        <img src={photo} alt={`Pose ${idx + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-zinc-400">
                          {isCurrent ? 'Pose ini' : '-'}
                        </div>
                      )}
                    </div>

                    <div className="ml-auto pr-1 text-zinc-400 font-bold text-xs">
                      •••
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </KioskBackground>
  );
};
