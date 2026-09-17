import React, { useEffect, useState } from 'react';
import {
  CameraOption,
  PrinterOption,
  DeviceSelection,
  detectCameras,
  detectPrinters,
  loadDeviceSettings,
  saveDeviceSettings,
} from '../lib/deviceSettings';
import { useKioskStore } from '../store/kioskStore';

/**
 * Modal pengaturan perangkat (kamera & printer) mesin kiosk.
 * Dibuka dari menu pengaturan setelah login (layar STANDBY).
 * Pilihan disimpan di localStorage mesin — tidak ada pengaturan per akun/global.
 * UI berupa daftar tombol yang ramah layar sentuh (tanpa <select> native).
 */
export const DeviceSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const loadDeviceSettingsFromStore = useKioskStore((s) => s.loadDeviceSettings);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [isDetecting, setIsDetecting] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const refresh = async () => {
    setIsDetecting(true);
    setMsg(null);
    try {
      const [camRes, printRes] = await Promise.all([detectCameras(), detectPrinters()]);
      setCameras(camRes);
      setPrinters(printRes);

      const saved = loadDeviceSettings();
      setCameraId(saved.camera?.deviceId ?? '');
      setPrinterName(saved.printer?.name ?? '');
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    const selection: DeviceSelection = {
      camera: cameraId
        ? { deviceId: cameraId, label: cameras.find((c) => c.deviceId === cameraId)?.label || cameraId }
        : null,
      printer: printerName
        ? { name: printerName, label: printers.find((p) => p.name === printerName)?.label || printerName }
        : null,
    };

    saveDeviceSettings(selection);
    loadDeviceSettingsFromStore();
    setMsg({ type: 'ok', text: 'Pengaturan perangkat mesin berhasil disimpan.' });
  };

  /** Tombol pilihan (default / perangkat) — ramah sentuh, ukuran besar. */
  const OptionButton = ({
    active,
    onClick,
    icon,
    title,
    sub,
  }: {
    active: boolean;
    onClick: () => void;
    icon: string;
    title: string;
    sub?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.98] ${
        active
          ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-lg shadow-indigo-500/20'
          : 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-base">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {sub && <span className="block truncate text-[10px] text-zinc-500">{sub}</span>}
      </span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          active ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-zinc-600 bg-zinc-800'
        }`}
      >
        {active && (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-left shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Pengaturan Perangkat Kiosk</h3>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Pilih kamera & printer untuk mesin ini. Disimpan di mesin, tanpa pengaturan global.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
            Pengaturan berlaku untuk <span className="font-semibold text-zinc-300">mesin ini</span> — tanpa akun device,
            tanpa pengaturan global.
          </div>

          {msg && (
            <div
              className={`rounded-xl border p-3 text-xs ${
                msg.type === 'ok'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/20 bg-red-500/10 text-red-300'
              }`}
            >
              {msg.text}
            </div>
          )}

          {isDetecting ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-400">Kamera</label>
                <div className="space-y-2">
                  <OptionButton
                    active={!cameraId}
                    onClick={() => setCameraId('')}
                    icon="🎥"
                    title="Default Sistem"
                    sub="Kamera bawaan (fallback bila terpilih tidak ditemukan)"
                  />
                  {cameras.map((c) => (
                    <OptionButton
                      key={c.deviceId}
                      active={cameraId === c.deviceId}
                      onClick={() => setCameraId(c.deviceId)}
                      icon="📷"
                      title={c.label || 'Kamera'}
                      sub={c.deviceId}
                    />
                  ))}
                  {cameras.length === 0 && (
                    <p className="text-[10px] text-zinc-500">
                      Tidak ada kamera terdeteksi di mesin ini (akan memakai mode simulasi bila perlu).
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-400">Printer</label>
                <div className="space-y-2">
                  <OptionButton
                    active={!printerName}
                    onClick={() => setPrinterName('')}
                    icon="🖨️"
                    title="Default Sistem"
                    sub="Cetak otomatis memakai printer default OS"
                  />
                  {printers.map((p) => (
                    <OptionButton
                      key={p.name}
                      active={printerName === p.name}
                      onClick={() => setPrinterName(p.name)}
                      icon="🖨️"
                      title={p.label || p.name}
                      sub={p.name}
                    />
                  ))}
                  {printers.length === 0 && (
                    <p className="text-[10px] text-zinc-500">
                      Tidak ada printer terdeteksi (opsional — cetak auto memakai default sistem).
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isDetecting}
              className="rounded-xl bg-zinc-800 px-4 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 active:scale-95"
            >
              Deteksi Ulang
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-zinc-800 px-4 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 active:scale-95"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isDetecting}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 active:scale-95"
              >
                Simpan Perangkat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};