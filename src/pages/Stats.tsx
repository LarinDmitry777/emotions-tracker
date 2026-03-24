import { useState } from 'react';
import { useEmotions } from '../hooks/useEmotions';
import { EMOTION_CATEGORIES, CYCLE_PHASES } from '../types';

const getCategoryByEmotion = (emotion: string): string => {
  for (const [category, emotions] of Object.entries(EMOTION_CATEGORIES)) {
    if (emotions.includes(emotion)) return category;
  }
  return 'ДРУГОЕ';
};

const getCategoryColorVariable = (category: string) => {
  switch(category) {
    case 'ГНЕВ': return 'var(--cat-gnev)';
    case 'СТРАХ': return 'var(--cat-strah)';
    case 'ГРУСТЬ': return 'var(--cat-grust)';
    case 'РАДОСТЬ': return 'var(--cat-radost)';
    case 'ЛЮБОВЬ': return 'var(--cat-lubov)';
    default: return 'var(--accent)';
  }
}

export function Stats() {
  const { logs, loading } = useEmotions();
  const [filterPhase, setFilterPhase] = useState<string | 'ALL'>('ALL');

  if (loading) return <div className="container"><p>Загрузка...</p></div>;

  const filteredLogs = filterPhase === 'ALL' 
    ? logs 
    : logs.filter(l => l.cyclePhase === filterPhase);

  const totalDays = filteredLogs.length;
  
  // Count frequency of each individual emotion
  const emotionCounts = filteredLogs.reduce((acc, log) => {
    log.emotions.forEach(em => {
      acc[em] = (acc[em] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15); // Top 15

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header className="header" style={{ textAlign: 'left' }}>
        <h1>Статистика</h1>
        <p>Анализ ваших эмоций</p>
      </header>

      <div className="category-section" style={{ marginBottom: '24px' }}>
        <div className="chips-container" style={{ flexWrap: 'wrap', gap: '8px', paddingBottom: '8px', justifyContent: 'flex-start' }}>
          <div 
            className={`chip chip-sm ${filterPhase === 'ALL' ? 'selected cat-ЛЮБОВЬ' : ''}`}
            onClick={() => setFilterPhase('ALL')}
          >
            Все дни
          </div>
          {CYCLE_PHASES.map(phase => (
            <div 
              key={phase}
              className={`chip chip-sm ${filterPhase === phase ? 'selected cat-ЛЮБОВЬ' : ''}`}
              onClick={() => setFilterPhase(phase)}
            >
              {phase}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel stats-card">
        <div className="stats-number">{totalDays}</div>
        <div className="stats-label">Записанных дней</div>
      </div>

      {sortedEmotions.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontWeight: 600 }}>Частые эмоции</h3>
          {sortedEmotions.map(([emotion, count]) => {
            const percentage = Math.round((count / totalDays) * 100);
            const cat = getCategoryByEmotion(emotion);
            const color = getCategoryColorVariable(cat);
            return (
              <div key={emotion} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                  <span>{emotion} <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>({count} дн.)</span></span>
                  <span style={{ color: 'var(--text-secondary)' }}>{percentage}%</span>
                </div>
                <div className="stats-bar-container">
                  <div 
                    className="stats-bar" 
                    style={{ 
                      width: `${Math.max(percentage, 2)}%`, 
                      background: color
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
