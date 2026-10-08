import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, USE_MOCK } from '../services/api.js';
import { useGame } from '../hooks/useGameState.jsx';

// Top campaigns by total score (GET /api/campaigns/leaderboard). Needs the real backend: the mock has no scores.
export default function LeaderboardPage() {
  const game = useGame();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError(''); setEntries(null);
    try { setEntries(await api.getLeaderboard()); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <main className="landing leaderboard-page">
      <div className="landing-card parchment leaderboard-card">
        <p className="eyebrow">Hall of Phantoms</p>
        <h1>LEADERBOARD</h1>
        {USE_MOCK && <p className="lede">Scores are kept by the backend, which is not connected in mock mode.</p>}
        {error && (<p role="alert" className="form-error">{error} <button type="button" className="stone-btn tiny" onClick={load}>Try again</button></p>)}
        {!error && entries === null && <p className="lede">Reading the ledgers…</p>}
        {entries && entries.length === 0 && !USE_MOCK && <p className="lede">No campaign has scored yet. Be the first.</p>}
        {entries && entries.length > 0 && (
          <table className="board" aria-label="Top campaigns by score">
            <thead><tr><th>#</th><th>Phantom</th><th>Score</th><th>Gates cleared</th><th>Status</th></tr></thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={`${e.player_name}-${i}`} className={game.playerName && e.player_name === game.playerName ? 'me' : ''}>
                  <td>{i + 1}</td>
                  <td>{e.player_name}</td>
                  <td>{e.total_score.toLocaleString()}</td>
                  <td>{e.levels_cleared}/30</td>
                  <td>{e.status === 'completed' ? '🏆 Completed' : 'In progress'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="landing-actions">
          <Link className="stone-btn big" to={game.hasGame && game.playerName ? '/world' : '/'}>{game.hasGame && game.playerName ? '‹ Back to the map' : '‹ Title screen'}</Link>
        </div>
      </div>
    </main>
  );
}
