import { useState } from 'react';
import { useEmotions } from '../hooks/useEmotions';
import { EMOTION_CATEGORIES } from '../types';
import { Trash2, Calendar, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Helper to determine category of an emotion
const getCategoryByEmotion = (emotion: string): string => {
  for (const [category, emotions] of Object.entries(EMOTION_CATEGORIES)) {
    if (emotions.includes(emotion)) return category;
  }
  return 'ДРУГОЕ';
};

export function History() {
  const { logs, loading, removeLog, changeDate } = useEmotions();
  const [editingDateFor, setEditingDateFor] = useState<string | null>(null);
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | undefined>(undefined);

  const handleOpenEdit = (logId: string) => {
    setEditingDateFor(logId);
    setTempSelectedDate(new Date(logId));
  };

  const filledDates = logs.map(l => new Date(l.date));

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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn delete-btn" onClick={() => handleOpenEdit(log.id)}>
                      <Calendar size={20} />
                    </button>
                    <button className="btn delete-btn" onClick={() => removeLog(log.id)}>
                      <Trash2 size={20} />
                    </button>
                  </div>
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

      {editingDateFor && (
        <div className="modal-overlay" onClick={() => setEditingDateFor(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Изменить дату</h2>
              <button className="btn close-btn" onClick={() => setEditingDateFor(null)}>
                <X size={24} />
              </button>
            </div>
            
            <DayPicker 
              mode="single"
              selected={tempSelectedDate}
              onSelect={setTempSelectedDate}
              disabled={[
                { after: new Date() },
                ...filledDates.filter(d => {
                  if (isNaN(d.getTime())) return false;
                  // Allow the editing date to be available, disable others
                  return format(d, 'yyyy-MM-dd') !== editingDateFor;
                })
              ]}
              locale={ru}
            />

            <button 
              className="btn btn-primary" 
              style={{ marginTop: '16px', marginBottom: 0 }}
              disabled={!tempSelectedDate || format(tempSelectedDate, 'yyyy-MM-dd') === editingDateFor}
              onClick={() => {
                if (tempSelectedDate && editingDateFor) {
                  const formatted = format(tempSelectedDate, 'yyyy-MM-dd');
                  changeDate(editingDateFor, formatted).then(() => setEditingDateFor(null));
                }
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
