export function readLocal(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
export function writeLocal(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Private modes still work. */ }
}
export function readSession(key: string): unknown {
  try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return null; }
}
export function writeSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Best effort. */ }
}
