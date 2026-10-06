const API_BASE_STORAGE_KEY = 'davis-ai-api-base';

export function getApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (configured) return configured.replace(/\\/$/, '');

  try {
    const saved = localStorage.getItem(API_BASE_STORAGE_KEY)?.trim();
    if (saved) return saved.replace(/\\/$/, '');
  } catch {}

  return '';
}

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBase()}${cleanPath}`;
}

export function isGitHubPagesHost(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io');
}

export function saveApiBase(value: string): void {
  try {
    const cleaned = value.trim().replace(/\\/$/, '');
    if (cleaned) localStorage.setItem(API_BASE_STORAGE_KEY, cleaned);
    else localStorage.removeItem(API_BASE_STORAGE_KEY);
  } catch {}
}

export function clearApiBase(): void {
  try { localStorage.removeItem(API_BASE_STORAGE_KEY); } catch {}
}
