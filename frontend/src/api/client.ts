import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { API_URL } from './config';

// Sent with every request so the back-end can log platform, device and app version.
const clientHeaders: Record<string, string> = {
  'X-Platform': Platform.OS,
  'X-Device': Device.modelName ?? 'unknown',
  'X-App-Version': Constants.expoConfig?.version ?? 'unknown',
};

let currentAccessToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setApiAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function setOnUnauthorized(callback: (() => void) | null) {
  onUnauthorizedCallback = callback;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...clientHeaders,
    ...(init.headers as Record<string, string> | undefined),
  };

  if (currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }

    let errorMessage = `API ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.detail === 'string') {
        errorMessage = errorJson.detail;
      } else if (errorJson && typeof errorJson.message === 'string') {
        errorMessage = errorJson.message;
      }
    } catch {
      const text = await response.text().catch(() => '');
      if (text) {
        errorMessage = `${errorMessage}: ${text}`;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
