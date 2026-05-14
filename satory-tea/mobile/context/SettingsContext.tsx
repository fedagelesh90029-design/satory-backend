/**
 * SettingsContext — глобальные настройки приложения.
 * Хранятся в AsyncStorage, доступны везде через useSettings().
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'app_settings_v1';

export interface AppSettings {
  // Уведомления
  push_events:  boolean;
  push_bonuses: boolean;
  push_orders:  boolean;
  push_promos:  boolean;
  push_news:    boolean;
  // Внешний вид
  dark_mode: boolean;
}

const DEFAULTS: AppSettings = {
  push_events:  true,
  push_bonuses: true,
  push_orders:  true,
  push_promos:  false,
  push_news:    true,
  dark_mode:    true,
};

interface SettingsCtx {
  settings: AppSettings;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  toggleSetting: (key: keyof AppSettings) => void;
}

const SettingsContext = createContext<SettingsCtx>({
  settings: DEFAULTS,
  setSetting: () => {},
  toggleSetting: () => {},
});

async function load(): Promise<AppSettings> {
  try {
    const raw = Platform.OS === 'web'
      ? localStorage.getItem(STORAGE_KEY)
      : await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

async function save(s: AppSettings) {
  try {
    const raw = JSON.stringify(s);
    if (Platform.OS === 'web') localStorage.setItem(STORAGE_KEY, raw);
    else await AsyncStorage.setItem(STORAGE_KEY, raw);
  } catch {}
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  useEffect(() => { load().then(setSettings); }, []);

  const setSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  };

  const toggleSetting = (key: keyof AppSettings) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      save(next);
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, setSetting, toggleSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
