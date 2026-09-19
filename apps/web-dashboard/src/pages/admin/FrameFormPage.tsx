import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { SlotEditor } from '../../components/SlotEditor';
import { PERMISSIONS } from '@photobox/shared';
import {
  FrameItem,
  FrameSlot,
  FRAME_PRESETS,
  defaultSlotBelow,
  autoLayoutSlots,
} from '../../lib/frames';

/* ─── numeric input (nilai diketik bebas, commit saat blur/Enter) ─── */
interface NumInputProps {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  width?: string;
}

const NumInput: React.FC<NumInputProps> = ({
  label, value, onCommit, min, max, suffix, disabled, width = 'w-20',
}) => {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    let v = Number(text);
    if (!Number.isFinite(v)) {
      setText(String(value));
      return;
    }
    v = Math.round(v);
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    setText(String(v));
    onCommit(v);
  };

  return (
    <label className={`flex items-center gap-1.5 text-[11px] text-zinc-400 ${disabled ? 'opacity-40' : ''}`}>
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="number"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={`${width} rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[11px] text-zinc-200 outline-none focus:border-indigo-500 disabled:opacity-40`}
      />
      {suffix && <span className="text-[10px] text-zinc-500">{suffix}</span>}
    </label>
  );
};


interface BranchOption {
  id: number;
  name: string;
}

interface FormState {
  name: string;
  code: string;
  branchId: string;
  width: number;
  height: number;
  photoCount: number;
  price: number;
  thumbnailUrl: string;
  slotsConfig: FrameSlot[];
}

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 1050;

