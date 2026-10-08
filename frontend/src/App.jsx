import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import WorldMapPage from './pages/WorldMapPage.jsx';
import KingdomPage from './pages/KingdomPage.jsx';
import GameplayPage from './pages/GameplayPage.jsx';
import { useGame } from './hooks/useGameState.jsx';

// With the real backend, progress lives on the server, so nothing can be shown until it has loaded
// (otherwise a gate would look sealed for a moment, or the player would be bounced to the map).
function BackendGate({ children }) {
  const game = useGame();
  if (!game.ready) {
    return <main className="landing"><div className="landing-card parchment"><h1>PROMPT HEIST</h1><p className="lede">Contacting the kingdom…</p></div></main>;
  }
  if (game.error && !game.campaign) {
    return (
      <main className="landing">
        <div className="landing-card parchment">
          <h1>PROMPT HEIST</h1>
          <p className="lede">The kingdom cannot be reached.</p>
          <p role="alert">{game.error}</p>
          <div className="landing-actions"><button className="stone-btn big" onClick={game.refresh}>Try again ›</button></div>
        </div>
      </main>
    );
  }
  return children;
}

export default function App() {
  return (
    <BackendGate>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/world" element={<WorldMapPage />} />
        <Route path="/kingdom/:id" element={<KingdomPage />} />
        <Route path="/play/:id/:level" element={<GameplayPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BackendGate>
  );
}
