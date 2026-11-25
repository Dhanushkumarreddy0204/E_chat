export const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').trim().replace(/\/+$/, '');

function apiOrigin() {
  return new URL(API_BASE, window.location.origin).origin;
}

export function websocketUrl() {
  const override = import.meta.env.VITE_WS_URL?.trim();
  const url = new URL(override || '/ws', apiOrigin());
  if (!override || url.pathname === '/') url.pathname = '/ws';
  if (url.protocol === 'https:') url.protocol = 'wss:';
  if (url.protocol === 'http:') url.protocol = 'ws:';
  return url.toString();
}

export function mediaUrl(value) {
  if (!value) return value;
  if (value.startsWith('/uploads/')) return new URL(value, apiOrigin()).href;

  // Earlier uploads were sometimes persisted with the backend's localhost default.
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/uploads\//i.test(value)) {
    const { pathname, search, hash } = new URL(value);
    return new URL(pathname + search + hash, apiOrigin()).href;
  }
  return value;
}
