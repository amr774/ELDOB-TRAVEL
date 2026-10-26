import axios from 'axios';
import type { User } from '../types';
import { normalizeImageLink } from '../utils/image-links';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 20000,
});
let accessToken: string | null = null;
let refreshPromise: Promise<User | null> | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export async function restoreSession(): Promise<User | null> {
  if (!refreshPromise)
    refreshPromise = api
      .post<{ accessToken: string; user: User }>(
        '/auth/browser/refresh',
        {},
        { headers: { 'X-ELDOB-Client': 'web' } },
      )
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.user;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  return refreshPromise;
}
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  config.headers['X-ELDOB-Client'] = 'web';
  return config;
});
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      !error.config.url?.startsWith('/auth/') &&
      !error.config.headers['X-Retried']
    ) {
      error.config.headers['X-Retried'] = '1';
      if (await restoreSession()) return api.request(error.config);
      window.dispatchEvent(new Event('session-expired'));
    }
    return Promise.reject(error);
  },
);
export function errorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (message) return Array.isArray(message) ? message.join('. ') : message;
  }
  return 'The request could not be completed. Please try again. / تعذر إتمام الطلب، حاول مرة أخرى.';
}
export function imageUrl(value?: string) {
  if (!value) return undefined;
  if (value.startsWith('/uploads/')) {
    const base = import.meta.env.VITE_API_URL || '/api';
    return base.startsWith('http') ? new URL(value, base).href : value;
  }
  return normalizeImageLink(value);
}
