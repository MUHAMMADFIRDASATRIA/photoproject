import { create } from 'zustand';
import { api } from '../lib/api';

export type KioskStep =
  | 'DEVICE_LOGIN'
  | 'STANDBY'
  | 'SELECT_FRAME'
  | 'SELECT_DESIGN'
  | 'PAYMENT'
  | 'CAPTURE'
  | 'PRINTING'
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

  // Actions
  setStep: (step: KioskStep) => void;
  setPrintCopies: (copies: number) => void;
  loginDevice: (username: string, password: string) => Promise<boolean>;
  logoutDevice: () => void;
  initDevice: () => void;
  fetchFrames: () => Promise<void>;
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
}

export const useKioskStore = create<KioskState>((set, get) => ({
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

  setStep: (step) => set({ currentStep: step }),
  setPrintCopies: (copies) => set({ printCopies: Math.max(1, copies) }),

  initDevice: () => {
    const cachedDevice = localStorage.getItem('kiosk_device_info');
    const token = localStorage.getItem('kiosk_device_token');
    if (cachedDevice && token) {
      set({
        device: JSON.parse(cachedDevice),
        currentStep: 'STANDBY',
      });
      get().fetchFrames();
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
        get().fetchFrames();
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
    });
  },
}));
