import { Capacitor } from '@capacitor/core';

// The ONE place that decides which backend URL to use.
export function resolveApiBaseUrl() {
  const env = import.meta.env;

  // Production builds (web and mobile) always use the HTTPS URL, never localhost.
  if (env.MODE === 'production') {
    const url = env.VITE_API_URL_PROD;
    if (!url || !url.startsWith('https://')) {
      throw new Error('VITE_API_URL_PROD must be an https:// URL for production builds');
    }
    return url;
  }

  switch (Capacitor.getPlatform()) { // 'web' | 'android' | 'ios'
    case 'android': return env.VITE_API_URL_ANDROID || 'http://10.0.2.2:5000/api';
    case 'ios': return env.VITE_API_URL_IOS || 'http://localhost:5000/api';
    default: return env.VITE_API_URL_WEB || 'http://localhost:5000/api';
  }
}
