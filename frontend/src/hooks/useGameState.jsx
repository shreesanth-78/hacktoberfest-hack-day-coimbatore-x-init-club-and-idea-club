// Global progress state.
//   Mock mode:   persisted to localStorage (prototype behaviour, unchanged).
//   Real mode:   the SERVER is the source of truth. Progress comes from the campaign on the backend
//                (GET /api/campaigns/{id}); after a win or a loss the app asks the server again, so
//                checkpoints and respawns follow the backend's rules and nothing is decided here.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KINGDOMS, GAME_CONFIG } from '../data/kingdoms.js';
import { api, USE_MOCK } from '../services/api.js';

const KEY = 'prompt-heist-progress-v1';
const fresh = () => ({ progress: Object.fromEntries(KINGDOMS.map((k) => [k.id, { completed: 0, sealed: false }])), seenIntro: false });

function load() {
  if (!USE_MOCK) return fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw?.progress) return { ...fresh(), ...raw };
  } catch { /* storage unavailable */ }
  return fresh();
}

const Ctx = createContext(null);

export function GameProvider({ children }) {
  const [state, setState] = useState(load);
  const [ready, setReady] = useState(USE_MOCK);
  const [error, setError] = useState('');
  const [campaign, setCampaign] = useState(null);

  useEffect(() => { if (USE_MOCK) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } } }, [state]);

  // Real mode: (re)load progress from the backend.
  const refresh = useCallback(async () => {
    if (USE_MOCK) return;
    try {
      const { state: c, progress } = await api.getProgress();
      setCampaign(c);
      setState((s) => ({ ...s, progress }));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const isKingdomUnlocked = useCallback((id) => {
    const i = KINGDOMS.findIndex((k) => k.id === id);
    return i === 0 || state.progress[KINGDOMS[i - 1].id].completed >= GAME_CONFIG.levelsPerKingdom;
  }, [state]);

  const levelStatus = useCallback((id, n) => {
    const c = state.progress[id].completed;
    return n <= c ? 'completed' : n === c + 1 ? 'available' : 'locked';
  }, [state]);

  const value = useMemo(() => ({
    progress: state.progress,
    ready, error, campaign, refresh,
    isKingdomUnlocked,
    levelStatus,
    checkpointReached: (id) => state.progress[id].completed >= GAME_CONFIG.checkpointLevel,
    kingdomsCompleted: KINGDOMS.filter((k) => state.progress[k.id].completed >= GAME_CONFIG.levelsPerKingdom).length,
    // Mock: record locally. Real: the server has already recorded the win, so just ask it.
    completeLevel: (id, n) => {
      if (!USE_MOCK) { refresh(); return; }
      setState((s) => {
        const p = s.progress[id];
        const completed = Math.max(p.completed, n);
        return { ...s, progress: { ...s.progress, [id]: { completed, sealed: completed >= GAME_CONFIG.levelsPerKingdom } } };
      });
    },
    // On defeat the player returns to the checkpoint (or the start if none was reached).
    // Real mode: the backend already applied its respawn rule; just reload.
    resetToCheckpoint: (id) => {
      if (!USE_MOCK) { refresh(); return; }
      setState((s) => {
        const p = s.progress[id];
        const completed = p.completed >= GAME_CONFIG.checkpointLevel ? Math.min(p.completed, GAME_CONFIG.checkpointLevel) : 0;
        return { ...s, progress: { ...s.progress, [id]: { ...p, completed } } };
      });
    },
    unlockAll: () => { if (USE_MOCK) setState((s) => ({ ...s, progress: Object.fromEntries(KINGDOMS.map((k) => [k.id, { completed: 5, sealed: false }])) })); },
    resetAll: async () => {
      if (USE_MOCK) { setState(fresh()); return; }
      try { await api.resetProgress(); } catch (e) { setError(e.message); return; }
      await refresh();
    },
  }), [state, ready, error, campaign, refresh, isKingdomUnlocked, levelStatus]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGame = () => useContext(Ctx);
