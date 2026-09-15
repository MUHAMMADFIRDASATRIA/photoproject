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
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('photobox_token'),
  isAuthenticated: !!localStorage.getItem('photobox_token'),
  isLoading: true,

  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        const { token, user } = response.data.data;
        localStorage.setItem('photobox_token', token);
        localStorage.setItem('photobox_user', JSON.stringify(user));
        set({ token, user, isAuthenticated: true, isLoading: false });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('photobox_token');
    localStorage.removeItem('photobox_user');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('photobox_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        set({ user: response.data.data, isAuthenticated: true, isLoading: false });
      } else {
        get().logout();
      }
    } catch {
      get().logout();
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
