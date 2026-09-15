import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { SlotEditor } from '../../components/SlotEditor';
import { PERMISSIONS } from '@photobox/shared';

export interface BranchOption {
  id: number;
  name: string;
}

export interface FrameSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  radius?: number;
}

export interface FrameItem {
  id: number;
  branchId?: number | null;
  name: string;
  code: string;
  width: number;
  height: number;
  photoCount: number;
  slotsConfig?: FrameSlot[];
  price: number;
  thumbnailUrl?: string | null;
  isActive: boolean;
  branch?: { id: number; name: string } | null;
  _count?: { designs: number; transactions: number };
}

export interface FramePreset {
  id: string;
  name: string;
  code: string;
  width: number;
  height: number;
  photoCount: number;
  price: number;
  slotsConfig: FrameSlot[];
  description: string;
}

// Hanya ukuran cetak berlaku: 2R (600x1050), 4R Potret (1200x1800), 4R Lanskap (1800x1200). Semua @300DPI.
const FRAME_PRESETS: FramePreset[] = [
  {
    id: '2r',
    name: '2R (600×1050 px)',
    code: '2r',
    width: 600,
    height: 1050,
    photoCount: 1,
    price: 35000,
    slotsConfig: [{ x: 60, y: 105, width: 480, height: 840 }],
    description: 'Ukuran cetak 2R potret. Slot foto diatur manual setelah dipilih.',
  },
  {
    id: '4r_portrait',
    name: '4R Potret (1200×1800 px)',
    code: '4r_portrait',
    width: 1200,
    height: 1800,
    photoCount: 1,
    price: 40000,
    slotsConfig: [{ x: 60, y: 90, width: 1080, height: 1620 }],
    description: 'Ukuran cetak 4R vertikal (potret). Slot foto diatur manual setelah dipilih.',
  },
  {
    id: '4r_landscape',
    name: '4R Lanskap (1800×1200 px)',
    code: '4r_landscape',
    width: 1800,
    height: 1200,
    photoCount: 1,
    price: 40000,
    slotsConfig: [{ x: 90, y: 60, width: 1620, height: 1080 }],
    description: 'Ukuran cetak 4R horizontal (lanskap). Slot foto diatur manual setelah dipilih.',
  },
];

/**
 * Ukuran default slot = rasio kanvas dengan margin M.
 * Potret → slot potret.  Lanskap → slot lanskap.
 */
function defaultSlotSize(w: number, h: number): { width: number; height: number } {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 200, height: 300 };
  }
  const M = 60;
  const maxW = w - 2 * M;
  const maxH = h - 2 * M;
  const ratio = w / h; // rasio kanvas
  let slotW = Math.max(120, maxW);
  let slotH = Math.max(120, Math.round(slotW / ratio));
  if (slotH > maxH) {
    slotH = Math.max(120, maxH);
    slotW = Math.max(120, Math.round(slotH * ratio));
  }
  return { width: slotW, height: slotH };
}

function defaultSlotBelow(w: number, h: number, existing: FrameSlot[]): FrameSlot {
  const { width: sw, height: sh } = defaultSlotSize(w, h);
  const isPortrait = h >= w;
  const last = existing[existing.length - 1];
  if (!last) return {
    x: isPortrait ? Math.round((w - sw) / 2) : 40,
    y: isPortrait ? 40 : Math.round((h - sh) / 2),
    width: sw,
    height: sh,
    rotation: 0,
    radius: 10,
  };
  return {
    x: isPortrait ? Math.round((w - sw) / 2) : last.x + last.width + 40,
    y: isPortrait ? Math.min(Math.max(0, h - sh), last.y + last.height + 40) : Math.round((h - sh) / 2),
    width: sw,
    height: sh,
    rotation: 0,
    radius: 10,
  };
}