export const FrameFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();
  const canChooseBranch = !user?.branchId;
  const canCreate = hasPermission(PERMISSIONS.FRAME_CREATE);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [formData, setFormData] = useState<FormState>({
    name: '',
    code: '',
    branchId: user?.branchId ? String(user.branchId) : '',
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    photoCount: 1,
    price: 35000,
    thumbnailUrl: '',
    slotsConfig: [],
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(-1);
  const [keepRatio, setKeepRatio] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const requests: Promise<any>[] = [];
        if (canChooseBranch) requests.push(api.get('/branches'));
        if (isEdit && id) requests.push(api.get(`/frames/${id}`));

        const [branchesRes, frameRes] = await Promise.all(requests);

        if (branchesRes?.data.success) {
          setBranches(branchesRes.data.data);
        }

        if (frameRes?.data.success) {
          const frame: FrameItem = frameRes.data.data;
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
        } else if (frameRes?.data.success === false) {
          setErrorMsg(frameRes.data.error || 'Frame tidak ditemukan.');
        }
      } catch (e) {
        console.error('Load frame form error:', e);
        setErrorMsg('Gagal memuat data frame.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, isEdit, canChooseBranch]);

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
    if (formData.slotsConfig.length === 0) {
      setFormData((prev) => ({
        ...prev,
        slotsConfig: autoLayoutSlots(prev.width || DEFAULT_WIDTH, prev.height || DEFAULT_HEIGHT, prev.photoCount),
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      slotsConfig: autoLayoutSlots(prev.width || DEFAULT_WIDTH, prev.height || DEFAULT_HEIGHT, prev.photoCount),
    }));
  };

  const addSlot = () => {
    setFormData((prev) => ({
      ...prev,
      slotsConfig: [...prev.slotsConfig, defaultSlotBelow(prev.width || DEFAULT_WIDTH, prev.height || DEFAULT_HEIGHT, prev.slotsConfig)],
    }));
  };

  const duplicateSlot = (index: number) => {
    setFormData((prev) => {
      const src = prev.slotsConfig[index];
      if (!src) return prev;
      const isPortrait = (prev.height || 0) >= (prev.width || 0);
      const gap = 40;
      // cari slot terakhir dengan ukuran sama → duplikat baru diletakkan setelahnya (kaskade)
      const anchorIdx =
        [...prev.slotsConfig]
          .map((s, i) => ({ s, i }))
          .reverse()
          .find(({ s }) => s.width === src.width && s.height === src.height)?.i ?? index;
      const anchor = prev.slotsConfig[anchorIdx];
      const newX = anchor.x + (isPortrait ? 0 : anchor.width + gap);
      const newY = anchor.y + (isPortrait ? anchor.height + gap : 0);
      const clone: FrameSlot = {
        ...src,
        x: Math.min(newX, Math.max(0, (prev.width || DEFAULT_WIDTH) - src.width)),
        y: Math.min(newY, Math.max(0, (prev.height || DEFAULT_HEIGHT) - src.height)),
      };
      const newSlots = [...prev.slotsConfig];
      newSlots.splice(anchorIdx + 1, 0, clone);
      return { ...prev, photoCount: newSlots.length, slotsConfig: newSlots };
    });
  };

  const updateSlot = (index: number, patch: Partial<FrameSlot>) => {
    setFormData((prev) => {
      const slots = [...prev.slotsConfig];
      if (slots[index]) {
        slots[index] = { ...slots[index], ...patch };
      }
      return { ...prev, slotsConfig: slots };
    });
  };

  const removeSlot = () => {
    setFormData((prev) => {
      if (prev.slotsConfig.length <= 1) return prev;
      return { ...prev, slotsConfig: prev.slotsConfig.slice(0, -1) };
    });
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
      if (isEdit && id) {
        await api.put(`/frames/${id}`, payload);
      } else {
        await api.post('/frames', payload);
      }
      navigate('/frames');
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Gagal menyimpan master frame.');
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

  const selectedSlot = selectedSlotIndex >= 0 ? formData.slotsConfig[selectedSlotIndex] : undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header Full Width */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isEdit ? 'Edit Master Frame' : 'Tambah Master Frame Baru'}
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Kelola tipe fisik frame/grid, dimensi cetak, jumlah pose foto, penetapan harga transaksi, serta relasi ke cabang.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/frames"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
          >
            ← Kembali
          </Link>
          <button
            type="button"
            onClick={submitFrame}
            disabled={isSubmitting || (isEdit ? false : !canCreate)}
            className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {!isEdit && !canCreate && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 mb-4">
          Anda tidak memiliki izin untuk membuat frame baru.
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
              Editor Slot Foto
            </h2>
            <div className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-500 border border-indigo-500/30">
              Ukuran Cetak: {formData.width} × {formData.height}
            </div>
          </div>
          <div className="flex-1 p-4 bg-zinc-950/40 flex flex-col items-center justify-center min-h-0 overflow-hidden relative">
            <SlotEditor
              width={formData.width}
              height={formData.height}
              slots={formData.slotsConfig}
              selectedSlotIndex={selectedSlotIndex}
              onSelectChange={setSelectedSlotIndex}
              keepRatio={keepRatio}
              onDuplicate={() => selectedSlotIndex >= 0 && duplicateSlot(selectedSlotIndex)}
              onChange={(slots) => setFormData((prev) => ({ ...prev, slotsConfig: slots }))}
            />
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-3 bg-zinc-950/80">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Orientasi</span>
              <span className="text-xs font-bold text-zinc-200">{formData.height >= formData.width ? 'Portrait' : 'Landscape'}</span>
            </div>
            <div className="h-6 w-px bg-zinc-800"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ukuran</span>
              <span className="text-xs font-bold text-zinc-200">{formData.width} × {formData.height} px</span>
            </div>
            <div className="h-6 w-px bg-zinc-800"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rasio</span>
              <span className="text-xs font-bold text-zinc-200">
                {(formData.width / Math.min(formData.width, formData.height)).toFixed(1)} : {(formData.height / Math.min(formData.width, formData.height)).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* PANEL KANAN (Form) */}
        <div className="lg:w-[55%] w-full flex flex-col h-full overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          <form id="frame-form" onSubmit={submitFrame} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl shadow-black/10">
            {errorMsg && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{errorMsg}</div>}

            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-bold text-white">Informasi Frame</h3>
            </div>

        {/* Preset Template Selector (saat membuat frame baru) */}
        {!isEdit && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-2">
            <label className="block text-xs font-bold text-indigo-300">Pilih Preset Ukuran Cetak</label>
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="custom">Custom (Dari Awal)</option>
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
            disabled={isEdit}
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
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl shadow-black/10">
          <div className="flex items-start gap-3 mb-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pengaturan Slot Foto</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Atur posisi dan ukuran slot foto pada kanvas di panel kiri. Slot akan muncul sesuai jumlah pose yang dipilih.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={autoArrangeSlots}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-indigo-500 shadow shadow-indigo-600/20"
              >
                + Auto Tata Slot
              </button>
              <button
                type="button"
                onClick={addSlot}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-zinc-700"
              >
                + Slot
              </button>
              <button
                type="button"
                onClick={() => selectedSlotIndex >= 0 && duplicateSlot(selectedSlotIndex)}
                disabled={selectedSlotIndex < 0}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-40"
              >
                + Duplikat
              </button>
              <button
                type="button"
                onClick={removeSlot}
                disabled={formData.slotsConfig.length <= 1}
                className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-[10px] font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-40"
              >
                − Hapus
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-zinc-300">
                <input type="checkbox" checked={keepRatio} onChange={(e) => setKeepRatio(e.target.checked)} className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900" />
                Kunci Rasio
              </label>
              <button
                type="button"
                disabled={selectedSlotIndex < 0 || !selectedSlot?.rotation}
                onClick={() => selectedSlotIndex >= 0 && updateSlot(selectedSlotIndex, { rotation: 0 })}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-40 flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Reset Rotasi
              </button>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3 px-1">Posisi &amp; Ukuran</h4>
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-zinc-950/40 p-3">
              <NumInput
                label="Rotasi"
                value={selectedSlot?.rotation ?? 0}
                min={-360}
                max={360}
                disabled={selectedSlotIndex < 0}
                width="w-14"
                onCommit={(v) => selectedSlotIndex >= 0 && updateSlot(selectedSlotIndex, { rotation: v })}
              />
              <NumInput
                label="Radius"
                value={selectedSlot?.radius ?? 10}
                min={0}
                max={999}
                disabled={selectedSlotIndex < 0}
                width="w-14"
                onCommit={(v) => selectedSlotIndex >= 0 && updateSlot(selectedSlotIndex, { radius: v })}
              />
              <div className="h-4 w-px bg-zinc-800"></div>
              <NumInput
                label="Lebar"
                value={selectedSlot?.width ?? 0}
                min={20}
                max={Math.max(20, formData.width)}
                disabled={selectedSlotIndex < 0}
                width="w-16"
                onCommit={(v) => selectedSlotIndex >= 0 && updateSlot(selectedSlotIndex, { width: v })}
              />
              <NumInput
                label="Tinggi"
                value={selectedSlot?.height ?? 0}
                min={20}
                max={Math.max(20, formData.height)}
                disabled={selectedSlotIndex < 0}
                width="w-16"
                onCommit={(v) => selectedSlotIndex >= 0 && updateSlot(selectedSlotIndex, { height: v })}
              />
              <div className="h-4 w-px bg-zinc-800"></div>
              <NumInput
                label="X"
                value={selectedSlot?.x ?? 0}
                min={0}
                max={Math.max(0, formData.width - (selectedSlot?.width ?? 0))}
                disabled={selectedSlotIndex < 0}
                width="w-14"
                onCommit={(v) => selectedSlotIndex >= 0 && updateSlot(selectedSlotIndex, { x: v })}
              />
              <NumInput
                label="Y"
                value={selectedSlot?.y ?? 0}
                min={0}
                max={Math.max(0, formData.height - (selectedSlot?.height ?? 0))}
                disabled={selectedSlotIndex < 0}
                width="w-14"
                onCommit={(v) => selectedSlotIndex >= 0 && updateSlot(selectedSlotIndex, { y: v })}
              />
            </div>
            
            <div className="mt-3 flex items-center justify-between px-1">
              <div className="flex gap-1">
                {formData.slotsConfig.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedSlotIndex(i)}
                    className={`rounded-md px-2 py-0.5 text-[9px] font-bold transition ${
                      selectedSlotIndex === i ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Slot {i + 1}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-500">
                {formData.photoCount} pose • {formData.slotsConfig.length} slot
              </span>
            </div>
          </div>
        </div>
      </form>
      </div>
    </div>
  </div>
  );
};