import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Web fallback для AsyncStorage
const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    return AsyncStorage.removeItem(key);
  },
};
import { apiFetch } from '../constants/api';
import { registerPushToken, unregisterPushToken } from '../utils/pushNotifications';
interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  bonus_points: number;
  bonus_balance?: number;
  visits: number;
  loyalty_status: string;
  orders_count?: number;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithPhone: (token: string, user: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    storage.getItem('token').then(async (t) => {
      if (t) {
        setToken(t);
        try {
          const data = await apiFetch('/user/me', {}, t);
          setUser(data);
          // Регистрируем push токен при каждом запуске
          registerPushToken(t).catch(() => {});
        } catch {
          await storage.removeItem('token');
        }
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await storage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await storage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    if (token) unregisterPushToken(token).catch(() => {});
    await storage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const loginWithPhone = async (t: string, u: User) => {
    await storage.setItem('token', t);
    setToken(t);
    setUser(u);
    registerPushToken(t).catch(() => {});
  };

  const refreshUser = async () => {
    if (!token) return;
    const data = await apiFetch('/user/me', {}, token);
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, loginWithPhone, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
