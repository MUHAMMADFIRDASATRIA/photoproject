import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { KioskBackground } from './KioskBackground';

export const DeviceLoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { loginDevice } = useKioskStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await loginDevice(username, password);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal login device. Pastikan api-local aktif di port 4000.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KioskBackground>
      <main className="my-auto flex flex-col items-center justify-center px-4 w-full">
        <div className="w-full max-w-md">
          {/* Header Login */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-zinc-900 shadow-md border-2 border-white">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
              Inisialisasi Mesin Kiosk
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 font-medium">
              Login dengan akun device cabang untuk mengaktifkan mesin
            </p>
          </div>

          {/* Kartu Form Login Putih */}
          <div className="rounded-3xl border-2 border-zinc-200/80 bg-white p-6 sm:p-8 shadow-2xl">
            {errorMsg && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Device Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="kiosk_gi_01"
                  className="w-full rounded-xl border border-zinc-200 bg-[#FAF9F5] px-4 py-3 text-sm font-semibold text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Device Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password akun device"
                  className="w-full rounded-xl border border-zinc-200 bg-[#FAF9F5] px-4 py-3 text-sm font-semibold text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-amber-400 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-amber-400 py-3.5 text-sm font-black text-zinc-900 shadow-md transition hover:bg-amber-500 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Menghubungkan...' : 'Aktifkan Mesin Kiosk'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </KioskBackground>
  );
};
