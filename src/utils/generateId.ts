export function generateId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for HTTP testing environments (like testing on mobile over LAN)
  return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}
