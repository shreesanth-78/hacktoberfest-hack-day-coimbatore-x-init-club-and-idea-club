import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import WorldMapPage from './pages/WorldMapPage.jsx';
import KingdomPage from './pages/KingdomPage.jsx';
import GameplayPage from './pages/GameplayPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/world" element={<WorldMapPage />} />
      <Route path="/kingdom/:id" element={<KingdomPage />} />
      <Route path="/play/:id/:level" element={<GameplayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
