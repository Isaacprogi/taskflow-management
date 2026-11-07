import { Preferences } from '@capacitor/preferences';

// Native: SharedPreferences / UserDefaults. Web: falls back to localStorage.
// Not encrypted. For a hardened production app, use a Keychain/Keystore-backed plugin.
const KEY = 'taskflow_token';
export const getToken = async () => (await Preferences.get({ key: KEY })).value;
export const setToken = (value) => Preferences.set({ key: KEY, value });
export const clearToken = () => Preferences.remove({ key: KEY });
