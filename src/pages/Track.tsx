import { useState, useEffect } from 'react';
import { EMOTION_CATEGORIES, CYCLE_PHASES } from '../types';
import { Check, Flame, CloudLightning, CloudRain, Sun, Heart, Moon, PenLine } from 'lucide-react';
import { useEmotions } from '../hooks/useEmotions';

const CATEGORY_ICONS = {
  'ГНЕВ': <Flame size={18} />,
  'СТРАХ': <CloudLightning size={18} />,
  'ГРУСТЬ': <CloudRain size={18} />,
  'РАДОСТЬ': <Sun size={18} />,
  'ЛЮБОВЬ': <Heart size={18} />
};

const getLocalDateString = () => {
  const date = new Date();
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('.').reverse().join('-');
};

export function Track() {
  const { saveDay, getLogById } = useEmotions();
  const [selectedEmotions, setSelectedEmotions] = useState<Set<string>>(new Set());
  const [cyclePhase, setCyclePhase] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [todayStr] = useState(getLocalDateString());
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Load today's log if it exists
    const fetchToday = async () => {
      const log = await getLogById(todayStr);
      if (log) {
        setSelectedEmotions(new Set(log.emotions));
        setCyclePhase(log.cyclePhase);
        if (log.note) setNote(log.note);
      }
    };
    fetchToday();
  }, [getLogById, todayStr]);

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emotion)) newSet.delete(emotion);
      else newSet.add(emotion);
      return newSet;
    });
  };

  const handleSave = async () => {
    if (selectedEmotions.size === 0 && !note && !cyclePhase) {
      showToast('Выберите эмоцию, фазу цикла или оставьте заметку.', 'error');
      return;
    }
    await saveDay(todayStr, Array.from(selectedEmotions), cyclePhase, note);
    showToast('Сохранено!', 'success');
  };

  const dateDisplay = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="container" style={{ paddingBottom: '110px' }}>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      <header className="header">
        <h1>Что я сегодня чувствовала?</h1>
        <p style={{ textTransform: 'capitalize' }}>{dateDisplay}</p>
      </header>

      {Object.entries(EMOTION_CATEGORIES).map(([category, emotions]) => (
        <div key={category} className="category-section">
          <div className="category-title">
            {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
            {category}
          </div>
          <div className="chips-container">
            {emotions.map(emotion => {
              const isSelected = selectedEmotions.has(emotion);
              return (
                <div 
                  key={emotion}
                  className={`chip ${isSelected ? 'selected' : ''} cat-${category}`}
                  onClick={() => toggleEmotion(emotion)}
                >
                  {emotion}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="category-section">
        <div className="category-title">
          <Moon size={18} />
          ФАЗА ЦИКЛА
        </div>
        <div className="chips-container">
          {CYCLE_PHASES.map(phase => (
            <div 
              key={phase}
              className={`chip ${cyclePhase === phase ? 'selected cat-ЛЮБОВЬ' : ''}`}
              onClick={() => setCyclePhase(cyclePhase === phase ? undefined : phase)}
            >
              {phase}
            </div>
          ))}
        </div>
      </div>

      <div className="category-section">
        <div className="category-title">
          <PenLine size={18} />
          ЗАМЕТКА
        </div>
        <textarea 
          className="input-field" 
          placeholder="Что повлияло на мои эмоции сегодня?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button className="save-btn-fixed" onClick={handleSave} aria-label="Сохранить день">
        <Check size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
