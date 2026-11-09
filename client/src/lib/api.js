import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standard response envelope error handling
    const errorPayload = error.response?.data?.error || {
      message: error.message || 'An unexpected error occurred',
      code: 'NETWORK_ERROR',
    };
    return Promise.reject(errorPayload);
  }
);

export default api;
