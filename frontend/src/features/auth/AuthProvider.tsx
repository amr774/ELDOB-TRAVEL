import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, restoreSession, setAccessToken } from '../../services/api';
import type { User } from '../../types';
const Auth = createContext<{
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}>({
  user: null,
  ready: false,
  login: async () => {
    throw new Error('Authentication provider unavailable');
  },
  logout: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const cache = useQueryClient();
  useEffect(() => {
    let active = true;
    void restoreSession().then((user) => {
      if (active) {
        setUser(user);
        setReady(true);
      }
    });
    const expired = () => {
      setUser(null);
      cache.clear();
    };
    window.addEventListener('session-expired', expired);
    return () => {
      active = false;
      window.removeEventListener('session-expired', expired);
    };
  }, [cache]);
  async function login(email: string, password: string) {
    const { data } = await api.post<{ accessToken: string; user: User }>(
      '/auth/browser/login',
      { email, password },
    );
    cache.clear();
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }
  async function logout() {
    await api.post('/auth/browser/logout');
    setAccessToken(null);
    setUser(null);
    cache.clear();
  }
  return (
    <Auth.Provider value={{ user, ready, login, logout }}>
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => useContext(Auth);
