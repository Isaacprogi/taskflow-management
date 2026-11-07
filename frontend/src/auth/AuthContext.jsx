import { createContext, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from '../api/client.js';
import { getToken, setToken, clearToken } from './tokenStore.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => { await clearToken(); setUser(null); };

  useEffect(() => {
    setUnauthorizedHandler(logout);
    (async () => {
      try {
        if (await getToken()) setUser((await api.get('/auth/me')).data.user);
      } catch (e) {
        if (e.response?.status === 401) await clearToken(); // keep token if merely offline
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const authenticate = async (path, body) => {
    const { data } = await api.post(path, body);
    await setToken(data.token);
    setUser(data.user);
  };

  return (
    <Ctx.Provider value={{
      user, loading, logout,
      signup: (b) => authenticate('/auth/signup', b),
      login: (b) => authenticate('/auth/login', b),
    }}>
      {children}
    </Ctx.Provider>
  );
}
