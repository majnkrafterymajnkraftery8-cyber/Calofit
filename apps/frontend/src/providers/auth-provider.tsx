'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { useRouter } from '@/i18n/routing';

interface User {
  id: string;
  email: string;
  hasProfile: boolean;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<{ isEmailVerified: boolean } | void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Boshlang'ich auth holatini tekshirish
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
      setIsLoading(false);
    } else {
      // Check if running inside Telegram WebApp
      if (typeof window !== 'undefined') {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          try {
            tg.ready();
            tg.expand();
          } catch (e) {
            console.warn('Telegram SDK initialization warning:', e);
          }
          
          const initData = tg.initData;
          if (initData) {
            setIsLoading(true);
            api.post('/auth/telegram/login', { initData })
              .then(({ data }) => {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                
                // Redirect depending on onboarding profile
                if (data.user.hasProfile) {
                  router.push('/dashboard');
                } else {
                  router.push('/profile');
                }
              })
              .catch((err) => {
                console.error('Telegram WebApp auto-login failed:', err);
              })
              .finally(() => {
                setIsLoading(false);
              });
            return;
          }
        }
      }
      setIsLoading(false);
    }
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);

      if (data.user.hasProfile) {
        router.push('/dashboard');
      } else {
        router.push('/profile');
      }
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const locale = window.location.pathname.split('/')[1] || 'uz';
      const { data } = await api.post('/auth/register', { email, password, locale });
      
      if (!data.accessToken) {
        return { isEmailVerified: false };
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      router.push('/profile'); // Yangi user → profil onboarding
      return { isEmailVerified: true };
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore — token already expired
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
