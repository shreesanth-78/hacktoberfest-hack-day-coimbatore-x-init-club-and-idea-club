// API abstraction. Set VITE_API_URL (e.g. http://localhost:8000) to switch from the mock
// to the proposed FastAPI backend. Proposed endpoints (not yet existing):
//   GET  /api/kingdoms            GET  /api/levels?kingdom_id=...
//   POST /api/sessions            POST /api/sessions/{id}/messages     GET /api/sessions/{id}
import { mockServer } from './mockServer.js';
import { KINGDOMS } from '../data/kingdoms.js';
import { LEVELS } from '../data/levels.js';

const BASE = import.meta.env.VITE_API_URL || '';
export const USE_MOCK = !import.meta.env.VITE_API_URL;

export class ApiError extends Error {}

async function http(path, options) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new ApiError('The royal messenger could not reach the kingdom (network error). Check your connection and try again.');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).detail || ''; } catch { /* ignore */ }
    throw new ApiError(detail || `The kingdom answered with an error (${res.status}).`);
  }
  return res.json();
}

async function wrapMock(fn) {
  try { return await fn(); } catch (e) { throw new ApiError(e.message); }
}

export const api = {
  getKingdoms: () => (USE_MOCK ? Promise.resolve(KINGDOMS) : http('/api/kingdoms')),
  getLevels: (kingdomId) => (USE_MOCK ? Promise.resolve(LEVELS) : http(`/api/levels?kingdom_id=${encodeURIComponent(kingdomId)}`)),
  createSession: (kingdomId, level) =>
    USE_MOCK
      ? wrapMock(() => mockServer.createSession({ kingdom_id: kingdomId, level }))
      : http('/api/sessions', { method: 'POST', body: JSON.stringify({ kingdom_id: kingdomId, level }) }),
  sendMessage: (sessionId, message) =>
    USE_MOCK
      ? wrapMock(() => mockServer.sendMessage(sessionId, { message }))
      : http(`/api/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),
  getSession: (sessionId) => (USE_MOCK ? wrapMock(() => mockServer.getSession(sessionId)) : http(`/api/sessions/${sessionId}`)),
};
