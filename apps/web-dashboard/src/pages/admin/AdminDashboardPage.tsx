import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface AdminSummaryData {
  branch: {
    id: number;
    name: string;
    address: string;
    isActive: boolean;
  };
  metrics: {
    totalRevenue: number;
    todayRevenue: number;
    totalTransactions: number;
    todayTransactions: number;
    totalDevices: number;
    activeDevices: number;
    totalDesigns: number;
    activeDesigns: number;
  };
  devices: {
    id: number;
    name: string;
    isActive: boolean;
    lastSeen: string | null;
  }[];
  designs: {
    id: number;
    name: string;
    frameName: string;
    thumbnailUrl: string;
    isActive: boolean;
  }[];
  recentTransactions: {
    id: number;
    frameName: string;
    designName: string;
    designThumbnail?: string;
    amount: number;
    paymentMethod: string;
    paymentStatus: string;
    status: string;
    createdAt: string;
  }[];
  recentLogs: {
    id: number;
    user: string;
    action: string;
    details: string;
    createdAt: string;
  }[];
}

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/dashboard/admin-summary');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memuat ringkasan cabang.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminSummary();
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
          <span className="text-xs text-zinc-400">Memuat dashboard operasional cabang...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6 text-red-300">
        <p className="font-semibold">Error memuat data cabang</p>
        <p className="text-xs text-red-400 mt-1">{error}</p>
        <button
          onClick={fetchAdminSummary}
          className="mt-4 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500/30"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Branch Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-indigo-950/30 to-zinc-900 p-8 backdrop-blur-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Admin Cabang Portal &bull; Multi-Tenant Isolation
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {data.branch.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              📍 {data.branch.address || 'Lokasi operasional aktif'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchAdminSummary}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Omset Cabang */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Pendapatan</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white">{formatRupiah(data.metrics.totalRevenue)}</p>
          <p className="mt-1 text-xs text-emerald-400 font-medium">Hari ini: {formatRupiah(data.metrics.todayRevenue)}</p>
        </div>

        {/* Total Transaksi Cabang */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sesi Foto / Transaksi</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white">{data.metrics.totalTransactions} <span className="text-sm font-normal text-zinc-500">sesi</span></p>
          <p className="mt-1 text-xs text-indigo-400 font-medium">Hari ini: {data.metrics.todayTransactions} sesi</p>
        </div>

        {/* Kiosk Device Status */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Mesin Kiosk Online</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white">
            {data.metrics.activeDevices} <span className="text-sm font-normal text-zinc-500">/ {data.metrics.totalDevices} unit</span>
          </p>
          <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Siap melayani pengunjung
          </p>
        </div>

        {/* Desain Frame Aktif */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Desain Frame Cabang</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white">{data.metrics.activeDesigns} <span className="text-sm font-normal text-zinc-500">tema</span></p>
          <p className="mt-1 text-xs text-zinc-500">Tersedia di layar kiosk</p>
        </div>
      </div>

      {/* Two Columns: Recent Transactions & Kiosk Units */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-white">Transaksi Terkini Cabang</h2>
            <span className="text-xs text-zinc-500">{data.recentTransactions.length} Transaksi Terakhir</span>
          </div>

          <div className="space-y-3">
            {data.recentTransactions.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500 text-xs">
                Belum ada transaksi di cabang ini hari ini.
              </div>
            ) : (
              data.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3.5">
                    {tx.designThumbnail ? (
                      <img
                        src={tx.designThumbnail}
                        alt={tx.designName}
                        className="h-12 w-12 rounded-xl object-cover border border-zinc-800"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs">
                        🖼️
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">Tx #{tx.id}</span>
                        <span className="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase">
                          {tx.paymentStatus}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        {tx.frameName} &bull; <span className="text-indigo-400">{tx.designName}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        Metode: {tx.paymentMethod.toUpperCase()} &bull; {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </p>
                    </div>
                  </div>

                  <div className="text-right border-t sm:border-t-0 border-zinc-800/60 pt-2 sm:pt-0">
                    <p className="text-base font-bold text-white">{formatRupiah(tx.amount)}</p>
                    <span className="text-[10px] text-emerald-400">✓ Selesai Dicetak</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kiosk Devices Status Widget (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-white">Unit Kiosk Mesin</h2>
            <span className="text-xs text-zinc-500">{data.devices.length} Perangkat</span>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-xl space-y-3">
            {data.devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    device.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    🖥️
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{device.name}</h3>
                    <span className="text-[10px] text-zinc-500">
                      ID Device #{device.id}
                    </span>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  device.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${device.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  {device.isActive ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>

          {/* Activity Log stream */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Log Aktivitas Cabang</h3>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-xl space-y-2.5">
              {data.recentLogs.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 py-3">Belum ada log aktivitas.</p>
              ) : (
                data.recentLogs.map((log) => (
                  <div key={log.id} className="border-b border-zinc-800/50 pb-2 last:border-b-0 last:pb-0 text-xs">
                    <p className="font-semibold text-zinc-300">{log.action}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{log.details}</p>
                    <span className="text-[10px] text-zinc-500">@{log.user} &bull; {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
