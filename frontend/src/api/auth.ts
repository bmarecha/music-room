import { apiFetch } from './client';

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
