import { useSearchParams } from 'react-router-dom';
import WorldMap from '../components/WorldMap.jsx';
import { USE_MOCK } from '../services/api.js';

export default function WorldMapPage() {
  const [q] = useSearchParams();
  // The dev shortcuts (unlock all, reset) only make sense with the mock; the real campaign is server-side.
  return <WorldMap devTools={q.get('dev') === '1' && USE_MOCK} />;
}
