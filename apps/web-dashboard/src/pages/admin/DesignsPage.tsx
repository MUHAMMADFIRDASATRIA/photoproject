import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
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

interface DesignForm {
  name: string;
  branchId: string;
  frameId: string;
  backgroundUrl: string;
  bgColorHex: string;
  slotBorderColor: string | null;
  slotBorderWidth: number | null;
  backgroundLayer: 'below' | 'above';
  isActive: boolean;
}

const emptyForm: DesignForm = {
  name: '',
  branchId: '',
  frameId: '',
  backgroundUrl: '',
  bgColorHex: '#FFFFFF',
  slotBorderColor: '#EF4444',
  slotBorderWidth: 2,
  backgroundLayer: 'below',
  isActive: true,
};

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
                ? `${slotBorderWidth * (2 * scale)}px solid ${slotBorderColor || '#EF4444'}`
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<DesignItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Preview lokal sebelum upload selesai
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFrame = frames.find((frame) => frame.id === Number(form.frameId));

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

  const openCreateModal = () => {
    setEditingDesign(null);
    setForm({
      ...emptyForm,
      branchId: user?.branchId ? String(user.branchId) : '',
      frameId: frames[0]?.id ? String(frames[0].id) : '',
    });
    setLocalPreview(null);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (design: DesignItem) => {
    setEditingDesign(design);
    setForm({
      name: design.name,
      branchId: design.branchId ? String(design.branchId) : '',
      frameId: String(design.frameId),
      backgroundUrl: design.backgroundUrl ?? '',
      bgColorHex: design.bgColorHex ?? '#FFFFFF',
      slotBorderColor: design.slotBorderColor ?? '#EF4444',
      slotBorderWidth: design.slotBorderWidth ?? 2,
      backgroundLayer: design.backgroundLayer ?? 'below',
      isActive: design.isActive,
    });
    setLocalPreview(null);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // ─── Upload file dari perangkat ──────────────────────────
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);

    try {
      setIsUploading(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_ORIGIN}/api/uploads`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setForm((prev) => ({ ...prev, backgroundUrl: res.data.data.url }));
      } else {
        setErrorMsg('Gagal mengunggah gambar.');
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Gagal mengunggah gambar ke server.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeBackground = () => {
    setForm((prev) => ({ ...prev, backgroundUrl: '' }));
    setLocalPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Submit desain ───────────────────────────────────────
  const submitDesign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.frameId) {
      setErrorMsg('Nama desain dan Master Frame wajib diisi.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      branchId: form.branchId ? Number(form.branchId) : null,
      frameId: Number(form.frameId),
      backgroundUrl: form.backgroundUrl ? form.backgroundUrl.trim() : null,
      bgColorHex: form.bgColorHex || '#FFFFFF',
      slotBorderColor: form.slotBorderColor ? form.slotBorderColor.trim() : null,
      slotBorderWidth: form.slotBorderWidth == null || form.slotBorderWidth <= 0 ? null : Math.min(20, Number(form.slotBorderWidth)),
      backgroundLayer: form.backgroundLayer,
      isActive: form.isActive,
    };

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = editingDesign ? await api.put(`/designs/${editingDesign.id}`, payload) : await api.post('/designs', payload);
      if (res.data.success) {
        setIsModalOpen(false);
        setLocalPreview(null);
        fetchData();
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Gagal menyimpan desain frame.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Desain
            </button>
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
                    <button onClick={() => openEditModal(design)} className="rounded-lg bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-zinc-700">
                      Edit
                    </button>
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

      {/* ─── Modal Add / Edit ──────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h3 className="text-base font-bold text-white">{editingDesign ? 'Edit Desain Frame' : 'Tambah Desain Frame'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitDesign} className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                {errorMsg && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{errorMsg}</div>}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Nama Desain *</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                    placeholder="Contoh: Pastel Dream Pink"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-indigo-500"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {canChooseBranch ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Target Cabang</label>
                      <select
                        value={form.branchId}
                        onChange={(event) => setForm({ ...form, branchId: event.target.value })}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                      >
                        <option value="">🌐 Semua Cabang (Digunakan Seluruh Cabang)</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            📍 {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-300">Cabang:</span> Terhubung otomatis ke cabang akun Anda ({user?.branchName || `Cabang ID ${user?.branchId}`}).
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Master Frame *</label>
                    <select
                      value={form.frameId}
                      onChange={(event) => setForm({ ...form, frameId: event.target.value })}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                    >
                      {frames.map((frame) => (
                        <option key={frame.id} value={frame.id}>
                          {frame.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ─── Upload Gambar dari Perangkat ───────────── */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                    Gambar Background / Artwork
                  </label>

                  {(localPreview || form.backgroundUrl) ? (
                    <div className="relative group">
                      <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950">
                        <img
                          src={localPreview || resolveImageUrl(form.backgroundUrl) || ''}
                          alt="Background preview"
                          className="h-40 w-full object-cover"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          Ganti Gambar
                        </button>
                        <button
                          type="button"
                          onClick={removeBackground}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 transition"
                        >
                          Hapus
                        </button>
                        {isUploading && (
                          <span className="flex items-center gap-1.5 text-[11px] text-amber-400">
                            <div className="h-3 w-3 animate-spin rounded-full border border-amber-400 border-t-transparent"></div>
                            Mengunggah...
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center transition hover:border-indigo-500/60 hover:bg-zinc-900/60"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition">
                        {isUploading ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent"></div>
                        ) : (
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-300 group-hover:text-indigo-300 transition">
                          {isUploading ? 'Mengunggah...' : 'Klik untuk pilih gambar'}
                        </p>
                        <p className="mt-1 text-[10px] text-zinc-600">
                          PNG, JPG, atau WEBP • Maks 20 MB
                        </p>
                      </div>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* ─── Lapisan Gambar vs Slot Foto ───────────── */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                    Posisi Gambar / Artwork
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, backgroundLayer: 'below' })}
                      className={`flex flex-col items-start gap-1 rounded-xl border px-3.5 py-2.5 text-left transition ${
                        form.backgroundLayer === 'below'
                          ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs font-bold">
                        <span className="mr-1.5 inline-block h-3 w-3 rounded-sm border border-current align-[-1px]" />
                        Di Bawah Slot Foto
                      </span>
                      <span className="text-[10px] font-normal leading-snug text-zinc-500">
                        Foto user menutupi artwork (foto tampil penuh)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, backgroundLayer: 'above' })}
                      className={`flex flex-col items-start gap-1 rounded-xl border px-3.5 py-2.5 text-left transition ${
                        form.backgroundLayer === 'above'
                          ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-xs font-bold">
                        <span className="mr-1.5 inline-block h-3 w-3 rounded-full border border-current" />
                        Di Atas Slot Foto
                      </span>
                      <span className="text-[10px] font-normal leading-snug text-zinc-500">
                        Artwork menutupi foto user (foto samar di baliknya)
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Warna Dasar Frame</label>
                    <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                      <input
                        type="color"
                        value={form.bgColorHex}
                        onChange={(event) => setForm({ ...form, bgColorHex: event.target.value })}
                        className="h-8 w-10 shrink-0 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        value={form.bgColorHex}
                        onChange={(event) => setForm({ ...form, bgColorHex: event.target.value })}
                        className="min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Border slot foto: warna + ketebalan garis keliling slot */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                      Warna Garis Slot
                      <span className="ml-1 text-[10px] font-normal text-zinc-600">(opsional)</span>
                    </label>
                    <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                      <input
                        type="color"
                        value={form.slotBorderColor || '#EF4444'}
                        onChange={(event) => setForm({ ...form, slotBorderColor: event.target.value })}
                        className="h-8 w-10 shrink-0 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        value={form.slotBorderColor || ''}
                        onChange={(event) => setForm({ ...form, slotBorderColor: event.target.value })}
                        placeholder="#EF4444"
                        className="min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                      Tebal Garis Slot (px)
                      <span className="ml-1 text-[10px] font-normal text-zinc-600">0 = tanpa garis</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={form.slotBorderWidth == null ? '' : form.slotBorderWidth}
                      onChange={(event) =>
                        setForm({ ...form, slotBorderWidth: event.target.value === '' ? null : Number(event.target.value) })
                      }
                      placeholder="2"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500/60"
                    />
                  </div>

                  <label className="flex items-center gap-2 self-end rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600"
                    />
                    Aktif di kiosk
                  </label>
                </div>
              </div>

              {/* Right Side: Real-time Live Frame Preview */}
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                  <div className="relative h-80 w-full bg-zinc-950 overflow-hidden">
                    <FrameDesignMockup
                      frame={selectedFrame}
                      backgroundUrl={form.backgroundUrl}
                      bgColorHex={form.bgColorHex}
                      overlayUrl={editingDesign?.overlayUrl ?? null}
                      slotBorderColor={form.slotBorderColor}
                      slotBorderWidth={form.slotBorderWidth}
                      backgroundLayer={form.backgroundLayer}
                    />
                  </div>
                  <div className="space-y-1.5 p-4 text-xs">
                    <p className="font-bold text-white">{form.name || 'Nama desain'}</p>
                    <p className="text-zinc-400">{selectedFrame?.name ?? 'Master frame belum dipilih'}</p>
                    {selectedFrame && (
                      <p className="text-[11px] font-semibold text-emerald-400">
                        Harga Frame: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedFrame.price)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmitting || isUploading} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20">
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Desain'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
