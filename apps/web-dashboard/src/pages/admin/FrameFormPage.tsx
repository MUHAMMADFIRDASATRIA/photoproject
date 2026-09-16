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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isEdit ? 'Edit Master Frame' : 'Tambah Master Frame Baru'}
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Kelola tipe fisik frame/grid, dimensi cetak, jumlah pose foto, penetapan harga transaksi, serta relasi ke cabang.
          </p>
        </div>
        <Link
          to="/frames"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700"
        >
          ← Kembali ke Daftar
        </Link>
      </div>

      {!isEdit && !canCreate && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          Anda tidak memiliki izin untuk membuat frame baru.
        </div>
      )}

      <form onSubmit={submitFrame} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl shadow-black/10">
        {errorMsg && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{errorMsg}</div>}

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
          <Link
            to="/frames"
            className="rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || (isEdit ? false : !canCreate)}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Master Frame'}
          </button>
        </div>
      </form>
    </div>
  );
};