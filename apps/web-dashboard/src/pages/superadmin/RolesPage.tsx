import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PERMISSIONS } from '@photobox/shared';

interface PermissionItem {
  id: number;
  code: string;
  description: string;
}

interface RoleItem {
  id: number;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [categorized, setCategorized] = useState<Record<string, PermissionItem[]>>({});
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // New role modal
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleError, setNewRoleError] = useState<string | null>(null);

  const fetchRbacData = async () => {
    try {
      setIsLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);

      if (rolesRes.data.success) {
        setRoles(rolesRes.data.data);
        if (!selectedRole && rolesRes.data.data.length > 0) {
          const defaultRole = rolesRes.data.data.find((r: RoleItem) => r.name === 'admin') || rolesRes.data.data[0];
          setSelectedRole(defaultRole);
          setActivePermissions(defaultRole.permissions);
        } else if (selectedRole) {
          const refreshed = rolesRes.data.data.find((r: RoleItem) => r.id === selectedRole.id);
          if (refreshed) {
            setSelectedRole(refreshed);
            setActivePermissions(refreshed.permissions);
          }
        }
      }

      if (permsRes.data.success) {
        setCategorized(permsRes.data.categorized);
      }
    } catch (err) {
      console.error('Error fetching RBAC:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRbacData();
  }, []);

  const handleSelectRole = (role: RoleItem) => {
    setSelectedRole(role);
    setActivePermissions(role.permissions);
    setSaveSuccessMsg(null);
  };

  const handleTogglePermission = (code: string) => {
    if (!selectedRole) return;

    // Proteksi CLAUDE.md: role.manage pada superadmin tidak boleh dicabut
    if (selectedRole.name === 'superadmin' && code === PERMISSIONS.ROLE_MANAGE) {
      alert('Permission role.manage wajib terkunci pada superadmin demi keamanan sistem.');
      return;
    }

    setActivePermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setSaveSuccessMsg(null);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      setIsSaving(true);
      setSaveSuccessMsg(null);
      const res = await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissionCodes: activePermissions,
      });

      if (res.data.success) {
        setSaveSuccessMsg(`Izin akses role ${selectedRole.name} berhasil disimpan!`);
        fetchRbacData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyimpan permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      setNewRoleError(null);
      const res = await api.post('/roles', {
        name: newRoleName.trim().toLowerCase(),
        description: newRoleDesc,
      });

      if (res.data.success) {
        setIsNewRoleOpen(false);
        setNewRoleName('');
        setNewRoleDesc('');
        fetchRbacData();
      }
    } catch (err: any) {
      setNewRoleError(err.response?.data?.error || 'Gagal membuat role.');
    }
  };

  const getModuleTitle = (resource: string) => {
    const titles: Record<string, string> = {
      role: 'Role & Izin Sistem',
      branch: 'Manajemen Cabang',
      user: 'Pengguna & Akun',
      frame: 'Master Frame (Bentuk)',
      design: 'Desain Artwork',
      transaction: 'Transaksi Kiosk',
      report: 'Laporan Keuangan',
      log: 'Audit Trail & Log Aktivitas',
      device: 'Perangkat Kiosk (Hardware)',
    };
    return titles[resource] || resource.toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Role & Permission (RBAC)</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Atur hak akses granular per role sesuai aturan <code className="text-indigo-400 font-mono">resource.action</code> di CLAUDE.md.
          </p>
        </div>

        <button
          onClick={() => {
            setNewRoleName('');
            setNewRoleDesc('');
            setNewRoleError(null);
            setIsNewRoleOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-200 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Role Kustom
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Roles Selector (1 col) */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Daftar Role ({roles.length})
            </h2>

            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`w-full text-left rounded-2xl p-4 border transition backdrop-blur-xl ${
                    selectedRole?.id === role.id
                      ? 'border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                      : 'border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-800/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white capitalize">{role.name}</span>
                    <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400 font-mono">
                      {role.userCount} User
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{role.description || 'Tidak ada deskripsi'}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-indigo-300 font-medium">
                    <span>🔑 {role.permissions.length} Izin Aktif</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Matrix Checklist (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {selectedRole && (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-2xl">
                {/* Role detail header & Save Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-white capitalize">
                        Hak Akses: {selectedRole.name}
                      </h2>
                      {selectedRole.name === 'superadmin' && (
                        <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-purple-300">
                          Super Root
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      Centang izin yang ingin diberikan ke akun dengan role ini.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {saveSuccessMsg && (
                      <span className="text-xs font-medium text-emerald-400 animate-fade-in">
                        ✓ {saveSuccessMsg}
                      </span>
                    )}
                    <button
                      onClick={handleSavePermissions}
                      disabled={isSaving}
                      className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Izin'}
                    </button>
                  </div>
                </div>

                {/* Categorized Permissions */}
                <div className="space-y-6">
                  {Object.entries(categorized).map(([resource, perms]) => (
                    <div key={resource} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-800/60 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                          {getModuleTitle(resource)}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">{resource}.*</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {perms.map((p) => {
                          const isChecked = activePermissions.includes(p.code);
                          const isLockedSuperadmin =
                            selectedRole.name === 'superadmin' && p.code === PERMISSIONS.ROLE_MANAGE;

                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-3 rounded-xl p-3 border cursor-pointer transition ${
                                isChecked
                                  ? 'border-indigo-500/30 bg-indigo-500/5'
                                  : 'border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/30'
                              } ${isLockedSuperadmin ? 'cursor-not-allowed opacity-90' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isLockedSuperadmin}
                                onChange={() => handleTogglePermission(p.code)}
                                className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-semibold text-white">{p.code}</span>
                                  {isLockedSuperadmin && (
                                    <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.2 text-[9px] font-medium">
                                      🔒 Terkunci
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[11px] text-zinc-400">{p.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Buat Role Baru */}
      {isNewRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Buat Role Kustom Baru</h3>
              <button onClick={() => setIsNewRoleOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            {newRoleError && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
                {newRoleError}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Kode / Nama Role *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: operator, supervisor_cabang"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Deskripsi</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan peruntukan role ini..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRoleOpen(false)}
                  className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500"
                >
                  Simpan Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
