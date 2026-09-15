import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface RoleOption {
  id: number;
  name: string;
  description: string;
}

interface BranchOption {
  id: number;
  name: string;
}

interface UserItem {
  id: number;
  username: string;
  roleId: number;
  branchId: number | null;
  isActive: boolean;
  createdAt: string;
  role: { id: number; name: string; description: string };
  branch: { id: number; name: string } | null;
}

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleId, setFormRoleId] = useState<number | ''>('');
  const [formBranchId, setFormBranchId] = useState<number | ''>('');
  const [formNewPassword, setFormNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        api.get('/users'),
        api.get('/roles'),
        api.get('/branches'),
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (rolesRes.data.success) setRoles(rolesRes.data.data);
      if (branchesRes.data.success) setBranches(branchesRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const openCreateModal = () => {
    setFormUsername('');
    setFormPassword('');
    setFormRoleId(roles.find((r) => r.name === 'admin')?.id || '');
    setFormBranchId(branches[0]?.id || '');
    setErrorMsg(null);
    setIsCreateOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formPassword || !formRoleId) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await api.post('/users', {
        username: formUsername,
        password: formPassword,
        roleId: formRoleId,
        branchId: formBranchId || null,
      });

      if (res.data.success) {
        setIsCreateOpen(false);
        fetchInitialData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal membuat pengguna baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !formNewPassword) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await api.put(`/users/${resetUser.id}/password`, {
        newPassword: formNewPassword,
      });
      if (res.data.success) {
        setResetUser(null);
        setFormNewPassword('');
        alert(`Password untuk ${resetUser.username} berhasil direset.`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Gagal mereset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: UserItem) => {
    if (u.username === 'superadmin') {
      alert('Akun superadmin utama tidak dapat dinonaktifkan.');
      return;
    }

    try {
      await api.put(`/users/${u.id}`, { isActive: !u.isActive });
      fetchInitialData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal mengubah status pengguna.');
    }
  };

  const selectedRoleName = roles.find((r) => r.id === Number(formRoleId))?.name;

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.branch?.name && u.branch.name.toLowerCase().includes(search.toLowerCase()));

    if (selectedRoleFilter === 'all') return matchSearch;
    return matchSearch && u.role.name === selectedRoleFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pengguna & Akun</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Kelola akun Admin Cabang (Web Dashboard), Kiosk Device User, dan Superadmin.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Tambah Akun Baru
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
        {/* Role Filters */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { key: 'all', label: 'Semua Akun' },
            { key: 'admin', label: 'Admin Cabang' },
            { key: 'user', label: 'Kiosk Device' },
            { key: 'superadmin', label: 'Superadmin' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedRoleFilter(tab.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                selectedRoleFilter === tab.key
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari username atau cabang..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-12 text-center text-zinc-500 text-xs">
          Tidak ada pengguna yang cocok dengan kriteria.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-6 py-4">Username & Status</th>
                <th className="px-6 py-4">Role Akses</th>
                <th className="px-6 py-4">Cabang Terikat</th>
                <th className="px-6 py-4">Tanggal Dibuat</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="transition hover:bg-zinc-800/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-indigo-400 font-bold uppercase text-xs">
                        {u.username.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{u.username}</span>
                          {u.username === 'superadmin' && (
                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300">
                              Master Root
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium mt-0.5 ${
                            u.isActive ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize ${
                        u.role.name === 'superadmin'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : u.role.name === 'admin'
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {u.role.name}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {u.branch ? (
                      <div>
                        <p className="font-semibold text-white">{u.branch.name}</p>
                        <p className="text-[10px] text-zinc-500">Branch ID #{u.branch.id}</p>
                      </div>
                    ) : (
                      <span className="text-zinc-500 font-mono text-[11px]">Global (Semua Cabang)</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(u.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setResetUser(u);
                          setFormNewPassword('');
                          setErrorMsg(null);
                        }}
                        className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                        title="Reset Password"
                      >
                        Reset PW
                      </button>

                      {u.username !== 'superadmin' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                            u.isActive
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah User */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Tambah Akun Baru</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: admin_surabaya atau kiosk_gi_01"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Password Awal *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Role Akses *</label>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.description}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRoleName !== 'superadmin' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Cabang Penempatan *</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    Sesuai CLAUDE.md: Admin cabang hanya dapat mengakses data cabang yang dipilih.
                  </p>
                </div>
              )}

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
                  {isSubmitting ? 'Membuat...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Reset Password — {resetUser.username}</h3>
              <button onClick={() => setResetUser(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Password Baru *</label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password baru minimal 6 karakter"
                  value={formNewPassword}
                  onChange={(e) => setFormNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Mereset...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
