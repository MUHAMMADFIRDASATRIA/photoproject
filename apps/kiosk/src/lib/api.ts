import axios from 'axios';

export const API_BASE_URL = 'http://localhost:4000/api/kiosk';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sisipkan token device otomatis jika ada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kiosk_device_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
