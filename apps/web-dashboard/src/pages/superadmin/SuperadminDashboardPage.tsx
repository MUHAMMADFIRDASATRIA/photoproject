import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface MetricData {
  totalBranches: number;
  totalDevices: number;
  activeDevices: number;
  totalFrames: number;
  totalDesigns: number;
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
}

interface BranchItem {
  id: number;
  name: string;
  address: string;
  deviceCount: number;
  activeDevices: number;
  designCount: number;
  adminCount: number;
  totalTransactions: number;
  totalRevenue: number;
}

interface ActivityLogItem {
  id: number;
  user: string;
  branch: string;
  action: string;
  resource: string;
  details: string;
  createdAt: string;
}

export const SuperadminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/dashboard/superadmin-summary');
      if (res.data.success) {
        setMetrics(res.data.data.metrics);
        setBranches(res.data.data.branches);
        setRecentLogs(res.data.data.recentLogs);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal memuat ringkasan dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
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
          <span className="text-xs text-zinc-400">Memuat statistik sistem...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6 text-red-300">
        <p className="font-semibold">Error memuat data</p>
        <p className="text-xs text-red-400 mt-1">{error}</p>
        <button
          onClick={fetchSummary}
          className="mt-4 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500/30"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
              Superadmin Overview
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pusat Kendali Photobox Hybrid
            </h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-xl">
              Pantau seluruh performa cabang, status perangkat kiosk offline-resilient, transaksi, dan aktivitas sistem secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchSummary}
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
        {/* Total Omset */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Omset</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white">{formatRupiah(metrics?.totalRevenue || 0)}</p>
          <p className="mt-1 text-xs text-zinc-500">Gabungan seluruh cabang</p>
        </div>

        {/* Total Transaksi */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Transaksi</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white">{metrics?.totalTransactions || 0}</p>
          <p className="mt-1 text-xs text-zinc-500">Sesi foto tercetak</p>
        </div>

        {/* Total Cabang */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Cabang</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white">{metrics?.totalBranches || 0}</p>
          <p className="mt-1 text-xs text-zinc-500">Cabang aktif beroperasi</p>
        </div>

        {/* Kiosk Devices Online */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Kiosk Devices</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-white">
            {metrics?.activeDevices || 0} <span className="text-sm font-normal text-zinc-500">/ {metrics?.totalDevices || 0} unit</span>
          </p>
          <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Siap melayani pengunjung
          </p>
        </div>
      </div>

      {/* Two Column Layout: Branches Breakdown & Activity Stream */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Branch Performance List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-white">Performa Cabang</h2>
            <span className="text-xs text-zinc-500">{branches.length} Cabang Terdaftar</span>
          </div>

          <div className="space-y-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-xl transition hover:border-zinc-700 hover:bg-zinc-900/80"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm">
                    #{b.id}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition">{b.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{b.address}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                        🖥️ {b.activeDevices}/{b.deviceCount} Kiosk
                      </span>
                      <span className="inline-flex items-center rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                        🎨 {b.designCount} Desain Frame
                      </span>
                      <span className="inline-flex items-center rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                        👤 {b.adminCount} Admin
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right border-t sm:border-t-0 border-zinc-800/60 pt-3 sm:pt-0">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Pendapatan</span>
                  <p className="text-base font-bold text-emerald-400">{formatRupiah(b.totalRevenue)}</p>
                  <p className="text-[11px] text-zinc-400">{b.totalTransactions} transaksi</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Log Stream (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-white">Log Aktivitas Sistem</h2>
            <span className="text-[10px] font-mono text-zinc-500">CLAUDE.md §5</span>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 backdrop-blur-xl space-y-3">
            {recentLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">Belum ada aktivitas tercatat.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 border-b border-zinc-800/50 pb-3 last:border-b-0 last:pb-0">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs">
                    ⚡
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-200 truncate">{log.action}</span>
                      <span className="text-[10px] text-zinc-500 shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{log.details || `${log.user} modified ${log.resource}`}</p>
                    <span className="text-[10px] text-indigo-400/80 font-medium">@{log.user} &bull; {log.branch}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
