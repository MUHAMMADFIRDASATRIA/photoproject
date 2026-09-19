import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useKioskStore } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';
import { KioskHeader } from './KioskHeader';
import { FrameTemplatePreview } from './FrameTemplatePreview';

export const PaymentScreen: React.FC = () => {
  const {
    selectedFrame,
    currentTransaction,
    createTransaction,
    confirmPayment,
    setStep,
    printCopies,
  } = useKioskStore();

  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTransaction) {
      setIsLoadingTx(true);
      createTransaction().finally(() => setIsLoadingTx(false));
    }
  }, [currentTransaction, createTransaction]);


  const handleConfirmPay = async () => {
    setPayError(null);
    if (!currentTransaction) {
      const okCreate = await createTransaction();
      if (!okCreate) {
        setPayError('Transaksi gagal dibuat. Coba beberapa saat lagi.');
        return;
      }
    }
    const ok = await confirmPayment();
    if (!ok) {
      setPayError('Pembayaran belum terdeteksi. Silakan coba lagi.');
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const framePrice = selectedFrame?.price || 15000;
  const totalPrice = currentTransaction?.amount || framePrice * printCopies;
  const qrString =
    currentTransaction?.qrisPayload ||
    '00020101021226580016ID.CO.PHOTOBOX.WWW011893600999520458125303360540350005802ID5914PHOTOBOX6007JAKARTA6304';

  return (
    <KioskBackground>
      {/* Header dengan Stepper Langkah 2 */}
      <KioskHeader currentStepIndex={2} />

      {/* Main Content Area */}
      <main className="my-auto flex flex-col items-center justify-center px-4 w-full">
        {/* Badge Pill: Pembayaran */}
        <div className="mb-2">
          <span className="rounded-full bg-amber-300/90 px-6 py-1.5 text-xs sm:text-sm font-bold tracking-wide text-zinc-900 shadow-2xs">
            Pembayaran
          </span>
        </div>

        {/* Judul & Subjudul */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight">
            Scan QRIS
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-zinc-500 font-medium">
            Gunakan aplikasi pembayaran favoritmu untuk menyelesaikan pembayaran.
          </p>
        </div>

        {/* 3 Kolom: Ringkasan | Scan QRIS | Cara Pembayaran */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch w-full max-w-6xl">
          {/* Kolom 1: Ringkasan Pesanan (4 cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-white p-6 sm:p-7 border border-zinc-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 mb-4">
                Ringkasan Pesanan
              </h3>

              <div className="flex items-center gap-4">
                {/* Thumbnail Frame Putih Otentik */}
                <div className="h-28 w-20 overflow-hidden rounded-lg bg-zinc-50 p-1 border border-zinc-200/80 flex items-center justify-center shadow-inner">
                  <FrameTemplatePreview frame={selectedFrame!} />
                </div>

                <div>
                  <h4 className="text-xl font-extrabold text-zinc-900">
                    Frame {selectedFrame?.name || '2R'}
                  </h4>
                  <p className="text-sm text-zinc-500 font-semibold mt-0.5">
                    {selectedFrame?.photoCount || 1} Foto
                  </p>
                  <p className="text-base text-zinc-800 font-bold mt-1.5">
                    {formatRupiah(framePrice)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-4">
              <span className="text-xs sm:text-sm text-zinc-500 font-bold block">
                Total Pembayaran
              </span>
              <span className="text-2xl sm:text-3xl font-black text-zinc-900 block mt-1">
                {formatRupiah(totalPrice)}
              </span>
            </div>
          </div>

          {/* Kolom 2: Kartu QRIS Center (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-between">
            <div className="rounded-3xl bg-white p-6 sm:p-7 border border-zinc-200/80 shadow-md flex flex-col items-center w-full max-w-sm">
              {/* Logo QRIS */}
              <div className="flex items-center justify-center w-full mb-3">
                <span className="text-2xl font-black tracking-wider text-zinc-900">
                  QRIS
                </span>
              </div>

              {/* QR Code dengan Siku Kuning di 4 Sudut */}
              <div className="relative p-3 bg-white">
                {/* Siku Kuning Kiri Atas */}
                <div className="absolute top-0 left-0 h-6 w-6 border-t-3 border-l-3 border-amber-400 rounded-tl-sm pointer-events-none" />
                {/* Siku Kuning Kanan Atas */}
                <div className="absolute top-0 right-0 h-6 w-6 border-t-3 border-r-3 border-amber-400 rounded-tr-sm pointer-events-none" />
                {/* Siku Kuning Kiri Bawah */}
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-3 border-l-3 border-amber-400 rounded-bl-sm pointer-events-none" />
                {/* Siku Kuning Kanan Bawah */}
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-3 border-r-3 border-amber-400 rounded-br-sm pointer-events-none" />

                {isLoadingTx ? (
                  <div className="flex h-52 w-52 items-center justify-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-3 border-amber-400 border-t-transparent" />
                  </div>
                ) : (
                  <QRCodeSVG value={qrString} size={200} level="M" />
                )}
              </div>

              <span className="mt-3 text-xs text-zinc-400 font-bold">
                Scan QR di atas
              </span>
            </div>

            {/* Pill Status Menunggu Pembayaran (Dapat diklik untuk simulasi bayar) */}
            <div className="mt-4 flex flex-col items-center w-full">
              <button
                onClick={handleConfirmPay}
                title="Klik untuk simulasi bayar sukses (test)"
                className="group flex items-center gap-2.5 rounded-full bg-[#FEF3C7] px-7 py-2.5 text-xs sm:text-sm font-bold text-zinc-900 shadow-sm transition hover:bg-amber-300 active:scale-95 cursor-pointer"
              >
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                <span>Menunggu pembayaran...</span>
              </button>
              <span className="mt-1.5 text-xs text-zinc-400 font-semibold">
                Pembayaran akan terdeteksi secara otomatis.
              </span>
              {payError && (
                <span className="mt-1 text-xs font-bold text-red-500">
                  {payError}
                </span>
              )}
            </div>
          </div>

          {/* Kolom 3: Cara Pembayaran (4 cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-white p-6 sm:p-7 border border-zinc-200/80 shadow-sm flex flex-col justify-start space-y-6">
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 mb-1">
              Cara Pembayaran
            </h3>

            {/* Poin 1: Buka aplikasi */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-zinc-900 shadow-2xs">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="5" y="2" width="14" height="20" rx="3" />
                  <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={3} strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-900">
                  1. Buka aplikasi pembayaran
                </h4>
                <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-relaxed">
                  Seperti GoPay, OVO, DANA, ShopeePay, dll.
                </p>
              </div>
            </div>

            {/* Poin 2: Scan QRIS */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-zinc-900 shadow-2xs">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2m-10 0H5a2 2 0 0 1-2-2v-2" />
                  <rect x="7" y="7" width="4" height="4" />
                  <rect x="13" y="13" width="4" height="4" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-900">
                  2. Scan QRIS di samping
                </h4>
                <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-relaxed">
                  Pastikan QR terlihat dengan jelas.
                </p>
              </div>
            </div>

            {/* Poin 3: Selesaikan pembayaran */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-zinc-900 shadow-2xs">
                <svg className="h-6 w-6 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-900">
                  3. Selesaikan pembayaran
                </h4>
                <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-relaxed">
                  Setelah pembayaran berhasil, layar akan otomatis berpindah ke tahap berikutnya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Navigasi Bawah */}
      <footer className="flex w-full items-center justify-start px-6 sm:px-12 py-3">
        <button
          onClick={() => setStep('SELECT_FRAME')}
          className="flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white px-8 py-3 text-sm sm:text-base font-bold text-zinc-700 shadow-xs transition hover:bg-zinc-50 active:scale-95 cursor-pointer"
        >
          <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Kembali</span>
        </button>
      </footer>
    </KioskBackground>
  );
};
