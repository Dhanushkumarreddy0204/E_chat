import axios from 'axios';
import { API_BASE } from './urls';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach Bearer JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('echat_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses to handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const sentToken = error.config?.headers?.get('Authorization');
    if (error.response?.status === 401 && sentToken === `Bearer ${localStorage.getItem('echat_token')}`) {
      // Don't auto-redirect if checking auth or on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('echat_token');
        localStorage.removeItem('echat_user');
        window.location.href = '/login';
      }
    }
    if (error.config) {
      delete error.config.data;
      error.config.headers?.delete('Authorization');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
