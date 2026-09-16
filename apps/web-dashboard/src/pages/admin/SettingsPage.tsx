import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface BranchOverride {
  branchId: number;
  branchName: string;
  minutes: number;
  updatedAt: string;
}

interface SettingsData {
  globalMinutes: number;
  source: string;
  overrides: BranchOverride[];
  effective: { minutes: number; source: string } | null;
}

const TIMEOUT_MIN = 1;
const TIMEOUT_MAX = 120;

const Card: React.FC<{ title: string; badge: string; hint: string; children: React.ReactNode }> = ({
  title,
  badge,
  hint,
  children,
}) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-6 shadow-xl shadow-black/10">
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
        {badge}
      </span>
    </div>
    <h3 className="mt-3 text-base font-bold text-white">{title}</h3>
    <p className="mt-1 text-xs text-zinc-400">{hint}</p>
    <div className="mt-4">{children}</div>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperadmin = !user?.branchId;

  const [isLoading, setIsLoading] = useState(true);
  const [globalMinutes, setGlobalMinutes] = useState(5);
  const [adminMinutes, setAdminMinutes] = useState<string>('5');
  const [adminSource, setAdminSource] = useState<string>('default');
  const [overrides, setOverrides] = useState<BranchOverride[]>([]);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setSaveMsg(null);
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        const d: SettingsData = res.data.data;
        setGlobalMinutes(d.globalMinutes);
        setOverrides(d.overrides);
        if (d.effective) {
          setAdminMinutes(String(d.effective.minutes));
          setAdminSource(d.effective.source);
        }
      }
    } catch (e) {
      console.error('Fetch settings error:', e);
      setSaveMsg({ type: 'err', text: 'Gagal memuat pengaturan.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveGlobal = async () => {
    const minutes = Number(globalMinutes);
    if (!Number.isFinite(minutes) || minutes < TIMEOUT_MIN || minutes > TIMEOUT_MAX) {
      setSaveMsg({ type: 'err', text: `Nilai harus antara ${TIMEOUT_MIN}–${TIMEOUT_MAX} menit.` });
      return;
    }
    setSavingKey('global');
    setSaveMsg(null);
    try {
      await api.put('/settings/photo-session-timeout', { minutes, branchId: null });
      setSaveMsg({ type: 'ok', text: `Default global disimpan: ${minutes} menit.` });
      fetchData();
    } catch (e: any) {
      setSaveMsg({ type: 'err', text: e.response?.data?.error || 'Gagal menyimpan default global.' });
    } finally {
      setSavingKey(null);
    }
  };

  const saveBranch = async (branchId: number | 'self', minutesRaw: string, clear = false) => {
    const minutes = Number(minutesRaw);
    if (!clear && (!Number.isFinite(minutes) || minutes < TIMEOUT_MIN || minutes > TIMEOUT_MAX)) {
      setSaveMsg({ type: 'err', text: `Nilai harus antara ${TIMEOUT_MIN}–${TIMEOUT_MAX} menit.` });
      return;
    }
    setSavingKey(String(branchId));
    setSaveMsg(null);
    try {
      const body: any = clear
        ? { clear: true, branchId: branchId === 'self' ? null : branchId }
        : { minutes, branchId: branchId === 'self' ? null : branchId };
      await api.put('/settings/photo-session-timeout', body);
      setSaveMsg({ type: 'ok', text: clear ? 'Override dihapus, kembali ke default global.' : `Disimpan: ${minutes} menit.` });
      fetchData();
    } catch (e: any) {
      setSaveMsg({ type: 'err', text: e.response?.data?.error || 'Gagal menyimpan pengaturan.' });
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Pengaturan Kiosk</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Kelola batas waktu yang diberikan kepada pelanggan untuk menyelesaikan semua foto setelah pembayaran.
        </p>
      </div>

      {saveMsg && (
        <div
          className={`rounded-xl border p-3 text-xs ${
            saveMsg.type === 'ok'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {saveMsg.text}
        </div>
      )}

      <div className="grid gap-6">
        {/* Admin Cabang: setting cabangnya sendiri */}
        {!isSuperadmin && (
          <Card
            title="Waktu Sesi Foto — Admin Cabang"
            badge="Cabang Kamu"
            hint="Pelanggan diberi waktu ini (menit) untuk memilih tema & berfoto setelah pembayaran berhasil. Waktu habis = langsung ke halaman hasil."
          >
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Durasi (menit)</label>
                <input
                  type="number"
                  min={TIMEOUT_MIN}
                  max={TIMEOUT_MAX}
                  value={adminMinutes}
                  onChange={(e) => setAdminMinutes(e.target.value)}
                  className="w-32 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => saveBranch('self', adminMinutes)}
                disabled={savingKey === 'self'}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
              >
                {savingKey === 'self' ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-zinc-950/60 p-3 text-[11px] text-zinc-400">
              <span>
                {adminSource === 'branch'
                  ? '✅ Memakai pengaturan khusus cabang ini.'
                  : adminSource === 'global'
                    ? `🌐 Mengikuti default global (${adminMinutes} menit).`
                    : `🆕 Mengikuti nilai bawaan sistem (${adminMinutes} menit).`}
              </span>
              {adminSource === 'branch' && (
                <button
                  onClick={() => saveBranch('self', '0', true)}
                  disabled={savingKey === 'self'}
                  className="ml-1 rounded-lg bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Gunakan Default Global
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Superadmin / Global */}
        {isSuperadmin && (
          <>
            <Card
              title="Default Global (Semua Cabang)"
              badge="🌐 Global"
              hint="Nilai ini berlaku untuk semua cabang yang belum mengatur override khusus."
            >
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Durasi (menit)</label>
                  <input
                    type="number"
                    min={TIMEOUT_MIN}
                    max={TIMEOUT_MAX}
                    value={globalMinutes}
                    onChange={(e) => setGlobalMinutes(Number(e.target.value))}
                    className="w-32 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={saveGlobal}
                  disabled={savingKey === 'global'}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {savingKey === 'global' ? 'Menyimpan...' : 'Simpan Global'}
                </button>
              </div>
            </Card>

            <Card
              title="Override Per Cabang"
              badge="📍 Cabang"
              hint="Ubah durasi khusus untuk cabang tertentu. Kosongkan / clear untuk kembali mengikuti default global."
            >
              <div className="space-y-3">
                {overrides.length === 0 && (
                  <p className="rounded-xl bg-zinc-950/50 p-3 text-xs text-zinc-500">
                    Belum ada override khusus cabang. Semua cabang mengikuti default global.
                  </p>
                )}
                {overrides.map((o) => (
                  <div
                    key={o.branchId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{o.branchName}</p>
                      <p className="text-[10px] text-zinc-500">
                        Diperbarui {new Date(o.updatedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={TIMEOUT_MIN}
                        max={TIMEOUT_MAX}
                        defaultValue={o.minutes}
                        data-branch-id={o.branchId}
                        id={`branch-min-${o.branchId}`}
                        className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`branch-min-${o.branchId}`) as HTMLInputElement;
                          saveBranch(o.branchId, input.value);
                        }}
                        disabled={savingKey === String(o.branchId)}
                        className="rounded-lg bg-indigo-600/20 px-3 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-600/30 disabled:opacity-50"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => saveBranch(o.branchId, '0', true)}
                        disabled={savingKey === String(o.branchId)}
                        className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};