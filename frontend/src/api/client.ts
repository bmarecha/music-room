import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { API_URL } from './config';

// Sent with every request so the back-end can log platform, device and app version.
const clientHeaders = {
  'X-Platform': Platform.OS,
  'X-Device': Device.modelName ?? 'unknown',
  'X-App-Version': Constants.expoConfig?.version ?? 'unknown',
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...clientHeaders,
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}
