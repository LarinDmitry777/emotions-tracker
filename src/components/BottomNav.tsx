import { Link, useLocation } from 'react-router-dom';
import { Home, List, BarChart2 } from 'lucide-react';

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${path === '/' ? 'active' : ''}`}>
        <Home size={24} />
        <span>Track</span>
      </Link>
      <Link to="/history" className={`nav-item ${path === '/history' ? 'active' : ''}`}>
        <List size={24} />
        <span>History</span>
      </Link>
      <Link to="/stats" className={`nav-item ${path === '/stats' ? 'active' : ''}`}>
        <BarChart2 size={24} />
        <span>Stats</span>
      </Link>
    </nav>
  );
}
