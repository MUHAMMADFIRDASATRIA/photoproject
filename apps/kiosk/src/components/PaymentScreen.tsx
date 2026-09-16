import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useKioskStore } from '../store/kioskStore';

export const PaymentScreen: React.FC = () => {
  const {
    selectedFrame,
    selectedDesign,
    currentTransaction,
    createTransaction,
    confirmPayment,
    setStep,
    printCopies,
  } = useKioskStore();

  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [countdown, setCountdown] = useState(180); // 3 menit waktu pembayaran
  const [payError, setPayError] = useState<string | null>(null);

  const handleConfirmPay = async () => {
    setPayError(null);
    if (!currentTransaction) {
      const okCreate = await createTransaction();
      if (!okCreate) {
        setPayError('Transaksi gagal dibuat. Pastikan server kiosk aktif, lalu coba lagi.');
        return;
      }
    }
    const ok = await confirmPayment();
    if (!ok) {
      setPayError('Pembayaran gagal diproses. Pastikan server kiosk aktif, lalu coba lagi.');
    }
  };

  useEffect(() => {
    if (!currentTransaction) {
      setIsLoadingTx(true);
      createTransaction().finally(() => setIsLoadingTx(false));
    }
  }, [currentTransaction, createTransaction]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const price = currentTransaction?.amount ?? selectedDesign?.priceOverride ?? selectedFrame?.price ?? 35000;
  const qrString = currentTransaction?.qrisPayload || '00020101021226580016ID.CO.PHOTOBOX.WWW011893600999520458125303360540350005802ID5914PHOTOBOX6007JAKARTA6304';

  return (
    <div className="relative flex min-h-screen w-screen flex-col justify-between bg-zinc-950 p-10 font-sans text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep('SELECT_FRAME')}
          className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-xs font-semibold text-zinc-300 backdrop-blur-xl transition hover:bg-zinc-800 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Ubah Frame
        </button>

        <div className="text-center">
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Langkah 2 dari 5
          </span>
          <h1 className="mt-2 text-3xl font-black text-white">PEMBAYARAN QRIS</h1>
        </div>

        <div className="w-32"></div>
      </div>

      {/* Main Payment Card */}
      <div className="my-auto max-w-4xl mx-auto w-full">
        {isLoadingTx ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-2xl">
            {/* Left: QR Code Card */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-8 text-black shadow-xl">
              <div className="flex items-center justify-between w-full border-b border-gray-200 pb-3 mb-4">
                <span className="text-xs font-extrabold tracking-widest text-red-600">QRIS</span>
                <span className="text-[10px] font-semibold text-gray-500">STANDAR PEMBAYARAN NASIONAL</span>
              </div>

              {/* Dynamic QR SVG */}
              <div className="rounded-xl border border-gray-100 p-3 bg-white shadow-inner">
                <QRCodeSVG value={qrString} size={220} level="M" />
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs font-bold text-gray-800">Scan dengan BCA, GoPay, OVO, ShopeePay, Dana</p>
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-mono font-semibold text-red-600">
                  <span>⏱️ Berlaku:</span>
                  <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
                </div>
              </div>
            </div>

            {/* Right: Order Summary & Sim button */}
            <div className="space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Ringkasan Pesanan</span>
                <h3 className="mt-1 text-2xl font-bold text-white">{selectedFrame?.name}</h3>
                <p className="text-sm text-indigo-400 font-medium mt-0.5">Pilih tema desain setelah pembayaran lunas</p>
                <span className="mt-2 inline-flex items-center rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                  📸 {selectedFrame?.photoCount} Pose Foto
                </span>
                <span className="mt-2 ml-1 inline-flex items-center rounded-lg bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-300">
                  🖨️ {printCopies} Cetakan
                </span>
              </div>

              <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Harga Frame per Lembar</span>
                  <span>{formatRupiah(selectedFrame?.price ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Jumlah Cetakan</span>
                  <span>× {printCopies}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Biaya Frame & Cetak</span>
                  <span>{formatRupiah((selectedFrame?.price ?? 0) * printCopies)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Biaya Layanan</span>
                  <span className="text-emerald-400 font-semibold">GRATIS</span>
                </div>
                <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Total Bayar</span>
                  <span className="text-2xl font-black text-emerald-400">{formatRupiah(price)}</span>
                </div>
              </div>

              {/* Instant Simulator Button for Kiosk Testing */}
              <div className="space-y-2 pt-2">
                {payError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-300">
                    {payError}
                  </div>
                )}
                {!currentTransaction && !isLoadingTx && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
                    Transaksi belum berhasil dibuat. Klik di bawah untuk mencoba membuat ulang.
                  </div>
                )}
                <button
                  onClick={handleConfirmPay}
                  disabled={isLoadingTx}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-500/20 transition hover:brightness-110 active:scale-98 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Simulasi Bayar Berhasil (Lanjut Pilih Desain)
                </button>
                <p className="text-center text-[11px] text-zinc-500">
                  Sistem otomatis mendeteksi pembayaran QRIS saat sukses di mesin fisik.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-zinc-500">
        Arahkan kamera smartphone ke kode QR di atas untuk menyelesaikan transaksi
      </div>
    </div>
  );
};
