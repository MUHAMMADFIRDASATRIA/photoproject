import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { PERMISSIONS } from '@photobox/shared';

interface ActivityLogItem {
  id: number;
  action: string;
  resource: string;
  resourceId: number | null;
  details: string | null;
  createdAt: string;
  user: { id: number; username: string } | null;
  branch: { id: number; name: string } | null;
}

interface BranchOption {
  id: number;
  name: string;
}

interface UserOption {
  id: number;
  username: string;
  isActive: boolean;
}

interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const ACTION_BADGE: Record<string, string> = {
  LOGIN: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  LOGOUT: 'bg-zinc-500/10 border-zinc-600/40 text-zinc-300',
  USER_CREATE: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  USER_UPDATE: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  USER_ACTIVATE: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  USER_DEACTIVATE: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  USER_PASSWORD_RESET: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  ROLE_CREATE: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  ROLE_UPDATE: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  ROLE_DELETE: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  BRANCH_CREATE: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
  BRANCH_UPDATE: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
  FRAME_CREATE: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  FRAME_UPDATE: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  FRAME_DELETE: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  FRAME_INACTIVE: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  FRAME_ACTIVE: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  DESIGN_CREATE: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  DESIGN_UPDATE: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  DESIGN_DELETE: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  SETTING_UPDATE: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300',
  AUTH_ATTEMPT: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
};

function actionTone(action: string): string {
  const base = action.split('_')[0];
  return ACTION_BADGE[base] || 'bg-zinc-500/10 border-zinc-600/40 text-zinc-300';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function resourceLabel(resource: string): string {
  const map: Record<string, string> = {
    auth: 'Autentikasi',
    user: 'Pengguna',
    role: 'Peran & Izin',
    branch: 'Cabang',
    frame: 'Frame',
    design: 'Desain',
    setting: 'Pengaturan',
    device: 'Perangkat',
  };
  return map[resource] || resource;
}

export const ActivityLogsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canViewAllBranches = !!user?.permissions?.includes(PERMISSIONS.LOG_VIEW_ALL_BRANCH);

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchBranches = useCallback(async () => {
    if (!canViewAllBranches) return;
    try {
      const res = await api.get('/branches');
      if (res.data.success) setBranches(res.data.data);
    } catch {
      /* abaikan */
    }
  }, [canViewAllBranches]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/activity-logs/users');
      if (res.data.success) setUsers(res.data.data);
    } catch {
      /* abaikan */
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params: Record<string, string | number> = { page, pageSize: meta.pageSize };
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resource = resourceFilter;
      if (canViewAllBranches && branchFilter) params.branchId = branchFilter;
      if (userIdFilter) params.userId = userIdFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get('/activity-logs', { params });
      if (res.data.success) {
        setLogs(res.data.data);
        setMeta(res.data.meta);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal memuat log aktivitas.');
    } finally {
      setIsLoading(false);
    }
  }, [page, meta.pageSize, search, actionFilter, resourceFilter, branchFilter, userIdFilter, fromDate, toDate, canViewAllBranches]);

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, [fetchBranches, fetchUsers]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setSearch('');
    setActionFilter('');
    setResourceFilter('');
    setBranchFilter('');
    setUserIdFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const applyUserFilter = useCallback((userId: number) => {
    setUserIdFilter(String(userId));
    setPage(1);
  }, []);

  const totalPages = Math.max(1, meta.totalPages);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Audit Trail & Log Aktivitas Sistem</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Mencatat riwayat aksi sensitif di seluruh modul untuk kebutuhan audit &
            monitoring.
          </p>
        </div>
        <button
          onClick={() => {
            setPage(1);
            fetchLogs();
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Muat Ulang
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            placeholder="Cari pengguna / detail..."
            className="w-full flex-1 min-w-[180px] rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            placeholder="Aksi (mis. USER_CREATE)"
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
          />
          <select
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
          >
            <option value="">Semua Modul</option>
            {/* resource disaring via /activity-logs?resource= ; daftar dinamis juga tersedia via GET /activity-logs/resources */}
            {(resourceFilter ? [resourceFilter] : []).map((r) => (
              <option key={r} value={r}>{resourceLabel(r)}</option>
            ))}
            {!resourceFilter &&
              ['auth', 'user', 'role', 'branch', 'frame', 'design', 'setting', 'device'].map((r) => (
                <option key={r} value={r}>{resourceLabel(r)}</option>
              ))}
          </select>
          <select
            value={userIdFilter}
            onChange={(e) => {
              setUserIdFilter(e.target.value);
              setPage(1);
            }}
            className="min-w-[140px] rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
          >
            <option value="">Semua Akun</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}{!u.isActive ? ' (nonaktif)' : ''}
              </option>
            ))}
          </select>
          {canViewAllBranches && (
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
            >
              <option value="">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 [color-scheme:dark]"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 [color-scheme:dark]"
          />
          <button
            onClick={() => {
              setPage(1);
              fetchLogs();
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500"
          >
            Terapkan
          </button>
          <button
            onClick={resetFilters}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Errors */}
      {errorMsg && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-xs text-zinc-500">
          Belum ada aktivitas yang tercatat.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Pengguna</th>
                  <th className="px-6 py-4">Cabang</th>
                  <th className="px-6 py-4">Aksi</th>
                  <th className="px-6 py-4">Modul</th>
                  <th className="px-6 py-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap px-6 py-4 text-zinc-400">{formatDate(log.createdAt)}</td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <button
                          onClick={() => applyUserFilter(log.user!.id)}
                          title={`Lihat semua aktivitas ${log.user!.username}`}
                          className={`font-semibold text-white transition hover:text-indigo-300 ${userIdFilter === String(log.user!.id) ? 'text-indigo-400' : ''}`}
                        >
                          {log.user.username}
                        </button>
                      ) : (
                        <span className="font-semibold text-zinc-400">Sistem</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.branch ? (
                        <span className="text-zinc-300">{log.branch.name}</span>
                      ) : (
                        <span className="rounded-lg bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500">Global</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${actionTone(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-300">{resourceLabel(log.resource)}</span>
                      {log.resourceId != null && (
                        <span className="ml-1.5 font-mono text-[10px] text-zinc-500">#{log.resourceId}</span>
                      )}
                    </td>
                    <td className="max-w-[260px] truncate px-6 py-4 text-zinc-400" title={log.details ?? ''}>
                      {log.details ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/60 px-6 py-3.5">
            <p className="text-[11px] text-zinc-500">
              Menampilkan{' '}
              <span className="font-semibold text-zinc-300">
                {meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1}
                –{Math.min(meta.page * meta.pageSize, meta.total)}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-zinc-300">{meta.total}</span> aktivitas
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="px-2 text-[11px] text-zinc-500">Halaman {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
