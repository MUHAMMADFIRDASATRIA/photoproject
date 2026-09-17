import { create } from 'zustand';
import { api } from '../lib/api';
import { composePhoto } from '../lib/compose';
import { isDesktop } from '../lib/desktop';
import { loadDeviceSettings as loadDeviceSettingsLocal } from '../lib/deviceSettings';

export type KioskStep =
  | 'DEVICE_LOGIN'
  | 'STANDBY'
  | 'SELECT_FRAME'
  | 'SELECT_DESIGN'
  | 'PAYMENT'
  | 'CAPTURE'
  | 'RESULT';

export interface DeviceInfo {
  id: number;
  username: string;
  branchId: number;
  branchName: string;
  branchAddress: string;
}

export interface FrameItem {
  id: number;
  name: string;
  code: string;
  width: number;
  height: number;
  photoCount: number;
  slotsConfig: { x: number; y: number; width: number; height: number; rotation?: number; radius?: number }[];
  price: number;
  thumbnailUrl?: string | null;
}

export interface DesignItem {
  id: number;
  frameId: number;
  name: string;
  overlayUrl: string;
  backgroundUrl?: string | null;
  bgColorHex?: string | null;
  thumbnailUrl: string;
  priceOverride?: number | null;
  slotBorderColor?: string | null;
  slotBorderWidth?: number | null;
  backgroundLayer?: 'below' | 'above' | null;
}

export interface TransactionInfo {
  id: number;
  branchId: number;
  frameId: number;
  designId: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  qrisPayload?: string;
  downloadUrl?: string;
}

interface KioskState {
  device: DeviceInfo | null;
  currentStep: KioskStep;
  frames: FrameItem[];
  designs: DesignItem[];
  selectedFrame: FrameItem | null;
  selectedDesign: DesignItem | null;
  currentTransaction: TransactionInfo | null;
  capturedPhotos: string[]; // dataURL array
  retakeIndex: number | null;
  printCopies: number;
  finalCompositeUrl: string | null;
  downloadUrl: string | null;
  photoSessionMinutes: number | null;
  sessionDeadline: number | null;
  timerExpired: boolean;
  cameraDeviceId: string | null;
  printerName: string | null;

  // Actions
  setStep: (step: KioskStep) => void;
  setPrintCopies: (copies: number) => void;
  loginDevice: (username: string, password: string) => Promise<boolean>;
  logoutDevice: () => void;
  initDevice: () => void;
  fetchFrames: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  loadDeviceSettings: () => void;
  fetchDesignsForFrame: (frameId: number) => Promise<void>;
  selectFrame: (frame: FrameItem) => void;
  selectDesign: (design: DesignItem) => void;
  createTransaction: () => Promise<boolean>;
  confirmPayment: () => Promise<boolean>;
  addCapturedPhoto: (photoDataUrl: string) => void;
  replaceCapturedPhoto: (index: number, photoDataUrl: string) => void;
  retakeSpecificPhoto: (index: number) => void;
  retakeAllPhotos: () => void;
  cancelRetake: () => void;
  resetCustomerSession: () => void;
  completeTransaction: (compositeDataUrl: string, photos?: string[]) => Promise<void>;
  finalizeSession: () => Promise<void>;
  startSessionTimer: () => void;
  stopSessionTimer: () => void;
}

