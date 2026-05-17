export const API_BASE = 'http://72.56.245.188/api';
// export const API_BASE = 'http://localhost:3000/api';

export const MEDIA_BASE = 'http://72.56.245.188';

/**
 * Универсальный fetch для API
 */
export async function apiFetch(path: string, options: any = {}, token?: string | null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Ошибка сети' }));
    throw new Error(err.error || 'Ошибка');
  }
  return res.json();
}
