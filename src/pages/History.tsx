import { useEmotions } from '../hooks/useEmotions';
import { EMOTION_CATEGORIES } from '../types';
import { Trash2 } from 'lucide-react';

// Helper to determine category of an emotion
const getCategoryByEmotion = (emotion: string): string => {
  for (const [category, emotions] of Object.entries(EMOTION_CATEGORIES)) {
    if (emotions.includes(emotion)) return category;
  }
  return 'ДРУГОЕ';
};

export function History() {
  const { logs, loading, removeLog } = useEmotions();

  if (loading) return <div className="container"><p>Загрузка...</p></div>;

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header className="header" style={{ textAlign: 'left' }}>
        <h1>История</h1>
        <p>Ваши ежедневные записи</p>
      </header>

      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '64px', color: 'var(--text-secondary)' }}>
          <p>Пока нет записей.</p>
        </div>
      ) : (
        <div className="history-list">
          {logs.map((log) => {
            const dateObj = new Date(log.date);
            const dateDisplay = dateObj.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
            
            return (
              <div key={log.id} className="glass-panel history-item">
                <div className="history-item-header">
                  <div className="history-item-date">
                    {dateDisplay}
                    {log.cyclePhase && <span className="cycle-tag">{log.cyclePhase}</span>}
                  </div>
                  <button className="btn delete-btn" onClick={() => removeLog(log.id)}>
                    <Trash2 size={20} />
                  </button>
                </div>
                
                {log.note && <div className="history-item-note">{log.note}</div>}
                
                <div className="history-item-emotions">
                  {log.emotions.map(emotion => {
                    const cat = getCategoryByEmotion(emotion);
                    return (
                      <span key={emotion} className={`mini-chip cat-${cat}`}>
                        {emotion}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
