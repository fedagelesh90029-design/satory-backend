// export const API_BASE = 'http://192.168.31.63:3000/api'; // Local Dev IP
export const API_BASE = 'http://localhost:3000/api'; // Local Dev
// export const API_BASE = 'http://72.56.245.188/api'; // Timeweb VPS
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
