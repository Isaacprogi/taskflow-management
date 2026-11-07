import axios from 'axios';
import { resolveApiBaseUrl } from '../config/api.js';
import { getToken } from '../auth/tokenStore.js';

export const api = axios.create({ baseURL: resolveApiBaseUrl(), timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401) onUnauthorized();
  return Promise.reject(err);
});

export function errorMessage(err) {
  const data = err.response?.data;
  if (data) return [data.error, ...(data.details || [])].join(' - ');
  if (err.request) return 'Cannot reach the server. Check your connection.';
  return err.message;
}
