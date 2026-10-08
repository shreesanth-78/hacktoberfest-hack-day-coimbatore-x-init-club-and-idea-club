import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GameProvider } from './hooks/useGameState.jsx';
import App from './App.jsx';
import './styles/game.css';
import './styles/world-map.css';

createRoot(document.getElementById('root')).render(
  <StrictMode><BrowserRouter><GameProvider><App /></GameProvider></BrowserRouter></StrictMode>
);
