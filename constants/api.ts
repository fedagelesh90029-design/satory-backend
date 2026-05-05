export const API_BASE = 'https://satory-backend.onrender.com/api'; // Render
// export const API_BASE = 'http://localhost:3000/api'; // локальный
export const MEDIA_BASE = API_BASE.replace('/api', '');

export async function apiFetch(path: string, options?: RequestInit, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Ошибка сети' }));
    throw new Error(err.error || 'Ошибка');
  }
  return res.json();
}
