import axios from 'axios';
import { loadDeviceToken } from './secureToken';

export const API_BASE_URL = 'http://localhost:4000/api/kiosk';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // kirim/terima cookie sesi httpOnly (browser)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sisipkan token device otomatis. Di browser token tidak ada (memakai cookie
// httpOnly); di Electron token diambil dari safeStorage.
api.interceptors.request.use(async (config) => {
  const token = await loadDeviceToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
