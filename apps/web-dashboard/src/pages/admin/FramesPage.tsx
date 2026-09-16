import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { PERMISSIONS } from '@photobox/shared';
import {
  FrameSlot,
  FrameItem,
  FramePreset,
  FRAME_PRESETS,
} from '../../lib/frames';

export type { FrameSlot };
export { FRAME_PRESETS };
export type { FrameItem, FramePreset };

export interface BranchOption {
  id: number;
  name: string;
}

const MOCKUP_COLORS = [
  'bg-indigo-500/15 border-indigo-400/50 text-indigo-200',
  'bg-sky-500/15 border-sky-400/50 text-sky-200',
  'bg-emerald-500/15 border-emerald-400/50 text-emerald-200',
  'bg-amber-500/15 border-amber-400/50 text-amber-200',
  'bg-fuchsia-500/15 border-fuchsia-400/50 text-fuchsia-200',
];

/* Visual kartu frame: render slot sesungguhnya (x/y/width/height/rotation/radius)
   dengan skala relatif terhadap dimensi kanvas frame. */
export const FrameMockupVisual: React.FC<{ frame: FrameItem }> = ({ frame }) => {
  const ratio = frame.width / frame.height;
  const maxW = 150;
  const maxH = 122;
  let bw = maxW;
  let bh = maxW / ratio;
  if (bh > maxH) {
    bh = maxH;
    bw = bh * ratio;
  }
  const scale = bw / frame.width;
  const slots: FrameSlot[] =
    frame.slotsConfig && frame.slotsConfig.length > 0
      ? frame.slotsConfig
      : [{ x: 0, y: 0, width: frame.width, height: frame.height, rotation: 0, radius: 0 }];

  return (
    <div
      className="relative rounded-xl border border-zinc-700/60 bg-gradient-to-br from-zinc-800/80 to-zinc-900/90 shadow-inner"
      style={{ width: bw, height: bh }}
    >
      {slots.map((s, i) => (
        <div
          key={i}
          className={`absolute flex items-center justify-center rounded border border-dashed text-[9px] font-bold ${MOCKUP_COLORS[i % MOCKUP_COLORS.length]}`}
          style={{
            left: `${(s.x / frame.width) * 100}%`,
            top: `${(s.y / frame.height) * 100}%`,
            width: `${(s.width / frame.width) * 100}%`,
            height: `${(s.height / frame.height) * 100}%`,
            transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
            borderRadius: (s.radius ?? 0) * scale,
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
};

export const FramesPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const canChooseBranch = !user?.branchId;
  const canCreate = hasPermission(PERMISSIONS.FRAME_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.FRAME_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.FRAME_DELETE);

  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const requests: Promise<any>[] = [api.get('/frames')];
      if (canChooseBranch) requests.push(api.get('/branches'));

      const [framesRes, branchesRes] = await Promise.all(requests);
      if (framesRes.data.success) {
        setFrames(framesRes.data.data);
      }
      if (branchesRes?.data.success) {
        setBranches(branchesRes.data.data);
      }
    } catch (e) {
      console.error('Fetch frames error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deactivateFrame = async (frame: FrameItem) => {
    const ok = window.confirm(`Nonaktifkan master frame "${frame.name}"?`);
    if (!ok) return;

    try {
      await api.put(`/frames/${frame.id}`, { isActive: false });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menonaktifkan master frame.');
    }
  };

  const deleteFrame = async (frame: FrameItem) => {
    const ok = window.confirm(
      `Hapus master frame "${frame.name}"?\n\nDesain artwork milik frame ini ikut terhapus dan tidak bisa dikembalikan.`
    );
    if (!ok) return;

    try {
      const res = await api.delete(`/frames/${frame.id}`);
      if (res.data.deleted) {
        alert(`Master frame "${frame.name}" berhasil dihapus.`);
      } else {
        alert(res.data.message || 'Frame tidak dihapus permanen (sudah dipakai transaksi) dan dinonaktifkan.');
      }
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menghapus master frame.');
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const filteredFrames = useMemo(() => {
    return frames.filter((frame) => {
      const branchName = frame.branch?.name?.toLowerCase() || '';
      const matchesSearch =
        frame.name.toLowerCase().includes(search.toLowerCase()) ||
        frame.code.toLowerCase().includes(search.toLowerCase()) ||
        branchName.includes(search.toLowerCase()) ||
        (!frame.branchId && 'semua cabang global'.includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && frame.isActive) ||
        (statusFilter === 'inactive' && !frame.isActive);

      const matchesBranch =
        branchFilter === 'all' ||
        (branchFilter === 'global' && !frame.branchId) ||
        (frame.branchId === Number(branchFilter));

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [frames, search, statusFilter, branchFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Katalog Master Frame</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Kelola tipe fisik frame/grid, dimensi cetak, jumlah pose foto, penetapan harga transaksi, serta relasi ke cabang.
          </p>
        </div>

        {canCreate && (
          <Link
            to="/frames/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Master Frame
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className={`grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl ${canChooseBranch ? 'md:grid-cols-[1fr_180px_220px]' : 'md:grid-cols-[1fr_180px]'}`}>
        <input
          type="text"
          placeholder="Cari nama, kode frame, atau cabang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>

        {canChooseBranch && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Semua Cakupan Cabang</option>
            <option value="global">🌐 Semua Cabang (Global Saja)</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                📍 {branch.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Grid of Frames */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : filteredFrames.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center text-xs text-zinc-500">
          Tidak ada master frame yang sesuai kriteria pencarian.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFrames.map((frame) => (
            <div key={frame.id} className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/55 shadow-xl shadow-black/10 transition hover:border-zinc-700">
              {/* Wireframe / Mockup Visual */}
              <button
                type="button"
                onClick={() => canUpdate && navigate(`/frames/${frame.id}/edit`)}
                className="relative flex aspect-[4/3] w-full items-center justify-center bg-zinc-950 p-6"
              >
                <FrameMockupVisual frame={frame} />

                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${frame.isActive ? 'bg-emerald-500/90 text-white' : 'bg-zinc-800/90 text-zinc-300'}`}>
                    {frame.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-mono font-semibold text-zinc-300">
                    {frame.code}
                  </span>
                </div>

                <div className="absolute right-3 top-3">
                  <span className="rounded-full bg-zinc-800/90 px-2.5 py-0.5 text-[10px] font-medium text-zinc-300 shadow">
                    {frame.branch ? `📍 ${frame.branch.name}` : '🌐 Semua Cabang'}
                  </span>
                </div>
              </button>

              {/* Card Details */}
              <div className="flex flex-1 flex-col space-y-4 p-5">
                <div>
                  <h3 className="text-base font-bold text-white">{frame.name}</h3>
                  <p className="mt-1 text-xs text-zinc-400 font-mono">
                    Resolusi: {frame.width}x{frame.height} px
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {frame.branch ? `Khusus ${frame.branch.name}` : 'Tersedia di semua cabang'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-zinc-950/70 p-3">
                    <span className="text-[10px] font-semibold uppercase text-zinc-500">Harga Transaksi</span>
                    <p className="mt-1 font-bold text-emerald-400">{formatRupiah(frame.price)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-950/70 p-3">
                    <span className="text-[10px] font-semibold uppercase text-zinc-500">Jumlah Pose</span>
                    <p className="mt-1 font-bold text-white">{frame.photoCount} Jepretan</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-500">
                    🎨 {frame._count?.designs ?? 0} Desain Artwork
                  </span>

                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <button onClick={() => navigate(`/frames/${frame.id}/edit`)} className="rounded-lg bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-zinc-700">
                        Edit
                      </button>
                    )}
                    {canDelete && frame.isActive && (
                      <button onClick={() => deactivateFrame(frame)} className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/20">
                        Nonaktifkan
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => deleteFrame(frame)} className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20">
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};