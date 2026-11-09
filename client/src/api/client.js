import axios from 'axios';
import { useAuthStore } from '../stores/authStore.js';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => {
    // Unpack data if response conforms to the standard { success, data, error, meta } envelope
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return response;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data?.error;

    // Normalize error payload from { success, data, error: { message, code, details } }
    const normalizedError = {
      status,
      message:
        errorData?.message ||
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred',
      code: errorData?.code || 'UNKNOWN_ERROR',
      details: errorData?.details || null,
    };

    // On 401 Unauthorized: clear auth state & redirect to /login
    if (status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isPublicAuthRoute =
          path.startsWith('/login') ||
          path.startsWith('/setup') ||
          path.startsWith('/accept-invite') ||
          path.startsWith('/capture') ||
          path.startsWith('/design');

        if (!isPublicAuthRoute) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(normalizedError);
  }
);

export default apiClient;
