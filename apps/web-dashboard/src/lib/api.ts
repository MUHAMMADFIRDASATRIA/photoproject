import axios from 'axios';

export const API_BASE_URL = 'http://localhost:4001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Otomatis pasang JWT token ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('photobox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor untuk menangani token expired (401/403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('photobox_token');
      localStorage.removeItem('photobox_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
