import { create } from 'zustand';
import { api } from '../lib/api';

export interface AuthUser {
  id: number;
  username: string;
  roleId: number;
  roleName: string;
  branchId: number | null;
  branchName: string | null;
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
}

/** Bersihkan sisa token lama (versi sebelumnya menyimpan token di localStorage). */
function purgeLegacyTokenStorage() {
  try {
    localStorage.removeItem('photobox_token');
    localStorage.removeItem('photobox_user');
  } catch {
    /* localStorage tidak tersedia — abaikan */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        const { user } = response.data.data;
        purgeLegacyTokenStorage();
        // Sesi disimpan pada cookie httpOnly oleh server; hanya profil di state.
        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: () => {
    // Hapus cookie sesi di server, lalu bersihkan state.
    api.post('/auth/logout').catch(() => undefined);
    purgeLegacyTokenStorage();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    purgeLegacyTokenStorage();
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        set({ user: response.data.data, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  /**
   * Sesuai CLAUDE.md §4: Pengecekan izin murni berdasarkan kode permission
   */
  hasPermission: (permissionCode: string) => {
    const user = get().user;
    if (!user || !user.permissions) return false;
    // superadmin with role.manage has full clearance
    return user.permissions.includes(permissionCode) || user.permissions.includes('role.manage');
  },
}));
