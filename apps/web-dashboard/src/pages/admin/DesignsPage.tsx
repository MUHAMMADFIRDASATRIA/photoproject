import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { PERMISSIONS } from '@photobox/shared';

const API_ORIGIN = 'http://localhost:4001';

interface BranchOption {
  id: number;
  name: string;
}

interface FrameSlotShape {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  radius?: number;
}

interface FrameOption {
  id: number;
  name: string;
  code: string;
  price: number;
  width: number;
  height: number;
  photoCount: number;
  slotsConfig?: FrameSlotShape[];
}

interface DesignItem {
  id: number;
  branchId?: number | null;
  frameId: number;
  name: string;
  overlayUrl: string;
  backgroundUrl: string | null;
  bgColorHex: string | null;
  thumbnailUrl: string;
  priceOverride: number | null;
  slotBorderColor?: string | null;
  slotBorderWidth?: number | null;
  backgroundLayer?: 'below' | 'above' | null;
  isActive: boolean;
  updatedAt: string;
  branch?: BranchOption | null;
  frame: FrameOption;
}



/** Resolve gambar URL — jika path relatif (/uploads/...) tambahkan origin API */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
}

// ─── Mockup Preview ─────────────────────────────────────────
/** Render komposit desain: artwork/background + slot foto sesuai posisi&rotasi asli frame + overlay. */
function FrameDesignMockup({
  frame,
  backgroundUrl,
  bgColorHex,
  overlayUrl,
  slotBorderColor,
  slotBorderWidth,
  backgroundLayer,
}: {
  frame?: FrameOption | null;
  backgroundUrl?: string | null;
  bgColorHex?: string | null;
  overlayUrl?: string | null;
  slotBorderColor?: string | null;
  slotBorderWidth?: number | null;
  backgroundLayer?: 'below' | 'above' | null;
}) {
  const width = frame?.width ?? 600;
  const height = frame?.height ?? 1050;
  const slots: FrameSlotShape[] =
    frame?.slotsConfig && frame.slotsConfig.length > 0
      ? frame.slotsConfig
      : [{ x: 0, y: 0, width, height, rotation: 0, radius: 0 }];
  const resolvedBg = resolveImageUrl(backgroundUrl);
  const resolvedOverlay = resolveImageUrl(overlayUrl);
  // perkiraan 1px-frame ≈ 0.16px tampilan (kanvas ~360x480 di card/preview)
  const scale = 100 / Math.min(width, height);

  return (
    <div className="flex h-full w-full select-none items-center justify-center p-3">
      {/* Kanvas preview mempertahankan rasio asli frame (width:height), letterbox di dalam kotak */}
      <div
        className="relative overflow-hidden shadow-xl ring-1 ring-black/20"
        style={{
          aspectRatio: `${width} / ${height}`,
          height: '100%',
          maxHeight: '100%',
          maxWidth: '100%',
          backgroundColor: bgColorHex || '#ffffff',
          backgroundImage: resolvedBg ? `url(${resolvedBg})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
      {slots.map((s, i) => (
        <div
          key={i}
          className="absolute flex flex-col items-center justify-center gap-1 bg-zinc-400/85 shadow-inner overflow-hidden"
          style={{
            left: `${(s.x / width) * 100}%`,
            top: `${(s.y / height) * 100}%`,
            width: `${(s.width / width) * 100}%`,
            height: `${(s.height / height) * 100}%`,
            transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
            borderRadius: (s.radius ?? 0) * scale,
            border: `${
              slotBorderWidth != null && slotBorderWidth > 0
                ? `${Math.max(1, slotBorderWidth * scale)}px solid ${slotBorderColor || '#EF4444'}`
                : '1px solid rgb(113 113 122 / 0.5)'
            }`,
          }}
        >
          <span className="text-[10px] font-bold text-zinc-700 opacity-70">{i + 1}</span>
          <span className="rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold text-white/90">
            {frame?.photoCount ? `${s.width}x${s.height}` : ''}
          </span>
        </div>
      ))}

      {/* Artwork di atas slot foto — hanya jika backgroundLayer = 'above' (menutupi slot) */}
      {backgroundLayer === 'above' && resolvedBg && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${resolvedBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Overlay artwork — digambar di atas slot (sama seperti komposisi asli saat cetak) */}
      {resolvedOverlay && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${resolvedOverlay})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export const DesignsPage: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const canChooseBranch = !user?.branchId;
  const canCreate = hasPermission(PERMISSIONS.DESIGN_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.DESIGN_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.DESIGN_DELETE);

  const [designs, setDesigns] = useState<DesignItem[]>([]);
  const [frames, setFrames] = useState<FrameOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [frameFilter, setFrameFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const requests = [api.get('/designs'), api.get('/frames')];
      if (canChooseBranch) requests.push(api.get('/branches'));

      const [designsRes, framesRes, branchesRes] = await Promise.all(requests);
      if (designsRes.data.success) setDesigns(designsRes.data.data);
      if (framesRes.data.success) setFrames(framesRes.data.data);
      if (branchesRes?.data.success) setBranches(branchesRes.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  const deactivateDesign = async (design: DesignItem) => {
    const ok = window.confirm(`Nonaktifkan desain "${design.name}" dari pilihan kiosk?`);
    if (!ok) return;

    try {
      await api.put(`/designs/${design.id}`, { isActive: false });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menonaktifkan desain frame.');
    }
  };

  const deleteDesign = async (design: DesignItem) => {
    const ok = window.confirm(`Hapus desain "${design.name}"?\n\nTindakan ini tidak bisa dikembalikan.`);
    if (!ok) return;

    try {
      const res = await api.delete(`/designs/${design.id}`);
      if (res.data.deleted) {
        alert(`Desain "${design.name}" berhasil dihapus.`);
      } else {
        alert(res.data.message || 'Desain tidak dihapus permanen (sudah dipakai transaksi) dan dinonaktifkan.');
      }
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menghapus desain frame.');
    }
  };

  const filteredDesigns = useMemo(() => {
    return designs.filter((design) => {
      const branchName = design.branch?.name?.toLowerCase() || '';
      const matchesSearch =
        design.name.toLowerCase().includes(search.toLowerCase()) ||
        branchName.includes(search.toLowerCase()) ||
        (!design.branchId && 'semua cabang global'.includes(search.toLowerCase())) ||
        design.frame?.name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && design.isActive) ||
        (statusFilter === 'inactive' && !design.isActive);

      const matchesFrame = frameFilter === 'all' || design.frameId === Number(frameFilter);

      const matchesBranch =
        branchFilter === 'all' ||
        (branchFilter === 'global' && !design.branchId) ||
        (design.branchId === Number(branchFilter));

      return matchesSearch && matchesStatus && matchesFrame && matchesBranch;
    });
  }, [designs, frameFilter, search, statusFilter, branchFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Desain & Artwork Frame</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Tambahkan tema artwork frame yang akan ditarik mesin kiosk sesuai cabang atau untuk semua cabang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <Link
              to="/designs/new"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Desain
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl ${canChooseBranch ? 'md:grid-cols-[1fr_160px_180px_200px]' : 'md:grid-cols-[1fr_180px_220px]'}`}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari desain, cabang, atau frame..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <select
          value={frameFilter}
          onChange={(event) => setFrameFilter(event.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
        >
          <option value="all">Semua frame</option>
          {frames.map((frame) => (
            <option key={frame.id} value={frame.id}>
              {frame.name}
            </option>
          ))}
        </select>

        {canChooseBranch && (
          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
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

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center text-xs text-zinc-500">
          Belum ada desain frame yang cocok.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDesigns.map((design) => (
            <div key={design.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/55 shadow-xl shadow-black/10">
              {/* Composite Live Frame Preview */}
              <div className="relative h-64 w-full bg-zinc-950 overflow-hidden">
                <FrameDesignMockup
                  frame={design.frame}
                  backgroundUrl={design.backgroundUrl}
                  bgColorHex={design.bgColorHex}
                  overlayUrl={design.overlayUrl}
                  slotBorderColor={design.slotBorderColor}
                  slotBorderWidth={design.slotBorderWidth}
                />

                <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${design.isActive ? 'bg-emerald-500/90 text-white' : 'bg-zinc-800/90 text-zinc-300'}`}>
                    {design.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                    #{design.id}
                  </span>
                </div>

                <div className="absolute right-3 top-3 z-20">
                  <span className="rounded-full bg-zinc-800/90 px-2.5 py-0.5 text-[10px] font-medium text-zinc-300 shadow">
                    {design.branch ? `📍 ${design.branch.name}` : '🌐 Semua Cabang'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <h3 className="text-base font-bold text-white">{design.name}</h3>
                  <p className="mt-1 text-xs text-zinc-400">{design.frame?.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {design.branch ? `Khusus ${design.branch.name}` : 'Tersedia di semua cabang'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-zinc-950/70 p-3">
                    <span className="text-[10px] font-semibold uppercase text-zinc-500">Harga Frame</span>
                    <p className="mt-1 font-bold text-white">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(design.frame?.price ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-zinc-950/70 p-3">
                    <span className="text-[10px] font-semibold uppercase text-zinc-500">Ukuran Kanvas</span>
                    <p className="mt-1 font-bold text-white">{design.frame?.width}x{design.frame?.height}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {canUpdate && (
                    <Link to={`/designs/${design.id}/edit`} className="rounded-lg bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-zinc-700">
                      Edit
                    </Link>
                  )}
                  {canDelete && design.isActive && (
                    <button onClick={() => deactivateDesign(design)} className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/20">
                      Nonaktifkan
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => deleteDesign(design)} className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
