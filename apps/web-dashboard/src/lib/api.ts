import axios from 'axios';

export const API_BASE_URL = 'http://localhost:4001/api';

/**
 * Klien API web-dashboard.
 * Autentikasi memakai cookie httpOnly (`photobox_session`) yang di-set server
 * saat login — token TIDAK disimpan di localStorage sehingga aman dari XSS.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tandai sesi kedaluwarsa (401) lalu arahkan ke halaman login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
