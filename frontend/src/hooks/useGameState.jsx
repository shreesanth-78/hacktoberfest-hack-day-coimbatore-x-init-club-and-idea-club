// Global progress state. In production this would be hydrated from the backend
// (GET /api/sessions/{id}); for the prototype it persists to localStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KINGDOMS, GAME_CONFIG } from '../data/kingdoms.js';

const KEY = 'prompt-heist-progress-v1';
const fresh = () => ({ progress: Object.fromEntries(KINGDOMS.map((k) => [k.id, { completed: 0, sealed: false }])), seenIntro: false });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw?.progress) return { ...fresh(), ...raw };
  } catch { /* storage unavailable */ }
  return fresh();
}

const Ctx = createContext(null);

export function GameProvider({ children }) {
  const [state, setState] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

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
    isKingdomUnlocked,
    levelStatus,
    checkpointReached: (id) => state.progress[id].completed >= GAME_CONFIG.checkpointLevel,
    kingdomsCompleted: KINGDOMS.filter((k) => state.progress[k.id].completed >= GAME_CONFIG.levelsPerKingdom).length,
    completeLevel: (id, n) => setState((s) => {
      const p = s.progress[id];
      const completed = Math.max(p.completed, n);
      return { ...s, progress: { ...s.progress, [id]: { completed, sealed: completed >= GAME_CONFIG.levelsPerKingdom } } };
    }),
    // On defeat the player returns to the checkpoint (or the start if none was reached).
    resetToCheckpoint: (id) => setState((s) => {
      const p = s.progress[id];
      const completed = p.completed >= GAME_CONFIG.checkpointLevel ? Math.min(p.completed, GAME_CONFIG.checkpointLevel) : 0;
      return { ...s, progress: { ...s.progress, [id]: { ...p, completed } } };
    }),
    unlockAll: () => setState((s) => ({ ...s, progress: Object.fromEntries(KINGDOMS.map((k) => [k.id, { completed: 5, sealed: false }])) })),
    resetAll: () => setState(fresh()),
  }), [state, isKingdomUnlocked, levelStatus]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGame = () => useContext(Ctx);
