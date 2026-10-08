// Client for the REAL backend (backend/app/main.py -> ai/guard.py -> Gemma via Ollama).
//
// The UI was built against a mock with its own response shapes. This module talks to the real
// API (docs: README "API Documentation") and returns those same shapes, so the pages and hooks do
// not change. Everything that decides the game (wins, lives, checkpoints, respawn, scores, the
// boss's learning) is decided by the server; this file only translates.
//
// It has no browser-only imports, so `npm test` exercises it with Node's built-in test runner.
import { KINGDOMS } from '../data/kingdoms.js';
import { DEBRIEFS } from '../data/levels.js';

export class ApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const LEVELS_PER_KINGDOM = 6;
const CAMPAIGN_KEY = 'prompt-heist-campaign-v1';
export const MAX_NAME = 30; // same limit as the backend (player_name: 1 to 30 characters)

// Texts from the game design for the two AI failure cases. The backend never charges a life for them.
const FRIENDLY = {
  ai_unavailable: '[CONNECTION LOST: NEURAL ENGINE UNRESPONSIVE. ATTEMPT PRESERVED]',
  ai_timeout: '[SIGNAL TIMEOUT: GATEKEEPER PROCESSING DELAYED. ATTEMPT PRESERVED. TRY AGAIN]',
};

/** The backend's level id for a kingdom id ('civic'...) and a level number 1..6. */
export function backendLevelId(kingdomId, n) {
  const i = KINGDOMS.findIndex((k) => k.id === kingdomId);
  if (i < 0 || !Number.isInteger(n) || n < 1 || n > LEVELS_PER_KINGDOM) throw new ApiError('That gate does not exist.');
  return i * LEVELS_PER_KINGDOM + n;
}

/** Progress per kingdom, derived from the campaign's current level (the server is the source of truth). */
export function progressFromCampaign(state) {
  return Object.fromEntries(
    KINGDOMS.map((k, i) => {
      const completed = state.status === 'completed'
        ? LEVELS_PER_KINGDOM
        : Math.max(0, Math.min(LEVELS_PER_KINGDOM, state.current_level_id - 1 - i * LEVELS_PER_KINGDOM));
      return [k.id, { completed, sealed: completed >= LEVELS_PER_KINGDOM }];
    }),
  );
}

/** Backend debrief -> the four fields the scroll component shows. */
export function mapDebrief(d, n) {
  return {
    strategy: d.technique,
    why: DEBRIEFS[n]?.why || d.title,
    vulnerability: d.vulnerability,
    lesson: d.defence,
  };
}

function adaptationFor(mode) {
  if (mode === 'campaign') {
    return {
      status: 'adapted',
      resistance: null, // the server does not measure this, so none is shown
      summary: 'The sovereign has studied the tactics you used at this kingdom\'s earlier gates and refuses them. Find a technique it was never shown.',
      learned: [1, 2, 3, 4, 5].map((n) => ({ level: n, strategy: DEBRIEFS[n].strategy, blocked: true })),
    };
  }
  return {
    status: 'dormant',
    resistance: null,
    summary: 'This is a replay outside your campaign, so the sovereign has not studied you.',
    learned: [],
  };
}

