import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Track } from './pages/Track';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { BottomNav } from './components/BottomNav';

function App() {
  useEffect(() => {
    const handleScroll = () => {
      document.body.style.setProperty('--scroll-y', `${window.scrollY}px`);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <HashRouter>
      <div style={{ minHeight: '100vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Routes>
          <Route path="/" element={<Track />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