function autoLayoutSlots(w: number, h: number, count: number): FrameSlot[] {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0 || count <= 0) return [];
  const M = 60;
  const gap = 40;
  let { width: sw, height: sh } = defaultSlotSize(w, h);
  const isPortrait = h >= w;
  if (isPortrait) {
    // kanvas potret → susun kolom (vertikal)
    let totalH = count * sh + (count - 1) * gap;
    if (totalH > h - 2 * M) {
      const f = (h - 2 * M) / totalH;
      sw = Math.max(100, Math.round(sw * f));
      sh = Math.max(150, Math.round(sh * f));
      totalH = count * sh + (count - 1) * gap;
    }
    const startX = Math.round((w - sw) / 2);
    const startY = Math.round((h - totalH) / 2);
    return Array.from({ length: count }, (_, i) => ({
      x: startX, y: startY + i * (sh + gap), width: sw, height: sh, rotation: 0, radius: 10,
    }));
  }
  // kanvas lanskap → susun baris (horizontal)
  let totalW = count * sw + (count - 1) * gap;
  if (totalW > w - 2 * M) {
    const f = (w - 2 * M) / totalW;
    sw = Math.max(150, Math.round(sw * f));
    sh = Math.max(100, Math.round(sh * f));
    totalW = count * sw + (count - 1) * gap;
  }
  const startX = Math.round((w - totalW) / 2);
  const startY = Math.round((h - sh) / 2);
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * (sw + gap), y: startY, width: sw, height: sh, rotation: 0, radius: 10,
  }));
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFrame, setEditingFrame] = useState<FrameItem | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(FRAME_PRESETS[0].id);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(-1);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    branchId: '',
    width: 600,
    height: 1050,
    photoCount: 1,
    price: 35000,
    thumbnailUrl: '',
    slotsConfig: FRAME_PRESETS[0].slotsConfig,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = FRAME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        name: preset.name,
        code: `${preset.code}_${Math.floor(Math.random() * 900 + 100)}`,
        width: preset.width,
        height: preset.height,
        photoCount: preset.photoCount,
        price: preset.price,
        slotsConfig: preset.slotsConfig,
      }));
    }
  };

  const handlePhotoCountChange = (value: number) => {
    const c = Math.max(1, Number.isFinite(value) ? Math.floor(value) : 1);
    setFormData((prev) => {
      const current = prev.slotsConfig;
      if (c === current.length) return { ...prev, photoCount: c };
      if (c < current.length) return { ...prev, photoCount: c, slotsConfig: current.slice(0, c) };
      const slots = [...current];
      while (slots.length < c) {
        slots.push(defaultSlotBelow(prev.width, prev.height, slots));
      }
      return { ...prev, photoCount: c, slotsConfig: slots };
    });
  };

  const autoArrangeSlots = () => {
    setFormData((prev) => ({
      ...prev,
      slotsConfig: autoLayoutSlots(prev.width, prev.height, prev.photoCount),
    }));
  };

  const addSlot = () => {
    setFormData((prev) => ({
      ...prev,
      slotsConfig: [...prev.slotsConfig, defaultSlotBelow(prev.width || 600, prev.height || 1050, prev.slotsConfig)],
    }));
  };

  const duplicateSlot = (index: number) => {
    setFormData((prev) => {
      const src = prev.slotsConfig[index];
      if (!src) return prev;
      const isPortrait = (prev.height || 0) >= (prev.width || 0);
      const gap = 40;
      // cari slot terakhir dengan ukuran sama (pendamping kaskade popup duplikat)
      const lastSame = [...prev.slotsConfig].reverse().find((s) => s.width === src.width && s.height === src.height);
      const anchor = lastSame || src;
      const newX = anchor.x + (isPortrait ? 0 : anchor.width + gap);
      const newY = anchor.y + (isPortrait ? anchor.height + gap : 0);
      const clone: FrameSlot = {
        ...src,
        x: Math.min(newX, Math.max(0, (prev.width || 600) - src.width)),
        y: Math.min(newY, Math.max(0, (prev.height || 1050) - src.height)),
      };
      const newSlots = [...prev.slotsConfig];
      newSlots.splice(index + 1, 0, clone);
      return { ...prev, photoCount: newSlots.length, slotsConfig: newSlots };
    });
  };

  const removeSlot = () => {
    setFormData((prev) => {
      if (prev.slotsConfig.length <= 1) return prev;
      return { ...prev, slotsConfig: prev.slotsConfig.slice(0, -1) };
    });
  };

  const openCreateModal = () => {
    setEditingFrame(null);
    setSelectedSlotIndex(-1);
    const defaultPreset = FRAME_PRESETS[0];
    setSelectedPresetId(defaultPreset.id);
    setFormData({
      name: defaultPreset.name,
      code: `${defaultPreset.code}_${Math.floor(Math.random() * 900 + 100)}`,
      branchId: user?.branchId ? String(user.branchId) : '',
      width: defaultPreset.width,
      height: defaultPreset.height,
      photoCount: defaultPreset.photoCount,
      price: defaultPreset.price,
      thumbnailUrl: '',
      slotsConfig: defaultPreset.slotsConfig,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (frame: FrameItem) => {
    setEditingFrame(frame);
    setSelectedSlotIndex(-1);
    setSelectedPresetId('custom');
    setFormData({
      name: frame.name,
      code: frame.code,
      branchId: frame.branchId ? String(frame.branchId) : '',
      width: frame.width,
      height: frame.height,
      photoCount: frame.photoCount,
      price: frame.price,
      thumbnailUrl: frame.thumbnailUrl || '',
      slotsConfig: frame.slotsConfig || [],
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const submitFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMsg('Nama dan Kode Frame wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      branchId: formData.branchId ? Number(formData.branchId) : null,
      width: Number(formData.width),
      height: Number(formData.height),
      photoCount: Number(formData.photoCount),
      price: Number(formData.price),
      slotsConfig: formData.slotsConfig,
      thumbnailUrl: formData.thumbnailUrl || undefined,
    };

    try {
      if (editingFrame) {
        await api.put(`/frames/${editingFrame.id}`, payload);
      } else {
        await api.post('/frames', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Gagal menyimpan master frame.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Master Frame
          </button>
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
            <div key={frame.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/55 shadow-xl shadow-black/10 transition hover:border-zinc-700">
              {/* Wireframe / Mockup Visual */}
              <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-zinc-950 p-6">
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
              </div>

              {/* Card Details */}
              <div className="space-y-4 p-5">
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

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-500">
                    🎨 {frame._count?.designs ?? 0} Desain Artwork
                  </span>

                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <button onClick={() => openEditModal(frame)} className="rounded-lg bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-zinc-700">
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

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h3 className="text-base font-bold text-white">{editingFrame ? 'Edit Master Frame' : 'Tambah Master Frame Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitFrame} className="space-y-4 p-6">
              {errorMsg && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{errorMsg}</div>}

              {/* Preset Template Selector (saat membuat frame baru) */}
              {!editingFrame && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-2">
                  <label className="block text-xs font-bold text-indigo-300">Pilih Preset Ukuran Cetak</label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {FRAME_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.photoCount} Pose • {p.width}x{p.height}px)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-400">
                    {FRAME_PRESETS.find((p) => p.id === selectedPresetId)?.description}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Nama Frame / Grid *</label>
                <input
                  type="text"
                  placeholder="Contoh: Photo Strip (2x3 Poses)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Kode Unik * (tanpa spasi)</label>
                <input
                  type="text"
                  placeholder="Contoh: strip_2x3 atau grid_4r_4cut"
                  value={formData.code}
                  disabled={!!editingFrame}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  required
                />
              </div>

              {/* Relasi Cabang */}
              {canChooseBranch ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Target Cabang</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">🌐 Semua Cabang (Digunakan Seluruh Cabang)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        📍 {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">Cabang:</span> Terhubung otomatis ke cabang akun Anda ({user?.branchName || `Cabang ID ${user?.branchId}`}).
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Harga Transaksi (Rp) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Jumlah Pose Foto *</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.photoCount}
                    onChange={(e) => handlePhotoCountChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Lebar Kanvas (px) *</label>
                  <input
                    type="number"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Tinggi Kanvas (px) *</label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Editor Slot Foto */}
              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-zinc-300">
                    Pengaturan Slot Foto
                    <span className="block text-[10px] font-normal text-zinc-500">Klik slot di kanvas lalu tarik / resize / rotasi. Nilai tersimpan otomatis (px @frame aktual).</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={autoArrangeSlots}
                      className="rounded-lg bg-indigo-600/20 px-3 py-1.5 text-[10px] font-semibold text-indigo-300 transition hover:bg-indigo-600/30"
                    >
                      ⇲ Auto Tata Slot
                    </button>
                    <button
                      type="button"
                      onClick={addSlot}
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-zinc-700"
                    >
                      + Slot
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedSlotIndex >= 0 && duplicateSlot(selectedSlotIndex)}
                      disabled={selectedSlotIndex < 0}
                      className="rounded-lg bg-violet-600/20 px-3 py-1.5 text-[10px] font-semibold text-violet-300 transition hover:bg-violet-600/30 disabled:opacity-40"
                      title="Duplikat slot terpilih (tekan D)"
                    >
                      ⧉ Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={removeSlot}
                      disabled={formData.slotsConfig.length <= 1}
                      className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[10px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      − Slot
                    </button>
                  </div>
                </div>
                <SlotEditor
                  width={formData.width}
                  height={formData.height}
                  slots={formData.slotsConfig}
                  onSelectChange={setSelectedSlotIndex}
                  onDuplicate={() => selectedSlotIndex >= 0 && duplicateSlot(selectedSlotIndex)}
                  onChange={(slots) => setFormData((prev) => ({ ...prev, slotsConfig: slots }))}
                />
                <p className="text-[10px] text-zinc-500">
                  {formData.photoCount} pose saat ini • {formData.slotsConfig.length} slot terpasang • menambah pose menambah slot, mengurangi pose menghapus slot.
                  <span className="ml-1 text-emerald-500/80">Tekan D atau klik "⧉ Duplicate" untuk menyalin slot terpilih (informasi ukuran/rotasi ikut tersalin).</span>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : editingFrame ? 'Simpan Perubahan' : 'Tambah Master Frame'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