export const useKioskStore = create<KioskState>((set, get) => {
  // Watcher batas waktu sesi foto: berjalan tiap detik selama ada deadline.
  // Saat waktu habis → langsung finalisasi (tetap lanjut ke halaman hasil).
  setInterval(() => {
    const { sessionDeadline, timerExpired, currentStep } = get();
    if (!sessionDeadline || timerExpired) return;
    if (Date.now() >= sessionDeadline) {
      if (currentStep === 'RESULT') {
        set({ sessionDeadline: null });
        return;
      }
      set({ timerExpired: true, sessionDeadline: null });
      void get().finalizeSession();
    }
  }, 1000);

  return {
  device: null,
  currentStep: 'DEVICE_LOGIN',
  frames: [],
  designs: [],
  selectedFrame: null,
  selectedDesign: null,
  currentTransaction: null,
  capturedPhotos: [],
  retakeIndex: null,
  printCopies: 1,
  finalCompositeUrl: null,
  downloadUrl: null,
  photoSessionMinutes: null,
  sessionDeadline: null,
  timerExpired: false,
  cameraDeviceId: null,
  printerName: null,

  setStep: (step) => set({ currentStep: step }),
  setPrintCopies: (copies) => set({ printCopies: Math.max(1, copies) }),

  initDevice: () => {
    const cachedDevice = localStorage.getItem('kiosk_device_info');
    const token = localStorage.getItem('kiosk_device_token');
    if (cachedDevice && token) {
      const device = JSON.parse(cachedDevice);
      set({
        device,
        currentStep: 'STANDBY',
      });
      get().loadDeviceSettings();
      get().fetchFrames();
      get().fetchSettings();
    } else {
      set({ currentStep: 'DEVICE_LOGIN' });
    }
  },

  loginDevice: async (username, password) => {
    try {
      const res = await api.post('/login-device', { username, password });
      if (res.data.success) {
        const { token, device } = res.data.data;
        localStorage.setItem('kiosk_device_token', token);
        localStorage.setItem('kiosk_device_info', JSON.stringify(device));
        set({
          device,
          currentStep: 'STANDBY',
        });
        get().loadDeviceSettings();
        get().fetchFrames();
        get().fetchSettings();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Device login error:', error);
      throw error;
    }
  },

  logoutDevice: () => {
    localStorage.removeItem('kiosk_device_token');
    localStorage.removeItem('kiosk_device_info');
    set({
      device: null,
      currentStep: 'DEVICE_LOGIN',
      selectedFrame: null,
      selectedDesign: null,
      currentTransaction: null,
      capturedPhotos: [],
      printCopies: 1,
      finalCompositeUrl: null,
    });
  },

  fetchFrames: async () => {
    try {
      const res = await api.get('/frames');
      if (res.data.success) {
        set({ frames: res.data.data });
      }
    } catch (e) {
      console.error('Fetch frames error:', e);
    }
  },

  fetchSettings: async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        set({
          photoSessionMinutes: data.photoSessionTimeoutMinutes ?? 5,
        });
      }
    } catch (e) {
      console.error('Fetch settings error:', e);
    }
  },

  /**
   * Muat pilihan kamera & printer mesin kiosk dari localStorage
   * (murni lokal tingkat mesin — tidak ada pengaturan per akun/global).
   */
  loadDeviceSettings: () => {
    const selection = loadDeviceSettingsLocal();
    set({
      cameraDeviceId: selection.camera?.deviceId ?? null,
      printerName: selection.printer?.name ?? null,
    });
  },

  startSessionTimer: () => {
    const minutes = get().photoSessionMinutes ?? 5;
    set({
      sessionDeadline: Date.now() + minutes * 60 * 1000,
      timerExpired: false,
    });
  },

  stopSessionTimer: () => {
    set({ sessionDeadline: null });
  },

  fetchDesignsForFrame: async (frameId: number) => {
    try {
      const res = await api.get(`/designs?frameId=${frameId}`);
      if (res.data.success) {
        set({ designs: res.data.data });
      }
    } catch (e) {
      console.error('Fetch designs error:', e);
    }
  },

  selectFrame: (frame) => {
    set({ selectedFrame: frame, selectedDesign: null, currentTransaction: null });
    get().fetchDesignsForFrame(frame.id);
    set({ currentStep: 'PAYMENT' });
  },

  selectDesign: async (design) => {
    set({ selectedDesign: design });
    const { currentTransaction } = get();
    if (currentTransaction) {
      try {
        await api.patch(`/transactions/${currentTransaction.id}/design`, {
          designId: design.id,
        });
      } catch (e) {
        console.error('Update transaction design error:', e);
      }
    }
    set({ currentStep: 'CAPTURE', capturedPhotos: [] });
  },

  createTransaction: async () => {
    const { device, selectedFrame, printCopies } = get();
    if (!device || !selectedFrame) return false;

    try {
      const res = await api.post('/transactions', {
        frameId: selectedFrame.id,
        copies: printCopies,
      });

      if (res.data.success) {
        const { transaction, qrisPayload } = res.data.data;
        set({
          currentTransaction: {
            ...transaction,
            qrisPayload,
          },
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Create transaction error:', e);
      return false;
    }
  },

  confirmPayment: async () => {
    const { currentTransaction } = get();
    if (!currentTransaction) return false;

    try {
      const res = await api.post(`/transactions/${currentTransaction.id}/pay`);
      if (res.data.success) {
        set({
          currentTransaction: {
            ...currentTransaction,
            paymentStatus: 'paid',
            status: 'paid',
          },
          currentStep: 'SELECT_DESIGN',
        });
        get().startSessionTimer();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Confirm payment error:', e);
      return false;
    }
  },

  addCapturedPhoto: (photoDataUrl) => {
    set((state) => ({
      capturedPhotos: [...state.capturedPhotos, photoDataUrl],
    }));
  },

  replaceCapturedPhoto: (index: number, photoDataUrl: string) => {
    set((state) => {
      const updated = [...state.capturedPhotos];
      updated[index] = photoDataUrl;
      return {
        capturedPhotos: updated,
        retakeIndex: null,
      };
    });
  },

  retakeSpecificPhoto: (index: number) => {
    set({
      retakeIndex: index,
      currentStep: 'CAPTURE',
    });
  },

  retakeAllPhotos: () => {
    set({
      capturedPhotos: [],
      retakeIndex: null,
      currentStep: 'CAPTURE',
    });
  },

  cancelRetake: () => {
    set({
      retakeIndex: null,
      currentStep: 'RESULT',
    });
  },

  completeTransaction: async (compositeDataUrl: string, photos: string[] = []) => {
    const { currentTransaction } = get();
    if (!currentTransaction) return;

    try {
      const res = await api.post(`/transactions/${currentTransaction.id}/complete`, {
        compositeDataUrl,
        photos,
      });

      if (res.data.success) {
        set({
          finalCompositeUrl: compositeDataUrl,
          downloadUrl: res.data.data.downloadUrl,
          currentStep: 'RESULT',
        });
      }
    } catch (e) {
      console.error('Complete transaction error:', e);
      set({
        finalCompositeUrl: compositeDataUrl,
        downloadUrl: `http://localhost:4000/api/kiosk/photos/${currentTransaction.id}/download`,
        currentStep: 'RESULT',
      });
    }
  },

  /**
   * Menyelesaikan sesi tanpa layar cetak: komposisi foto otomatis,
   * simpan ke backend, lalu langsung ke halaman hasil (QR). Cetak fisik
   * dikirim ke printer secara otomatis (non-blocking, best-effort).
   * Bisa dipanggil dengan 0 foto (mis. karena waktu sesi habis) —
   * komposisi tetap dibuat dari background + overlay desain saja.
   */
  finalizeSession: async () => {
    const { selectedFrame, selectedDesign, capturedPhotos, printCopies, printerName } = get();
    if (!selectedFrame || !selectedDesign) return;

    const composed = await composePhoto(selectedFrame, selectedDesign, capturedPhotos);
    if (!composed) return;

    // Simpan ke backend & arahkan ke halaman hasil / QR
    await get().completeTransaction(composed.dataUrl, capturedPhotos);

    // Cetak otomatis ke printer fisik (tidak memblokir alur pengguna)
    if (isDesktop()) {
      try {
        await window.photoboxDesktop!.printPhoto({
          dataUrl: composed.dataUrl,
          width: composed.width,
          height: composed.height,
          copies: printCopies,
          printer: printerName || undefined,
        });
      } catch (e) {
        console.error('Auto print error:', e);
      }
    }
  },

  resetCustomerSession: () => {
    set({
      currentStep: 'STANDBY',
      selectedFrame: null,
      selectedDesign: null,
      currentTransaction: null,
      capturedPhotos: [],
      printCopies: 1,
      finalCompositeUrl: null,
      downloadUrl: null,
      sessionDeadline: null,
      timerExpired: false,
    });
  },
  };
});
