import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@selorg_rider:';

export const storageService = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, value);
    } catch {
      // ignore persistence failures
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  },
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter(k => k.startsWith(PREFIX));
      await Promise.all(ours.map(k => AsyncStorage.removeItem(k)));
    } catch {
      // ignore
    }
  },
};

export const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
  deviceId: 'deviceId',
} as const;
