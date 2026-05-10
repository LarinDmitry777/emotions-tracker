import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEmotions } from '../hooks/useEmotions';
import { EMOTION_CATEGORIES } from '../types';
import { Trash2, Calendar, X, Download, Plus } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { downloadExport, parseImport } from '../lib/exportImport';
import type { DailyLog } from '../types';

// Helper to determine category of an emotion
const getCategoryByEmotion = (emotion: string): string => {
  for (const [category, emotions] of Object.entries(EMOTION_CATEGORIES)) {
    if (emotions.includes(emotion)) return category;
  }
  return 'ДРУГОЕ';
};

export function History() {
  const { logs, loading, removeLog, changeDate, importLogs } = useEmotions();
  const [editingDateFor, setEditingDateFor] = useState<string | null>(null);
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | undefined>(undefined);
  const [pendingImport, setPendingImport] = useState<DailyLog[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const location = useLocation();
  const focusDate = (location.state as { focusDate?: string } | null)?.focusDate ?? null;

  useEffect(() => {
    if (loading || !focusDate) return;
    const el = itemRefs.current.get(focusDate);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(focusDate);
    const t = setTimeout(() => setHighlightedId(null), 1800);
    return () => clearTimeout(t);
  }, [focusDate, loading, logs.length]);

  const handleExport = () => {
    if (logs.length === 0) return;
    downloadExport(logs);
  };

  const handlePickFile = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const entries = parseImport(text);
      setPendingImport(entries);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Не удалось прочитать файл');
    }
  };

  const runImport = async (mode: 'merge' | 'replace') => {
    if (!pendingImport) return;
    await importLogs(pendingImport, mode);
    setPendingImport(null);
  };

  const handleOpenEdit = (logId: string) => {
    setEditingDateFor(logId);
    setTempSelectedDate(new Date(logId));
  };

  const filledDates = logs.map(l => new Date(l.date));

  if (loading) return <div className="container"><p>Загрузка...</p></div>;

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header className="header" style={{ textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h1>История</h1>
            <p>Ваши ежедневные записи</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn icon-btn"
              onClick={handlePickFile}
              title="Импорт из файла"
              aria-label="Импорт из файла"
            >
              <Plus size={20} />
            </button>
            <button
              className="btn icon-btn"
              onClick={handleExport}
              disabled={logs.length === 0}
              title="Экспорт в файл"
              aria-label="Экспорт в файл"
            >
              <Download size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>
        {importError && (
          <p style={{ color: 'var(--cat-gnev)', marginTop: '12px' }}>{importError}</p>
        )}
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
              <div
                key={log.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(log.id, el);
                  else itemRefs.current.delete(log.id);
                }}
                className={`glass-panel history-item${highlightedId === log.id ? ' history-item--highlighted' : ''}`}
              >
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

      {pendingImport && (
        <div className="modal-overlay" onClick={() => setPendingImport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Импорт записей</h2>
              <button className="btn close-btn" onClick={() => setPendingImport(null)}>
                <X size={24} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Найдено записей в файле: {pendingImport.length}.
              <br />
              Выберите, как объединить с текущими данными.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 0, marginBottom: '12px' }}
              onClick={() => runImport('merge')}
            >
              Добавить (перезаписать совпадающие даты)
            </button>
            <button
              className="btn btn-primary"
              style={{ marginTop: 0, marginBottom: 0, background: 'var(--cat-gnev)', boxShadow: 'none' }}
              onClick={() => {
                if (confirm('Все текущие записи будут удалены. Продолжить?')) {
                  runImport('replace');
                }
              }}
            >
              Заменить всё
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
