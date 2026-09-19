import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Moveable from 'react-moveable';
import type { FrameSlot } from '../pages/admin/FramesPage';

/* ─── props ─────────────────────────────────────────── */
interface SlotEditorProps {
  width: number;
  height: number;
  slots: FrameSlot[];
  selectedSlotIndex: number;
  onSelectChange: (index: number) => void;
  keepRatio: boolean;
  onChange: (slots: FrameSlot[]) => void;
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

export const SlotEditor: React.FC<SlotEditorProps> = ({ 
  width, height, slots, selectedSlotIndex: selected, onSelectChange: setSelected, keepRatio, onChange, onDuplicate 
}) => {

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

  /* ── container size measurement ─────────────────────── */
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 460, h: 520 });

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

  /* ── preview scales (fit canvas inside container) ──── */
  const PAD = 24; // padding inside the container
  const maxW = containerSize.w - PAD * 2;
  const maxH = containerSize.h - PAD * 2;
  const scale = Math.min(maxW / (width || 1), maxH / (height || 1), 2);
  const pWidth  = Math.max(4, Math.round((width  || 1) * scale));
  const pHeight = Math.max(4, Math.round((height || 1) * scale));

  useEffect(() => {
    if (selected >= 0 && selected >= slots.length) setSelected(-1);
  }, [selected, slots.length, setSelected]);

  /* ── arrow key move state ────────────────────────────── */
  const [isArrowMoving, setIsArrowMoving] = useState(false);
  const arrowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── shortcut keyboard: D = duplikat, Arrow keys = geser slot ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // D = duplicate
      if (e.key.toLowerCase() === 'd' && selected >= 0) {
        e.preventDefault();
        onDuplicate?.();
        return;
      }

      // Arrow keys = move selected slot
      if (selected < 0) return;
      const s = slots[selected];
      if (!s) return;

      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;

      switch (e.key) {
        case 'ArrowUp':    dy = -step; break;
        case 'ArrowDown':  dy = step;  break;
        case 'ArrowLeft':  dx = -step; break;
        case 'ArrowRight': dx = step;  break;
        default: return;
      }

      e.preventDefault();
      setIsArrowMoving(true);

      // Clear previous debounce timer
      if (arrowTimerRef.current) clearTimeout(arrowTimerRef.current);
      arrowTimerRef.current = setTimeout(() => {
        setIsArrowMoving(false);
        clearLive();
      }, 300);

      const newX = clamp(s.x + dx, 0, Math.max(0, width - s.width));
      const newY = clamp(s.y + dy, 0, Math.max(0, height - s.height));

      // Push liveInfo so snap guides appear
      pushLive({ i: selected, x: newX, y: newY, w: s.width, h: s.height, rot: s.rotation || 0, radius: s.radius ?? 10 });

      onChange(slots.map((sl, i) => i === selected ? { ...sl, x: newX, y: newY } : sl));
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, slots, width, height, onChange, onDuplicate, pushLive, clearLive]);

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

    // Let Moveable handle visual movement via transform
    const el = e.target as HTMLElement;
    if (el && e.transform) {
      el.style.transform = e.transform;
    }

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
      // Commit final position to left/top, reset transform to rotation-only
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

  /* ── panduan tengah & slot-to-slot (muncul saat drag/arrow key) ── */
  const cw = width || 1;
  const ch = height || 1;
  const centerTol = 6 / Math.max(0.001, scale);
  const guideX = liveInfo
    ? Math.abs(liveInfo.x + liveInfo.w / 2 - cw / 2) <= centerTol
    : false;
  const guideY = liveInfo
    ? Math.abs(liveInfo.y + liveInfo.h / 2 - ch / 2) <= centerTol
    : false;

  /* ── slot-to-slot snap guides (hanya saat arrow key / drag) ── */
  const slotGuides: { type: 'h' | 'v'; pos: number }[] = [];
  if (liveInfo && selected >= 0) {
    const tol = centerTol;
    const me = liveInfo;
    const meCx = me.x + me.w / 2;
    const meCy = me.y + me.h / 2;
    const meRight = me.x + me.w;
    const meBottom = me.y + me.h;

    slots.forEach((other, j) => {
      if (j === selected) return;
      const oCx = other.x + other.width / 2;
      const oCy = other.y + other.height / 2;
      const oRight = other.x + other.width;
      const oBottom = other.y + other.height;

      // Horizontal guides (same Y values)
      if (Math.abs(me.y - other.y) <= tol)        slotGuides.push({ type: 'h', pos: other.y });
      if (Math.abs(meBottom - oBottom) <= tol)     slotGuides.push({ type: 'h', pos: oBottom });
      if (Math.abs(me.y - oBottom) <= tol)         slotGuides.push({ type: 'h', pos: oBottom });
      if (Math.abs(meBottom - other.y) <= tol)     slotGuides.push({ type: 'h', pos: other.y });
      if (Math.abs(meCy - oCy) <= tol)             slotGuides.push({ type: 'h', pos: oCy });

      // Vertical guides (same X values)
      if (Math.abs(me.x - other.x) <= tol)        slotGuides.push({ type: 'v', pos: other.x });
      if (Math.abs(meRight - oRight) <= tol)       slotGuides.push({ type: 'v', pos: oRight });
      if (Math.abs(me.x - oRight) <= tol)          slotGuides.push({ type: 'v', pos: oRight });
      if (Math.abs(meRight - other.x) <= tol)      slotGuides.push({ type: 'v', pos: other.x });
      if (Math.abs(meCx - oCx) <= tol)             slotGuides.push({ type: 'v', pos: oCx });
    });
  }

  /* ================================================================
     JSX
     ================================================================ */
  return (
    <div ref={containerRef} className="slot-editor w-full h-full flex flex-col items-center justify-center">
      <style>{`
        .slot-editor {
          --canvas-grid-1: #3f3f46;
          --canvas-grid-2: #27272a;
        }
        .theme-light .slot-editor {
          --canvas-grid-1: #cbd5e1;
          --canvas-grid-2: #f1f5f9;
        }

        .slot-editor .slot-box {
          border: 2px dashed rgba(99, 102, 241, 0.75);
          background-color: rgba(99, 102, 241, 0.12);
          transition: border-color 0.15s, background-color 0.15s;
        }
        .slot-editor .slot-box:hover {
          border-color: rgba(99, 102, 241, 0.95);
          background-color: rgba(99, 102, 241, 0.2);
        }
        .slot-editor .slot-active {
          z-index: 20 !important;
          border-style: solid !important;
          border-color: #6366f1 !important;
          background-color: rgba(99, 102, 241, 0.22) !important;
          box-shadow: 0 0 14px rgba(99, 102, 241, 0.45) !important;
        }
        .theme-light .slot-editor .slot-active {
          box-shadow: 0 0 14px rgba(99, 102, 241, 0.5) !important;
        }

        .slot-editor .slot-badge {
          background-color: #6366f1;
          color: #ffffff !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
        }

        .slot-editor .moveable-line {
          background: #6366f1 !important;
          height: 2px !important;
        }
        .slot-editor .moveable-control {
          background: #ffffff !important;
          border: 2px solid #6366f1 !important;
          border-radius: 50% !important;
          width: 12px !important;
          height: 12px !important;
          margin-left: -6px !important;
          margin-top: -6px !important;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
        }
        .slot-editor .moveable-rotation-line {
          background: #6366f1 !important;
        }
        .slot-editor .moveable-rotation-line .moveable-control {
          background: #6366f1 !important;
          border: 2px solid #ffffff !important;
        }
      `}</style>

      {/* ── canvas ─────────────────── */}
      <div className="flex justify-center rounded-xl border border-zinc-700/60 bg-zinc-950 p-3 shadow-xl max-w-full overflow-hidden relative">
        <div
          className="relative shrink-0 overflow-hidden rounded-lg border border-zinc-600/60 shadow-inner"
          style={{
            width: pWidth, height: pHeight,
            backgroundImage:
              'linear-gradient(45deg, var(--canvas-grid-1) 25%, transparent 25%, transparent 75%, var(--canvas-grid-1) 75%), linear-gradient(45deg, var(--canvas-grid-1) 25%, var(--canvas-grid-2) 25%, var(--canvas-grid-2) 75%, var(--canvas-grid-1) 75%)',
            backgroundSize: '28px 28px',
            backgroundPosition: '0 0, 14px 14px',
          }}
          onMouseDown={() => handleSelect(-1)}
        >
          {/* panduan sumbu tengah kanvas saat slot mendekati pusat */}
          {guideX && (
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[15] -translate-x-1/2 w-px bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]">
              <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-slate-900 shadow">
                ↔ Tengah
              </span>
            </div>
          )}
          {guideY && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[15] -translate-y-1/2 h-px bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]">
              <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-slate-900 shadow">
                ↕ Tengah
              </span>
            </div>
          )}

          {/* slot-to-slot alignment guides (green) */}
          {slotGuides.map((g, gi) => (
            g.type === 'h' ? (
              <div
                key={`sg-${gi}`}
                className="pointer-events-none absolute z-[14] h-px bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"
                style={{ left: 0, right: 0, top: g.pos * scale }}
              />
            ) : (
              <div
                key={`sg-${gi}`}
                className="pointer-events-none absolute z-[14] w-px bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"
                style={{ top: 0, bottom: 0, left: g.pos * scale }}
              />
            )
          ))}

          {slots.map((s, i) => (
            <Fragment key={i}>
              <div
                ref={slotRefCb(i)}
                data-slot-index={i}
                onMouseDown={(e) => e.stopPropagation()}
                className={`absolute flex cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing slot-box ${
                  selected === i ? 'slot-active' : ''
                }`}
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
                <span className="slot-badge flex h-6 w-6 items-center justify-center rounded-md text-[10px]">
                  {i + 1}
                </span>
              </div>

              {/* Hide Moveable controls during arrow key movement to prevent ghost */}
              {!isArrowMoving && (
              <Moveable
                target={`[data-slot-index="${i}"]`}
                draggable
                resizable={selected === i}
                rotatable={selected === i}
                keepRatio={keepRatio}
                snappable
                snapThreshold={8}
                elementGuidelines={
                  slots.map((_, j) => j !== i ? `[data-slot-index="${j}"]` : null).filter(Boolean) as string[]
                }
                horizontalGuidelines={[pHeight / 2]}
                verticalGuidelines={[pWidth / 2]}
                isDisplaySnapDigit={false}
                snapDirections={{ top: true, bottom: true, left: true, right: true, center: true, middle: true }}
                elementSnapDirections={{ top: true, bottom: true, left: true, right: true, center: true, middle: true }}
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
              />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* ── readout koordinat (live saat gesture) ────── */}
      {display && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-700/60 bg-zinc-900/90 px-3 py-2 text-[11px] font-mono text-zinc-300">
          <span className="font-bold text-indigo-500">Pose {(display.i ?? selected) + 1}</span>
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
