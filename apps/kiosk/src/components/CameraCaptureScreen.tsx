import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { SessionCountdown } from './SessionCountdown';

export const CameraCaptureScreen: React.FC = () => {
  const {
    selectedFrame,
    selectedDesign,
    capturedPhotos,
    retakeIndex,
    addCapturedPhoto,
    replaceCapturedPhoto,
    cancelRetake,
    retakeSpecificPhoto,
    finalizeSession,
  } = useKioskStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isRetakeMode = retakeIndex !== null;
  const totalPhotosNeeded = selectedFrame?.photoCount || 3;
  const currentPhotoIndex = isRetakeMode ? retakeIndex : capturedPhotos.length; // 0-indexed

  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(5);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);

  // Inisialisasi Webcam
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Browser tidak mendukung akses kamera.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
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
      } catch (err: any) {
        console.error('Camera access error:', err);
        setHasCameraError(true);
        setCameraErrorMessage(
          err?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Izinkan akses kamera laptop dari browser.'
            : err?.message || 'Webcam fisik tidak terdeteksi.'
        );
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Fungsi jepret foto
  const captureFrame = useCallback(() => {
    // Flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    let photoDataUrl = '';

    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirroring horizontally agar seperti cermin
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      }
    } else {
      // Mock photo data url jika running tanpa webcam fisik
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = currentPhotoIndex % 2 === 0 ? '#312e81' : '#4c1d95';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Pose ${currentPhotoIndex + 1} Captured`, 400, 300);
        photoDataUrl = canvas.toDataURL('image/jpeg');
      }
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
  }, [isRetakeMode, retakeIndex, replaceCapturedPhoto, addCapturedPhoto, currentPhotoIndex, finalizeSession]);

  // Handle countdown trigger
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

  // Cek jika seluruh foto sudah lengkap (hanya dalam mode capture normal)
  useEffect(() => {
    if (!isRetakeMode && capturedPhotos.length >= totalPhotosNeeded) {
      // Beri jeda 1 detik lalu langsung finalisasi (komposisi + simpan + QR)
      const t = setTimeout(() => {
        void finalizeSession();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [isRetakeMode, capturedPhotos.length, totalPhotosNeeded, finalizeSession]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-white select-none">
      {/* White Flash Effect */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white opacity-90 transition-opacity duration-150"></div>
      )}

      {/* Main Webcam Area */}
      <div className="relative flex-1 h-full flex items-center justify-center bg-black">
        {hasCameraError ? (
          <div className="text-center p-8 max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 text-3xl">
              📷
            </div>
            <h3 className="text-lg font-bold">Mode Simulasi Kamera</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {cameraErrorMessage ?? 'Webcam fisik tidak terdeteksi atau izin belum diberikan.'} Kamu tetap bisa melakukan sesi foto simulasi.
            </p>
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <div className="flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-8xl font-black text-white shadow-2xl shadow-indigo-500/40 animate-ping duration-1000">
              {countdown}
            </div>
          </div>
        )}

        {/* Retake Mode Top Banner */}
        {isRetakeMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 rounded-full border border-amber-500/50 bg-amber-500/90 px-6 py-2 shadow-2xl backdrop-blur-md text-zinc-950 font-bold">
            <span className="flex items-center gap-2 text-sm">
              <span>🔄</span> Foto Ulang Pose #{retakeIndex + 1}
            </span>
            <button
              onClick={cancelRetake}
              className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-800 transition"
            >
              Batal
            </button>
          </div>
        )}

        {/* Sisa Waktu Sesi */}
        <div className="absolute top-6 right-6 z-20">
          <SessionCountdown />
        </div>

        {/* Live Guide Overlay Card */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-2.5 backdrop-blur-xl">
          <div className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            {isRetakeMode
              ? `Foto Ulang Pose ${retakeIndex + 1}`
              : `Pose ${Math.min(currentPhotoIndex + 1, totalPhotosNeeded)} dari ${totalPhotosNeeded}`}
          </span>
          <span className="text-zinc-500">&bull;</span>
          <span className="text-xs text-indigo-300 font-medium">Tema: {selectedDesign?.name}</span>
        </div>

        {/* Capture Trigger Button */}
        {countdown === null && (isRetakeMode || currentPhotoIndex < totalPhotosNeeded) && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
            {/* Pilihan Timer */}
            <div className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 backdrop-blur-xl shadow-lg">
              <span className="mr-1 text-[11px] font-bold text-zinc-400">⏱ Timer</span>
              {[3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setTimerSeconds(sec)}
                  className={`min-w-11 rounded-full px-3 py-1 text-xs font-bold transition ${
                    timerSeconds === sec
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            <button
              onClick={startCountdown}
              className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-1.5 shadow-2xl shadow-indigo-500/40 transition hover:scale-105 active:scale-95"
            >
              <div className="flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-zinc-950 font-bold text-sm">
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <span>
                  {isRetakeMode
                    ? `Siap! Foto Ulang Pose #${retakeIndex + 1}`
                    : 'Siap! Hitung Mundur (Ambil Pose)'}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Right Sidebar: Slots Thumbnail Preview */}
      <div className="w-80 h-full border-l border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-2xl flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Hasil Jepretan</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {capturedPhotos.length} dari {totalPhotosNeeded} pose siap dicetak
          </p>

          {/* Slots List */}
          <div className="mt-6 space-y-4">
            {Array.from({ length: totalPhotosNeeded }).map((_, idx) => {
              const photo = capturedPhotos[idx];
              const isCurrent = idx === currentPhotoIndex;

              return (
                <div
                  key={idx}
                  className={`group relative aspect-video w-full overflow-hidden rounded-2xl border transition-all ${
                    photo
                      ? 'border-emerald-500/50 bg-black shadow-md'
                      : isCurrent
                      ? 'border-indigo-500 bg-indigo-500/10 border-dashed animate-pulse'
                      : 'border-zinc-800 bg-zinc-950/60 border-dashed'
                  }`}
                >
                  {photo ? (
                    <>
                      <img src={photo} alt={`Pose ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        onClick={() => retakeSpecificPhoto(idx)}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-white gap-1 backdrop-blur-xs"
                      >
                        <span>🔄 Foto Ulang</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">
                      {isCurrent ? `👉 Ambil Pose ${idx + 1}` : `Pose ${idx + 1}`}
                    </div>
                  )}

                  <div className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    #{idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-950/60 p-4 border border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-400">
            Pastikan wajah berada di tengah bingkai dan tersenyum! 😊
          </p>
        </div>
      </div>
    </div>
  );
};
