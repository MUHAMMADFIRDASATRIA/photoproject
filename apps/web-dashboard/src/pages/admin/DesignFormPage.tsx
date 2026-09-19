import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
}

// ─── Live Mockup Component ─────────────────────────────────
function LiveDesignMockup({
  frame,
  backgroundUrl,
  bgColorHex,
  slotBorderColor,
  slotBorderWidth,
  backgroundLayer,
}: {
  frame?: FrameOption | null;
  backgroundUrl?: string | null;
  bgColorHex?: string | null;
  slotBorderColor?: string | null;
  slotBorderWidth?: number | null;
  backgroundLayer?: 'below' | 'above' | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 400, h: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: cw, height: ch } = entry.contentRect;
        if (cw > 0 && ch > 0) setContainerSize({ w: cw, h: ch });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = frame?.width ?? 600;
  const height = frame?.height ?? 1050;
  const slots: FrameSlotShape[] =
    frame?.slotsConfig && frame.slotsConfig.length > 0
      ? frame.slotsConfig
      : [{ x: 0, y: 0, width, height, rotation: 0, radius: 0 }];

  const resolvedBg = resolveImageUrl(backgroundUrl);

  const PAD = 24;
  const maxW = containerSize.w - PAD * 2;
  const maxH = containerSize.h - PAD * 2;
  const scale = Math.min(maxW / (width || 1), maxH / (height || 1), 2);
  const pWidth = Math.max(4, Math.round((width || 1) * scale));
  const pHeight = Math.max(4, Math.round((height || 1) * scale));

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
      <div
        className="relative overflow-hidden shadow-xl ring-1 ring-black/20 shrink-0"
        style={{
          width: pWidth,
          height: pHeight,
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
              left: s.x * scale,
              top: s.y * scale,
              width: s.width * scale,
              height: s.height * scale,
              transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
              borderRadius: (s.radius ?? 0) * scale,
              border: `${
                slotBorderWidth != null && slotBorderWidth > 0
                  ? `${Math.max(1, slotBorderWidth * scale)}px solid ${slotBorderColor || '#EF4444'}`
                  : '1px solid rgb(113 113 122 / 0.5)'
              }`,
            }}
          >
            <span className="text-xs font-bold text-zinc-700 opacity-70" style={{ transform: `scale(${Math.min(1, scale * 1.5)})` }}>{i + 1}</span>
            <span className="rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold text-white/90" style={{ transform: `scale(${Math.min(1, scale * 1.2)})` }}>
              {frame?.photoCount ? `${s.width}x${s.height}` : ''}
            </span>
          </div>
        ))}

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
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export const DesignFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();
  
  const canChooseBranch = !user?.branchId;
  const canCreate = hasPermission(PERMISSIONS.DESIGN_CREATE);
  
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [frames, setFrames] = useState<FrameOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [form, setForm] = useState<DesignForm>(emptyForm);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const requests: Promise<any>[] = [api.get('/frames')];
        if (canChooseBranch) requests.push(api.get('/branches'));
        if (isEdit && id) requests.push(api.get(`/designs/${id}`));

        const [framesRes, branchesRes, designRes] = await Promise.all([
          requests[0],
          canChooseBranch ? requests[1] : Promise.resolve(null),
          isEdit && id ? requests[canChooseBranch ? 2 : 1] : Promise.resolve(null)
        ]);

        let loadedFrames: FrameOption[] = [];
        if (framesRes?.data.success) {
          loadedFrames = framesRes.data.data;
          setFrames(loadedFrames);
        }
        
        if (branchesRes?.data.success) {
          setBranches(branchesRes.data.data);
        }

        if (designRes?.data.success) {
          const d = designRes.data.data;
          setForm({
            name: d.name,
            branchId: d.branchId ? String(d.branchId) : '',
            frameId: String(d.frameId),
            backgroundUrl: d.backgroundUrl ?? '',
            bgColorHex: d.bgColorHex ?? '#FFFFFF',
            slotBorderColor: d.slotBorderColor ?? '#EF4444',
            slotBorderWidth: d.slotBorderWidth ?? 2,
            backgroundLayer: d.backgroundLayer ?? 'below',
            isActive: d.isActive,
          });
        } else if (!isEdit) {
          setForm(prev => ({
            ...prev,
            branchId: user?.branchId ? String(user.branchId) : '',
            frameId: loadedFrames[0]?.id ? String(loadedFrames[0].id) : '',
          }));
        } else if (designRes?.data.success === false) {
          setErrorMsg(designRes.data.error || 'Desain tidak ditemukan.');
        }
      } catch (e) {
        console.error('Load design form error:', e);
        setErrorMsg('Gagal memuat data desain.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, isEdit, canChooseBranch, user]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

  const submitDesign = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (isEdit && id) {
        await api.put(`/designs/${id}`, payload);
      } else {
        await api.post('/designs', payload);
      }
      navigate('/designs');
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Gagal menyimpan desain frame.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  const selectedFrame = frames.find((f) => f.id === Number(form.frameId));
  const currentWidth = selectedFrame?.width || 0;
  const currentHeight = selectedFrame?.height || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header Full Width */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isEdit ? 'Edit Desain Frame' : 'Tambah Desain Frame Baru'}
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Kelola tema artwork, posisi lapisan gambar (layer), warna dasar kanvas, serta batas slot foto.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/designs"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
          >
            ← Kembali
          </Link>
          <button
            type="button"
            onClick={submitDesign}
            disabled={isSubmitting || (!isEdit && !canCreate)}
            className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {!isEdit && !canCreate && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 mb-4">
          Anda tidak memiliki izin untuk membuat desain baru.
        </div>
      )}

      {/* Split Panel Layout */}
      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden lg:flex-row flex-col">
        
        {/* PANEL KIRI (Canvas) */}
        <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl shadow-black/10 lg:w-[45%] w-full h-full overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/30">
            <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Preview Live Desain
            </h2>
            <div className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-500 border border-indigo-500/30">
              Ukuran Cetak: {currentWidth} × {currentHeight}
            </div>
          </div>
          <div className="flex-1 p-4 bg-zinc-950/40 flex flex-col items-center justify-center min-h-0 overflow-hidden relative">
            <LiveDesignMockup
              frame={selectedFrame}
              backgroundUrl={localPreview || form.backgroundUrl}
              bgColorHex={form.bgColorHex}
              slotBorderColor={form.slotBorderColor}
              slotBorderWidth={form.slotBorderWidth}
              backgroundLayer={form.backgroundLayer}
            />
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-3 bg-zinc-950/80">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Orientasi</span>
              <span className="text-xs font-bold text-zinc-200">{currentHeight >= currentWidth ? 'Portrait' : 'Landscape'}</span>
            </div>
            <div className="h-6 w-px bg-zinc-800"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ukuran</span>
              <span className="text-xs font-bold text-zinc-200">{currentWidth} × {currentHeight} px</span>
            </div>
            <div className="h-6 w-px bg-zinc-800"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rasio</span>
              <span className="text-xs font-bold text-zinc-200">
                {currentWidth ? (currentWidth / Math.min(currentWidth, currentHeight)).toFixed(1) : 0} : {currentHeight ? (currentHeight / Math.min(currentWidth, currentHeight)).toFixed(1) : 0}
              </span>
            </div>
          </div>
        </div>

        {/* PANEL KANAN (Form) */}
        <div className="lg:w-[55%] w-full flex flex-col h-full overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          <form id="design-form" onSubmit={submitDesign} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl shadow-black/10">
            {errorMsg && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{errorMsg}</div>}

            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-bold text-white">Informasi Desain</h3>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Nama Desain *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Pastel Dream Pink"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {canChooseBranch ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Target Cabang</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
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

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Master Frame *</label>
                <select
                  value={form.frameId}
                  onChange={(e) => setForm({ ...form, frameId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>Pilih Master Frame</option>
                  {frames.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.width}x{f.height})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="pt-2 pb-2">
              <div className="h-px bg-zinc-800"></div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-sm font-bold text-white">Artwork & Layering</h3>
            </div>

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

            <div className="pt-2 pb-2">
              <div className="h-px bg-zinc-800"></div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h3 className="text-sm font-bold text-white">Warna & Garis Slot Foto</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Warna Dasar Frame</label>
                <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                  <input
                    type="color"
                    value={form.bgColorHex}
                    onChange={(e) => setForm({ ...form, bgColorHex: e.target.value })}
                    className="h-8 w-10 shrink-0 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    value={form.bgColorHex}
                    onChange={(e) => setForm({ ...form, bgColorHex: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Warna Garis Slot
                </label>
                <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                  <input
                    type="color"
                    value={form.slotBorderColor || '#EF4444'}
                    onChange={(e) => setForm({ ...form, slotBorderColor: e.target.value })}
                    className="h-8 w-10 shrink-0 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    value={form.slotBorderColor || ''}
                    onChange={(e) => setForm({ ...form, slotBorderColor: e.target.value })}
                    placeholder="#EF4444"
                    className="min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Tebal Garis Slot (px)
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={form.slotBorderWidth == null ? '' : form.slotBorderWidth}
                  onChange={(e) =>
                    setForm({ ...form, slotBorderWidth: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  placeholder="2"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-zinc-800/80">
              <div>
                <p className="text-sm font-bold text-white">Aktifkan Desain</p>
                <p className="text-[11px] text-zinc-400">Desain ini akan tersedia untuk dipilih pada layar kiosk.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
