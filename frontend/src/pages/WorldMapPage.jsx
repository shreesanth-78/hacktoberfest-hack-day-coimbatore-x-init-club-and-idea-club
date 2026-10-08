import { useSearchParams } from 'react-router-dom';
import WorldMap from '../components/WorldMap.jsx';
export default function WorldMapPage() {
  const [q] = useSearchParams();
  return <WorldMap devTools={q.get('dev') === '1'} />;
}