export function createBackendClient({ baseUrl = '', fetchImpl, storage } = {}) {
  const doFetch = fetchImpl || ((...args) => fetch(...args));
  const store = {
    get() { try { return storage?.getItem(CAMPAIGN_KEY) || null; } catch { return null; } },
    set(v) { try { storage?.setItem(CAMPAIGN_KEY, v); } catch { /* storage unavailable */ } },
    clear() { try { storage?.removeItem(CAMPAIGN_KEY); } catch { /* storage unavailable */ } },
  };
  const sessions = new Map(); // session_id -> what we need to translate its responses
  let levelsPromise = null;
  let campaignInflight = null;

  async function request(path, options = {}) {
    let res;
    try {
      res = await doFetch(`${baseUrl}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
    } catch {
      throw new ApiError('The royal messenger could not reach the kingdom (network error). Check that the backend is running and try again.');
    }
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) {
      const e = body && body.error;
      const code = e && e.code;
      throw new ApiError(FRIENDLY[code] || (e && e.message) || `The kingdom answered with an error (${res.status}).`, { code, status: res.status });
    }
    return body;
  }

  const getLevels = () => (levelsPromise ||= request('/api/levels').then((b) => b.levels).catch((e) => { levelsPromise = null; throw e; }));

  // The saved campaign, or null when there is none (first visit, or the server no longer knows it).
  // A campaign is only ever CREATED by startCampaign(name), after the player has chosen a name.
  async function loadCampaign() {
    const id = store.get();
    if (!id) return null;
    try { return await request(`/api/campaigns/${encodeURIComponent(id)}`); } catch (e) {
      if (e.status === 404) { store.clear(); return null; }
      throw e;
    }
  }
  // Calls that overlap (React StrictMode runs effects twice) share one request.
  const campaign = () => (campaignInflight ||= loadCampaign().finally(() => { campaignInflight = null; }));
  const needCampaign = async () => {
    const c = await campaign();
    if (!c) throw new ApiError('Begin a new game first: choose your name on the title screen.', { code: 'no_campaign' });
    return c;
  };

  function view(meta, remaining, extra = {}) {
    const used = meta.max - remaining;
    return {
      session_id: meta.id, kingdom_id: meta.kingdomId, level: meta.n,
      strikes: extra.strikes ?? used, max_strikes: meta.max, attempts: used,
      status: extra.status || 'active', checkpoint_level: 0, character: meta.level.character, mode: meta.mode,
    };
  }

  return {
    /** The saved campaign and the progress derived from it; state is null before a game has been started. */
    getProgress: async () => {
      const state = await campaign();
      return { state, progress: progressFromCampaign(state || { status: 'in_progress', current_level_id: 1 }) };
    },

    /** Begin a new campaign for this player. The name must be 1 to 30 characters (the backend checks it too). */
    startCampaign: async (name) => {
      const clean = String(name || '').trim();
      if (clean.length < 1 || clean.length > MAX_NAME) throw new ApiError(`Choose a name of 1 to ${MAX_NAME} characters.`, { code: 'invalid_request', status: 400 });
      const created = await request('/api/campaigns', { method: 'POST', body: JSON.stringify({ player_name: clean }) });
      store.set(created.campaign_id);
      return created;
    },

    /** Forget the saved campaign (it stays on the server and on the leaderboard). The next game needs a new name. */
    resetProgress: async () => { store.clear(); },

    /** Top campaigns by total score. */
    getLeaderboard: async () => (await request('/api/campaigns/leaderboard')).entries,

    createSession: async (kingdomId, n) => {
      const lid = backendLevelId(kingdomId, n);
      const [state, levels] = await Promise.all([needCampaign(), getLevels()]);
      const playerName = state.player_name;
      const level = levels.find((l) => l.id === lid);
      if (!level) throw new ApiError('That gate is missing from the kingdom.');
      let created;
      let mode;
      if (state.status === 'in_progress' && lid === state.current_level_id) {
        created = await request(`/api/campaigns/${encodeURIComponent(state.campaign_id)}/sessions`, { method: 'POST' });
        mode = 'campaign';
      } else if (state.status === 'completed' || lid < state.current_level_id) {
        // A gate the player already cleared: replay it in free play, which never touches the campaign.
        created = await request('/api/sessions', { method: 'POST', body: JSON.stringify({ level_id: lid, player_name: playerName }) });
        mode = 'replay';
      } else {
        throw new ApiError('That gate is still sealed. Clear the earlier gates first.', { code: 'level_locked', status: 409 });
      }
      const meta = { id: created.session_id, kingdomId, n, level, mode, max: level.max_attempts };
      sessions.set(meta.id, meta);
      const out = { ...view(meta, created.attempts_remaining), greeting: level.opening };
      if (level.boss) out.adaptation = adaptationFor(mode);
      return out;
    },

    sendMessage: async (sessionId, message) => {
      const meta = sessions.get(sessionId);
      if (!meta) throw new ApiError('This encounter is no longer active. Return to the map and enter the gate again.');
      const r = await request(`/api/sessions/${encodeURIComponent(sessionId)}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
      const status = r.status === 'in_progress' ? 'active' : r.status;
      const used = meta.max - r.attempts_remaining;
      // The winning message is not a strike.
      const strikes = r.status === 'won' ? used - 1 : used;
      const reply = r.hint ? `${r.reply}  (Whisper of the wind: ${r.hint})` : r.reply;
      return {
        reply,
        state: view(meta, r.attempts_remaining, { status, strikes }),
        won: r.status === 'won',
        debrief: r.debrief ? mapDebrief(r.debrief, meta.n) : undefined,
        score: r.score ?? null,
        campaign: r.campaign || null,
      };
    },
  };
}
