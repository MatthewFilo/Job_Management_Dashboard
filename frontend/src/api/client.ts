import axios from 'axios';

export const API_URL: string = (typeof window !== 'undefined' && (window as any).__API_URL__) || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    let message: string | undefined = data?.detail || data?.message;

    if (!message && data && typeof data === 'object') {
      for (const key of Object.keys(data)) {
        const val = (data as any)[key];
        if (Array.isArray(val) && val.length) { message = `${key}: ${val[0]}`; break; }
        if (typeof val === 'string') { message = `${key}: ${val}`; break; }
      }
    }

    if (!message && typeof data === 'string') {
      message = data;
    }

    if (!message) {
      message = error?.message || 'Request failed';
    }

    return Promise.reject(new Error(message));
  }
);

export default client;
