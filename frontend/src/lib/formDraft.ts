export interface StoredFormDraft<T> {
  data: T;
  savedAt: number;
}

export function saveFormDraft<T>(key: string, data: T): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const savedAt = Date.now();
    const payload: StoredFormDraft<T> = { data, savedAt };
    localStorage.setItem(key, JSON.stringify(payload));
    return savedAt;
  } catch {
    return null;
  }
}

export function loadFormDraft<T>(key: string): StoredFormDraft<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFormDraft<T>;
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFormDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}
