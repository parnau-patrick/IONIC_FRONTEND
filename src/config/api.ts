import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = 'http://localhost:3000';

let currentConnectionId: string | null = null;

export const setConnectionId = (id: string | null) => {
  currentConnectionId = id;
  console.log('API connectionId updated:', id);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (currentConnectionId && config.headers) {
      config.headers['x-connection-id'] = currentConnectionId;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token invalid sau expirat - logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };