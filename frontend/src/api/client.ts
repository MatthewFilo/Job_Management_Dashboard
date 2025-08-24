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

function extractErrorMessage(data: any): string | undefined {
  // Check for standard error fields first
  if (data?.detail || data?.message) {
    return data.detail || data.message;
  }

  // Handle string data directly
  if (typeof data === 'string') {
    return data;
  }

  // Extract first error from validation errors (arrays or strings)
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        return `${key}: ${value[0]}`;
      }
      if (typeof value === 'string') {
        return `${key}: ${value}`;
      }
    }
  }

  return undefined;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    const message = extractErrorMessage(data) || error?.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default client;
