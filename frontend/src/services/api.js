// API layer used by the hooks. Two modes, chosen when the app starts:
//
//   REAL BACKEND  VITE_API_URL=http://localhost:8000   (direct, needs the backend's CORS to allow this origin)
//             or  VITE_USE_BACKEND=true                (same origin; the Vite dev server proxies /api to :8000)
//             -> the FastAPI backend, which calls Gemma through Ollama.
//
//   MOCK          neither set  -> the in-browser mock (services/mockServer.js), for UI work with no backend.
//
// See frontend/README.md.
import { mockServer } from './mockServer.js';
import { ApiError, createBackendClient } from './backend.js';

export { ApiError };

const env = import.meta.env || {};
const BASE = env.VITE_API_URL || '';
export const USE_MOCK = !(BASE || env.VITE_USE_BACKEND === 'true');

async function wrapMock(fn) {
  try { return await fn(); } catch (e) { throw new ApiError(e.message); }
}

const backend = USE_MOCK
  ? null
  : createBackendClient({ baseUrl: BASE, storage: typeof window !== 'undefined' ? window.localStorage : undefined });

export const api = USE_MOCK
  ? {
      createSession: (kingdomId, level) => wrapMock(() => mockServer.createSession({ kingdom_id: kingdomId, level })),
      sendMessage: (sessionId, message) => wrapMock(() => mockServer.sendMessage(sessionId, { message })),
      getSession: (sessionId) => wrapMock(() => mockServer.getSession(sessionId)),
    }
  : {
      getProgress: backend.getProgress,
      resetProgress: backend.resetProgress,
      createSession: backend.createSession,
      sendMessage: backend.sendMessage,
    };
