import { isDesktop } from './desktop';

export interface CameraOption {
  deviceId: string;
  label: string;
}

export interface PrinterOption {
  name: string;
  label: string;
}

export interface DeviceSelection {
  camera: CameraOption | null;
  printer: PrinterOption | null;
}

/**
 * Pilihan kamera & printer disimpan di localStorage mesin kiosk (tingkat
 * mesin — bukan per akun). Murni lokal, tidak ada pengaturan global / per
 * cabang dan tidak dikirim ke cloud.
 */
const STORAGE_KEY = 'photobox_device_settings';

export function loadDeviceSettings(): DeviceSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        camera: parsed?.camera ?? null,
        printer: parsed?.printer ?? null,
      };
    }
  } catch (e) {
    console.warn('[DeviceSettings] Gagal membaca pengaturan:', e);
  }
  return { camera: null, printer: null };
}

export function saveDeviceSettings(selection: DeviceSelection) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch (e) {
    console.warn('[DeviceSettings] Gagal menyimpan pengaturan:', e);
  }
}

/** Deteksi daftar kamera yang tersedia (minta izin sementara bila label masih kosong). */
export async function detectCameras(): Promise<CameraOption[]> {
  const cameras: CameraOption[] = [];
  if (!navigator.mediaDevices?.enumerateDevices) return cameras;

  let videoInputs = (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) => d.kind === 'videoinput'
  );

  if (videoInputs.some((d) => !d.label)) {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      tmp.getTracks().forEach((t) => t.stop());
      videoInputs = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === 'videoinput'
      );
    } catch {
      /* izin ditolak → pakai daftar tanpa label */
    }
  }

  videoInputs.forEach((d, i) => {
    cameras.push({ deviceId: d.deviceId, label: d.label || `Kamera ${i + 1}` });
  });

  return cameras;
}

/** Deteksi daftar printer yang tersedia (hanya di aplikasi desktop/Electron). */
export async function detectPrinters(): Promise<PrinterOption[]> {
  if (!isDesktop()) return [];
  try {
    const res = await window.photoboxDesktop!.getPrinters();
    return (res.printers || []).map((p) => ({ name: p.name, label: p.name }));
  } catch (e) {
    console.warn('[DeviceSettings] Gagal membaca daftar printer:', e);
    return [];
  }
}