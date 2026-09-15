import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface BranchItem {
  id: number;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  devices: { id: number; name: string; isActive: boolean }[];
  users: { id: number; username: string; role: { name: string }; isActive: boolean }[];
  frameDesigns: { id: number; name: string }[];
  _count: { transactions: number };
}

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openCreateModal = () => {
    setFormName('');
    setFormAddress('');
    setFormIsActive(true);
    setErrorMsg(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (b: BranchItem) => {
    setEditBranch(b);
    setFormName(b.name);
    setFormAddress(b.address);
    setFormIsActive(b.isActive);
    setErrorMsg(null);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await api.post('/branches', { name: formName, address: formAddress });
      if (res.data.success) {
        setIsCreateOpen(false);
        fetchBranches();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal membuat cabang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranch || !formName.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await api.put(`/branches/${editBranch.id}`, {
        name: formName,
        address: formAddress,
        isActive: formIsActive,
      });
      if (res.data.success) {
        setEditBranch(null);
        fetchBranches();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal memperbarui cabang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (b: BranchItem) => {
    try {
      await api.put(`/branches/${b.id}`, { isActive: !b.isActive });
      fetchBranches();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Manajemen Cabang</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Kelola lokasi cabang multi-tenant, unit kiosk, dan administrator cabang terkait.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Cabang Baru
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau alamat cabang..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-600 outline-none transition focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>Total: <strong className="text-white">{branches.length}</strong> Cabang</span>
          <span>&bull;</span>
          <span className="text-emerald-400">{branches.filter((b) => b.isActive).length} Aktif</span>
        </div>
      </div>

      {/* Branches List Table / Cards */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-12 text-center text-zinc-500 text-xs">
          Tidak ada cabang yang sesuai dengan pencarian.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`rounded-2xl border p-6 backdrop-blur-xl transition ${
                b.isActive
                  ? 'border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700'
                  : 'border-red-900/30 bg-zinc-950/40 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                      ID #{b.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        b.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${b.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                      {b.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-white">{b.name}</h3>
                  <p className="mt-1 text-xs text-zinc-400">{b.address || 'Alamat belum diatur'}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(b)}
                    className="rounded-lg bg-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
                    title="Edit Cabang"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleToggleStatus(b)}
                    className={`rounded-lg p-2 transition ${
                      b.isActive
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    title={b.isActive ? 'Nonaktifkan Cabang' : 'Aktifkan Cabang'}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Badges / Metrics */}
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-zinc-800/80 pt-4 text-center">
                <div className="rounded-xl bg-zinc-950/60 p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Kiosk Units</span>
                  <p className="text-sm font-bold text-white mt-0.5">{b.devices.length} Unit</p>
                </div>
                <div className="rounded-xl bg-zinc-950/60 p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Admin Cabang</span>
                  <p className="text-sm font-bold text-white mt-0.5">{b.users.filter((u) => u.role.name === 'admin').length} Orang</p>
                </div>
                <div className="rounded-xl bg-zinc-950/60 p-2.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Desain Frame</span>
                  <p className="text-sm font-bold text-white mt-0.5">{b.frameDesigns.length} Tema</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Cabang */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Tambah Cabang Baru</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Nama Cabang *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cabang Tunjungan Plaza Surabaya"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Alamat Lengkap</label>
                <textarea
                  rows={3}
                  placeholder="Jl. Basuki Rahmat No. 8-12, Surabaya"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Cabang */}
      {editBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Edit Cabang #{editBranch.id}</h3>
              <button onClick={() => setEditBranch(null)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Nama Cabang *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Alamat</label>
                <textarea
                  rows={3}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editIsActive" className="text-xs text-zinc-300">
                  Cabang Aktif Beroperasi
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBranch(null)}
                  className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
