import axios from 'axios';

function resolveApiUrl(): string {
  // Prefer an explicit runtime override injected into the page
  if (typeof window !== 'undefined') {
    const maybe = (window as any).__API_URL__ as string | undefined;
    if (maybe) return maybe;

    const host = window.location.hostname;
    // When running inside Docker network (Playwright hitting http://frontend:3000), use backend service
    if (host === 'frontend') return 'http://backend:8000/api';
    // Local development in a host browser
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8000/api';
  }
  // Fallback to CRA build-time value if provided, else localhost
  return (process.env.REACT_APP_API_URL as string) || 'http://localhost:8000/api';
}

export const API_URL: string = resolveApiUrl();

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
