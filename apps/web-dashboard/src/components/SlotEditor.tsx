import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Moveable from 'react-moveable';
import type { FrameSlot } from '../pages/admin/FramesPage';

/* ─── props ─────────────────────────────────────────── */
interface SlotEditorProps {
  width: number;
  height: number;
  slots: FrameSlot[];
  onChange: (slots: FrameSlot[]) => void;
  onSelectChange?: (index: number) => void;
  onDuplicate?: () => void;
}

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const MIN_SLOT = 20;

const getSlotIndex = (el: any): number => {
  if (!el) return -1;
  const i = el.dataset?.slotIndex;
  return typeof i === 'string' ? Number(i) : -1;
};

/* ─── live readout type ──────────────────────────────── */
interface LiveInfo { i: number; x: number; y: number; w: number; h: number; rot: number; radius: number }

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

/* ─── component ─────────────────────────────────────── */
export const SlotEditor: React.FC<SlotEditorProps> = ({ width, height, slots, onChange, onSelectChange, onDuplicate }) => {
  const [selected, setSelected] = useState(-1);
  const [keepRatio, setKeepRatio] = useState(true);

  /* ── live readout (update tiap frame tanpa mengubah slots[]) ── */
  const [liveInfo, setLiveInfo] = useState<LiveInfo | null>(null);
  const rafRef = useRef(0);

  /** Schedule a readout update via rAF — coalesce multiple calls per frame */
  const pushLive = useCallback((info: LiveInfo) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setLiveInfo({ ...info }));
  }, []);

  const clearLive = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setLiveInfo(null);
  }, []);

  /* refs — tidak memicu re-render */
  const selectionRef = useRef(-1);
  const slotRefs = useRef<Record<number, HTMLDivElement>>({});
  const dragState = useRef<{ i: number; left: number; top: number; lastBT: number[] }>({
    i: -1, left: 0, top: 0, lastBT: [0, 0],
  });
  const resizeState = useRef<{
    i: number; startX: number; startY: number;
    sizeW: number; sizeH: number;
    width: number; height: number; bt: number[]; raf: number;
  }>({ i: -1, startX: 0, startY: 0, sizeW: 0, sizeH: 0, width: 0, height: 0, bt: [0, 0], raf: 0 });

  /* ── preview / sidebar scales ─────────────────────── */
  const MAX_PREVIEW_W = 460;
  const MAX_PREVIEW_H = 520;
  const scale = Math.min(MAX_PREVIEW_W / (width || 1), MAX_PREVIEW_H / (height || 1), 2);
  const pWidth  = Math.max(4, Math.round((width  || 1) * scale));
  const pHeight = Math.max(4, Math.round((height || 1) * scale));

  const SIDE_MAX = 220;
  const sideScale = Math.min(SIDE_MAX / (width || 1), SIDE_MAX / (height || 1), 0.8);
  const sideW = Math.round((width  || 1) * sideScale);
  const sideH = Math.round((height || 1) * sideScale);

  useEffect(() => {
    if (selected >= 0 && selected >= slots.length) setSelected(-1);
  }, [selected, slots.length]);

  /* ── sync selection ke parent (untuk tombol Duplicate) ── */
  useEffect(() => {
    onSelectChange?.(selected);
  }, [selected, onSelectChange]);

  /* ── shortcut keyboard: D = duplikat slot terpilih ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'd' && selected >= 0) {
        e.preventDefault();
        onDuplicate?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onDuplicate]);

  /* ── imperative highlight (tanpa re-render) ───────── */
  const setVisual = (idx: number) => {
    if (selectionRef.current === idx) return;
    const prev = selectionRef.current;
    if (prev >= 0 && slotRefs.current[prev]) {
      slotRefs.current[prev].classList.remove('slot-active');
    }
    selectionRef.current = idx;
    if (idx >= 0 && slotRefs.current[idx]) {
      slotRefs.current[idx].classList.add('slot-active');
    }
  };

  useEffect(() => { setVisual(selected); }, [selected]);

  const updateSlot = (index: number, patch: Partial<FrameSlot>) => {
    onChange(slots.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleSelect = (index: number) => setSelected(index);

  /* ── slot ref callback ─────────────────────────────── */
  const slotRefCb = (i: number) => (el: HTMLDivElement | null) => {
    if (el) slotRefs.current[i] = el;
  };

  /* ================================================================
     DRAG
     ================================================================ */
  const onDragStart = (e: any) => {
    const i = getSlotIndex(e.target);
    if (i < 0) return;
    const s = slots[i];
    if (!s) return;
    setVisual(i);
    dragState.current = { i, left: s.x * scale, top: s.y * scale, lastBT: [0, 0] };
  };

  const onDrag = (e: any) => {
    const st = dragState.current;
    if (st.i < 0) return;
    st.lastBT = e.beforeTranslate || [0, 0];
    const s = slots[st.i];
    if (!s) return;
    const [btX, btY] = st.lastBT;
    const nxPx = clamp(st.left + btX, 0, Math.max(0, pWidth  - s.width  * scale));
    const nyPx = clamp(st.top  + btY, 0, Math.max(0, pHeight - s.height * scale));
    pushLive({ i: st.i, x: round(nxPx / scale), y: round(nyPx / scale), w: s.width, h: s.height, rot: s.rotation || 0, radius: s.radius ?? 10 });
  };

  const onDragEnd = () => {
    const st = dragState.current;
    if (st.i < 0) return;
    const i = st.i;
    const s = slots[i];
    const [btX, btY] = st.lastBT;
    const nxPx = clamp(st.left + btX, 0, Math.max(0, pWidth  - s.width  * scale));
    const nyPx = clamp(st.top  + btY, 0, Math.max(0, pHeight - s.height * scale));
    if (s) {
      updateSlot(i, { x: round(nxPx / scale), y: round(nyPx / scale) });
      const el = slotRefs.current[i];
      if (el) {
        el.style.left = `${nxPx}px`;
        el.style.top  = `${nyPx}px`;
        el.style.transform = `rotate(${s.rotation || 0}deg)`;
      }
    }
    dragState.current.i = -1;
    clearLive();
    setVisual(i);
    setSelected(i);
  };

  /* ================================================================
     RESIZE
     ================================================================ */
  const onResizeStart = (e: any) => {
    const i = getSlotIndex(e.target);
    if (i < 0) return;
    const s = slots[i];
    if (!s) return;
    setVisual(i);
    resizeState.current = {
      i, startX: s.x * scale, startY: s.y * scale,
      sizeW: s.width * scale, sizeH: s.height * scale,
      width: s.width * scale, height: s.height * scale, bt: [0, 0], raf: 0,
    };
  };

  const onResize = (e: any) => {
    const el = e.target as HTMLElement | null;
    if (!el) return;
    const st = resizeState.current;
    if (st.i < 0) return;
    const w = Math.max(MIN_SLOT * scale, e.width);
    const h = Math.max(MIN_SLOT * scale, e.height);
    st.width = w; st.height = h;
    st.bt = e.drag?.beforeTranslate || [0, 0];

    const s = slots[st.i];
    const theta = s?.rotation || 0;

    // ══ CENTER-ANCHORED: shrink/grow simetris sekitar pusat slot ══
    // Δ pivot supaya pusat elemen tetap di tempat (translate parent-frame, aman walau dirotasi)
    const dx = (st.sizeW - w) / 2;
    const dy = (st.sizeH - h) / 2;
    const nx = clamp(st.startX + dx, 0, Math.max(0, pWidth  - w));
    const ny = clamp(st.startY + dy, 0, Math.max(0, pHeight - h));

    el.style.width  = `${w}px`;
    el.style.height = `${h}px`;
    el.style.left = `${nx}px`;
    el.style.top  = `${ny}px`;
    // override translate anchor bawaan Moveable → hanya rotasi
    el.style.transform = `rotate(${theta}deg)`;

    // re-assert akhir frame (Moveable mungkin menulis transform setelah handler)
    cancelAnimationFrame(st.raf);
    st.raf = requestAnimationFrame(() => {
      if (resizeState.current.i !== st.i) return;
      el.style.transform = `rotate(${theta}deg)`;
      el.style.left = `${nx}px`;
      el.style.top  = `${ny}px`;
    });

    if (s) {
      pushLive({
        i: st.i,
        x: round(nx / scale),
        y: round(ny / scale),
        w: round(w / scale), h: round(h / scale),
        rot: theta, radius: s.radius ?? 10,
      });
    }
  };

  const onResizeEnd = (e: any) => {
    const st = resizeState.current;
    const i = getSlotIndex(e.target);
    if (st.i < 0 || i < 0) { resizeState.current.i = -1; return; }
    const s = slots[i];
    if (s && e.target) {
      cancelAnimationFrame(st.raf);
      const w = Math.max(MIN_SLOT, st.width  / scale);
      const h = Math.max(MIN_SLOT, st.height / scale);
      const dx = (st.sizeW - st.width) / 2;
      const dy = (st.sizeH - st.height) / 2;
      const nx = clamp(st.startX + dx, 0, Math.max(0, pWidth  - st.width));
      const ny = clamp(st.startY + dy, 0, Math.max(0, pHeight - st.height));
      updateSlot(i, {
        x: round(nx / scale),
        y: round(ny / scale),
        width:  round(w),
        height: round(h),
      });
      const el = e.target as HTMLElement;
      el.style.left = `${nx}px`;
      el.style.top  = `${ny}px`;
      el.style.transform = `rotate(${s.rotation || 0}deg)`;
    }
    resizeState.current.i = -1;
    clearLive();
    setVisual(i);
    setSelected(i);
  };

  /* ================================================================
     ROTATE
     ================================================================ */
  const onRotateStart = (e: any) => {
    const i = getSlotIndex(e.target);
    if (i < 0) return;
    setVisual(i);
  };

  const onRotate = (e: any) => {
    const el = e.target as HTMLElement | null;
    if (el && e.transform) el.style.transform = e.transform;
    const i = getSlotIndex(e.target);
    if (i >= 0) {
      const s = slots[i];
      if (s) pushLive({ i, x: s.x, y: s.y, w: s.width, h: s.height, rot: Math.round(e.rotation || 0), radius: s.radius ?? 10 });
    }
  };

  const onRotateEnd = (e: any) => {
    const i = getSlotIndex(e.target);
    if (i < 0 || e.rotation === undefined) return;
    updateSlot(i, { rotation: Math.round(e.rotation) });
    const el = e.target as HTMLElement | null;
    if (el) el.style.transform = `rotate(${Math.round(e.rotation)}deg)`;
    clearLive();
    setVisual(i);
    setSelected(i);
  };

  /* ── display values ────────────────────────────────── */
  const selectedSlot = selected >= 0 ? slots[selected] : undefined;
  const display = liveInfo && selected >= 0 && liveInfo.i === selected
    ? liveInfo
    : selectedSlot
      ? { i: selected, x: selectedSlot.x, y: selectedSlot.y, w: selectedSlot.width, h: selectedSlot.height, rot: selectedSlot.rotation || 0, radius: selectedSlot.radius ?? 10 }
      : null;

  /* ── panduan tengah (muncul saat drag mendekati tengah kanvas) ── */
  // liveInfo dalam ukuran kanvas aktual (px @frame), bandingkan dengan pusat kanvas aktual.
  const cw = width || 1;
  const ch = height || 1;
  const centerTol = 6 / Math.max(0.001, scale); // ~6px tampilan, dikonversi ke px aktual
  const guideX = liveInfo
    ? Math.abs(liveInfo.x + liveInfo.w / 2 - cw / 2) <= centerTol
    : false;
  const guideY = liveInfo
    ? Math.abs(liveInfo.y + liveInfo.h / 2 - ch / 2) <= centerTol
    : false;

  /* ================================================================
     JSX
     ================================================================ */
  return (
    <div className="slot-editor">
      <style>{`
        .slot-editor .slot-active {
          z-index: 20 !important;
          background: rgba(99,102,241,0.18) !important;
          outline: 2px solid rgba(129,140,248,0.95);
          outline-offset: 1px;
        }
        .slot-editor .moveable-control { border-radius: 50%; }
      `}</style>

      {/* ── chip bar + toolbar ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {slots.length === 0 && (
            <span className="text-[11px] text-zinc-500">Belum ada slot.</span>
          )}
          {slots.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                selected === i ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              Pose {i + 1}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-400">
            <input type="checkbox" checked={keepRatio} onChange={(e) => setKeepRatio(e.target.checked)} className="accent-indigo-500" />
            Kunci Rasio
          </label>

          <button
            type="button"
            disabled={selected < 0 || !selectedSlot?.rotation}
            onClick={() => selected >= 0 && updateSlot(selected, { rotation: 0 })}
            className="rounded-lg bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-40"
          >
            ↺ Reset Rotasi
          </button>
        </div>
      </div>

      {/* ── inspector: posisi & ukuran slot (diketik manual) ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Posisi &amp; Ukuran</span>
        <NumInput
          label="X"
          value={selectedSlot?.x ?? 0}
          min={0}
          max={Math.max(0, width - (selectedSlot?.width ?? 0))}
          disabled={selected < 0}
          onCommit={(v) => selected >= 0 && updateSlot(selected, { x: v })}
        />
        <NumInput
          label="Y"
          value={selectedSlot?.y ?? 0}
          min={0}
          max={Math.max(0, height - (selectedSlot?.height ?? 0))}
          disabled={selected < 0}
          onCommit={(v) => selected >= 0 && updateSlot(selected, { y: v })}
        />
        <NumInput
          label="Lebar"
          value={selectedSlot?.width ?? 0}
          min={MIN_SLOT}
          max={Math.max(MIN_SLOT, width)}
          disabled={selected < 0}
          suffix="px"
          onCommit={(v) => selected >= 0 && updateSlot(selected, { width: v })}
        />
        <NumInput
          label="Tinggi"
          value={selectedSlot?.height ?? 0}
          min={MIN_SLOT}
          max={Math.max(MIN_SLOT, height)}
          disabled={selected < 0}
          suffix="px"
          onCommit={(v) => selected >= 0 && updateSlot(selected, { height: v })}
        />
        <NumInput
          label="Rotasi"
          value={selectedSlot?.rotation ?? 0}
          min={-360}
          max={360}
          disabled={selected < 0}
          suffix="°"
          onCommit={(v) => selected >= 0 && updateSlot(selected, { rotation: v })}
        />
        <NumInput
          label="Radius"
          value={selectedSlot?.radius ?? 10}
          min={0}
          max={999}
          disabled={selected < 0}
          suffix="px"
          onCommit={(v) => selected >= 0 && updateSlot(selected, { radius: v })}
        />
      </div>

      {/* ── canvas + sidebar preview ─────────────────── */}
      <div className="mt-3 flex justify-center gap-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        {/* main canvas */}
        <div
          className="relative shrink-0 overflow-hidden rounded-lg border border-zinc-700 shadow-inner"
          style={{
            width: pWidth, height: pHeight,
            backgroundImage:
              'linear-gradient(45deg,#3f3f46 25%,transparent 25%,transparent 75%,#3f3f46 75%),linear-gradient(45deg,#3f3f46 25%,#27272a 25%,#27272a 75%,#3f3f46 75%)',
            backgroundSize: '28px 28px',
            backgroundPosition: '0 0,14px 14px',
          }}
          onMouseDown={() => handleSelect(-1)}
        >
          {/* panduan sumbu tengah kanvas saat slot mendekati pusat */}
          {guideX && (
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[15] -translate-x-1/2 w-px bg-amber-300/80 shadow-[0_0_6px_rgba(252,211,77,0.6)]">
              <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-bold text-zinc-900 shadow">
                ↔ Tengah
              </span>
            </div>
          )}
          {guideY && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[15] -translate-y-1/2 h-px bg-amber-300/80 shadow-[0_0_6px_rgba(252,211,77,0.6)]">
              <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-bold text-zinc-900 shadow">
                ↕ Tengah
              </span>
            </div>
          )}

          {slots.map((s, i) => (
            <Fragment key={i}>
              <div
                ref={slotRefCb(i)}
                data-slot-index={i}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute flex cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing bg-white/5 ring-1 ring-inset ring-dashed ring-white/40"
                style={{
                  left:   s.x * scale,
                  top:    s.y * scale,
                  width:  s.width  * scale,
                  height: s.height * scale,
                  transform: `rotate(${s.rotation || 0}deg)`,
                  transformOrigin: 'center',
                  borderRadius: (s.radius ?? 10) * scale,
                }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800/90 text-[10px] font-bold text-zinc-300">
                  {i + 1}
                </span>
              </div>

              <Moveable
                target={`[data-slot-index="${i}"]`}
                draggable
                resizable={selected === i}
                rotatable={selected === i}
                keepRatio={keepRatio}
                renderDirections={['nw','n','ne','e','se','s','sw','w']}
                hideDefaultLines={selected !== i}
                throttleDrag={0}
                throttleResize={0}
                throttleRotate={0}
                origin={false}
                controlPadding={10}
                linePadding={6}
                transform={`rotate(${s.rotation || 0}deg)`}
                onDragStart={onDragStart}
                onDrag={onDrag}
                onDragEnd={onDragEnd}
                onResizeStart={onResizeStart}
                onResize={onResize}
                onResizeEnd={onResizeEnd}
                onRotateStart={onRotateStart}
                onRotate={onRotate}
                onRotateEnd={onRotateEnd}
                className="snap-none"
              />
            </Fragment>
          ))}
        </div>

        {/* ── sidebar : preview hasil cetak ──────────── */}
        <div className="flex w-28 shrink-0 flex-col items-center gap-2 py-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Hasil Cetak</span>
          <div className="flex items-center justify-center rounded-lg bg-zinc-900/60 p-2">
            <div
              className="relative overflow-hidden rounded border border-zinc-600 bg-zinc-800"
              style={{ width: sideW, height: sideH }}
            >
              {slots.map((s, i) => {
                const live = liveInfo && liveInfo.i === i ? liveInfo : null;
                return (
                  <div
                    key={i}
                    className="absolute bg-indigo-400/20 ring-1 ring-inset ring-indigo-400/30"
                    style={{
                      left:   (live?.x ?? s.x) * sideScale,
                      top:    (live?.y ?? s.y) * sideScale,
                      width:  (live?.w ?? s.width) * sideScale,
                      height: (live?.h ?? s.height) * sideScale,
                      borderRadius: (live?.radius ?? s.radius ?? 10) * sideScale,
                    }}
                  />
                );
              })}
            </div>
          </div>
          <span className="font-mono text-[10px] text-zinc-500">{width} × {height} px</span>
        </div>
      </div>

      {/* ── readout koordinat (live saat gesture) ────── */}
      {display && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-zinc-900/80 px-3 py-2 text-[11px] font-mono text-zinc-400">
          <span className="font-semibold text-indigo-300">Pose {(display.i ?? selected) + 1}</span>
          <span>X: {display.x}</span>
          <span>Y: {display.y}</span>
          <span>W: {display.w}</span>
          <span>H: {display.h}</span>
          <span>Rot: {display.rot}°</span>
          <span>Radius: {display.radius}</span>
        </div>
      )}
    </div>
  );
};
