// Conversation + encounter state, deliberately separate from the visual components.
// All results come from the API layer; victory/defeat are decided by the backend state, never by the guard's text.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';

export function useEncounter(kingdomId, level) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState(null); // null | 'won' | 'lost'
  const [debrief, setDebrief] = useState(null);
  const [adaptation, setAdaptation] = useState(null);
  const alive = useRef(true);

  const start = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const s = await api.createSession(kingdomId, level);
      if (!alive.current) return;
      setSession(s); setAdaptation(s.adaptation || null);
      setMessages([{ role: 'guardian', text: s.greeting }]);
    } catch (e) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setLoading(false); }
  }, [kingdomId, level]);

  useEffect(() => { alive.current = true; start(); return () => { alive.current = false; }; }, [start]);

  const send = useCallback(async (text) => {
    const message = text.trim();
    if (!message || !session || sending || outcome) return false;
    setError(''); setSending(true);
    setMessages((m) => [...m, { role: 'player', text: message }]);
    try {
      const r = await api.sendMessage(session.session_id, message);
      if (!alive.current) return true;
      setMessages((m) => [...m, { role: 'guardian', text: r.reply }]);
      setSession((s) => ({ ...s, ...r.state }));
      if (r.adaptation) setAdaptation(r.adaptation);
      if (r.state.status === 'won') { setDebrief(r.debrief || null); setTimeout(() => alive.current && setOutcome('won'), 1600); }
      if (r.state.status === 'lost') setTimeout(() => alive.current && setOutcome('lost'), 1600);
      return true;
    } catch (e) {
      if (!alive.current) return false;
      setMessages((m) => m.slice(0, -1)); // roll back the unsent message so it can be re-sent
      setError(e.message);
      return false;
    } finally { if (alive.current) setSending(false); }
  }, [session, sending, outcome]);

  return { session, messages, loading, sending, error, outcome, debrief, adaptation, send, retryStart: start, clearError: () => setError('') };
}
