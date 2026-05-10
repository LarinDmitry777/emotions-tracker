import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEmotions } from '../hooks/useEmotions';
import { EMOTION_CATEGORIES, CYCLE_PHASES } from '../types';
import type { DailyLog } from '../types';

type CategoryName = keyof typeof EMOTION_CATEGORIES;

const CATEGORY_ORDER: CategoryName[] = ['ГНЕВ', 'СТРАХ', 'ГРУСТЬ', 'РАДОСТЬ', 'ЛЮБОВЬ'];

const CATEGORY_WEIGHTS: Record<CategoryName, number> = {
  'ГНЕВ': -1.0,
  'СТРАХ': -0.7,
  'ГРУСТЬ': -0.4,
  'РАДОСТЬ': 1.0,
  'ЛЮБОВЬ': 1.0,
};

const CATEGORY_COLORS: Record<CategoryName, string> = {
  'ГНЕВ': 'var(--cat-gnev)',
  'СТРАХ': 'var(--cat-strah)',
  'ГРУСТЬ': 'var(--cat-grust)',
  'РАДОСТЬ': 'var(--cat-radost)',
  'ЛЮБОВЬ': 'var(--cat-lubov)',
};

const EMOTION_TO_CATEGORY: Record<string, CategoryName> = (() => {
  const map: Record<string, CategoryName> = {};
  (Object.entries(EMOTION_CATEGORIES) as [CategoryName, string[]][]).forEach(([cat, list]) => {
    list.forEach(em => { map[em] = cat; });
  });
  return map;
})();

// Russian stop-words for note tokenisation
const STOP_WORDS = new Set<string>([
  'и','а','но','или','да','не','ни','же','бы','ли','то','вот','так','уж','ведь','если','чтобы','что','как','когда','где','куда','откуда','зачем','почему','потому','потом','уже','еще','ещё','очень','просто','может','можно','нужно','надо','быть','есть','был','была','было','были','будет','буду','будешь','будем','будут','я','ты','он','она','оно','мы','вы','они','меня','тебя','его','её','нас','вас','их','мне','тебе','ему','ей','нам','вам','им','собой','себя','себе','свой','своя','своё','свои','этот','эта','это','эти','тот','та','те','такой','такая','такое','такие','весь','вся','всё','все','всем','всех','всего','один','одна','одно','одни','для','без','под','над','при','про','после','перед','между','через','про','от','до','из','к','ко','с','со','у','о','об','обо','на','в','во','за','по','вс','ну','эх','ой','ах','хм','чем','тем','тут','там','здесь','очень','тоже','также','лишь','только','даже','ещё','еще','всё','всегда','никогда','часто','редко','может','быть','этой','этом','этого','этой','своего','своей','свою','своих','моего','моей','мою','моих','твоего','твоей','твою','твоих','нашего','нашей','нашу','наших','вашего','вашей','вашу','ваших','их','него','неё','них','нему','ней','ним','ими','тебя','любой','любая','любое','любые','какой','какая','какое','какие','чего','кому','кого','чему','как-то','что-то','когда-то','куда-то','будто','хоть','пусть','чтоб','лишь','либо','или','затем','потому-что','далее','здесь','вообще','вроде','точно','прямо','скорее','значит','снова','опять','теперь','сейчас','скоро','раньше','позже','рано','поздно','завтра','вчера','сегодня','утром','вечером','днём','ночью','день','ночь','утро','вечер'
]);

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .split(/[^a-zа-я0-9-]+/i)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

function dayValence(log: DailyLog): number | null {
  if (!log.emotions.length) return null;
  let sum = 0;
  let count = 0;
  for (const em of log.emotions) {
    const cat = EMOTION_TO_CATEGORY[em];
    if (!cat) continue;
    sum += CATEGORY_WEIGHTS[cat];
    count++;
  }
  if (!count) return null;
  return sum / count;
}

function valenceLabel(v: number): string {
  if (v >= 0.5) return 'Эмоциональный подъём';
  if (v >= -0.2) return 'Эмоциональное плато';
  return 'Эмоциональный спад';
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getRangeLogs(logs: DailyLog[], fromISO: string, toISO: string): DailyLog[] {
  // [fromISO, toISO] — обе границы включительно, ISO YYYY-MM-DD сравнимо лексикографически
  return logs.filter(l => l.date >= fromISO && l.date <= toISO);
}

interface PeriodSummary {
  totalDays: number;
  filledDays: number;
  mvi: number | null;
  categoryShare: Record<CategoryName, number>;
  emotionCount: Record<string, number>;
  bestDay: { date: string; mvi: number; emotions: string[] } | null;
  worstDay: { date: string; mvi: number; emotions: string[] } | null;
}

function summarisePeriod(logs: DailyLog[], totalDays: number): PeriodSummary {
  const summary: PeriodSummary = {
    totalDays,
    filledDays: 0,
    mvi: null,
    categoryShare: { 'ГНЕВ':0,'СТРАХ':0,'ГРУСТЬ':0,'РАДОСТЬ':0,'ЛЮБОВЬ':0 },
    emotionCount: {},
    bestDay: null,
    worstDay: null,
  };

  const categoryPickCount = { 'ГНЕВ':0,'СТРАХ':0,'ГРУСТЬ':0,'РАДОСТЬ':0,'ЛЮБОВЬ':0 } as Record<CategoryName, number>;
  let totalPicks = 0;
  let valenceSum = 0;
  let valenceN = 0;

  for (const log of logs) {
    const v = dayValence(log);
    if (v === null) continue;

    summary.filledDays += 1;
    valenceSum += v;
    valenceN += 1;

    if (!summary.bestDay || v > summary.bestDay.mvi) {
      summary.bestDay = { date: log.date, mvi: v, emotions: log.emotions };
    }
    if (!summary.worstDay || v < summary.worstDay.mvi) {
      summary.worstDay = { date: log.date, mvi: v, emotions: log.emotions };
    }

    for (const em of log.emotions) {
      summary.emotionCount[em] = (summary.emotionCount[em] || 0) + 1;
      const cat = EMOTION_TO_CATEGORY[em];
      if (cat) {
        categoryPickCount[cat] += 1;
        totalPicks += 1;
      }
    }
  }

  if (totalPicks > 0) {
    CATEGORY_ORDER.forEach(c => {
      summary.categoryShare[c] = categoryPickCount[c] / totalPicks;
    });
  }
  summary.mvi = valenceN > 0 ? valenceSum / valenceN : null;

  return summary;
}

interface PhaseStats {
  phase: string;
  totalDays: number;
  totalPicks: number;                               // всего выборов эмоций в фазе
  categoryShare: Record<CategoryName, number>;      // 0..1 — доля выборов категории среди всех выборов
  categoryPickCount: Record<CategoryName, number>;  // кол-во выборов эмоций этой категории
  emotionCount: Record<string, number>;             // частота конкретных эмоций в фазе
  mvi: number | null;
  notes: string[];
}

export function Stats() {
  const { logs, loading } = useEmotions();
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  const analytics = useMemo(() => {
    const logsWithPhase = logs.filter(l => l.cyclePhase && CYCLE_PHASES.includes(l.cyclePhase));
    const totalAll = logsWithPhase.length;

    // Per-phase
    const byPhase: Record<string, PhaseStats> = {};
    for (const phase of CYCLE_PHASES) {
      byPhase[phase] = {
        phase,
        totalDays: 0,
        totalPicks: 0,
        categoryShare: { 'ГНЕВ':0,'СТРАХ':0,'ГРУСТЬ':0,'РАДОСТЬ':0,'ЛЮБОВЬ':0 },
        categoryPickCount: { 'ГНЕВ':0,'СТРАХ':0,'ГРУСТЬ':0,'РАДОСТЬ':0,'ЛЮБОВЬ':0 },
        emotionCount: {},
        mvi: null,
        notes: [],
      };
    }

    const valenceSum: Record<string, number> = {};
    const valenceN: Record<string, number> = {};

    for (const log of logsWithPhase) {
      const phase = log.cyclePhase!;
      const stat = byPhase[phase];
      if (!stat) continue;
      stat.totalDays += 1;
      if (log.note && log.note.trim()) stat.notes.push(log.note);

      for (const em of log.emotions) {
        stat.emotionCount[em] = (stat.emotionCount[em] || 0) + 1;
        const cat = EMOTION_TO_CATEGORY[em];
        if (cat) {
          stat.categoryPickCount[cat] += 1;
          stat.totalPicks += 1;
        }
      }

      const v = dayValence(log);
      if (v !== null) {
        valenceSum[phase] = (valenceSum[phase] || 0) + v;
        valenceN[phase] = (valenceN[phase] || 0) + 1;
      }
    }

    for (const phase of CYCLE_PHASES) {
      const s = byPhase[phase];
      if (s.totalPicks > 0) {
        CATEGORY_ORDER.forEach(c => {
          s.categoryShare[c] = s.categoryPickCount[c] / s.totalPicks;
        });
      }
      s.mvi = valenceN[phase] ? valenceSum[phase] / valenceN[phase] : null;
    }

    return { byPhase, totalAll };
  }, [logs]);

  // Default: pick phase with most records (or first non-empty)
  useEffect(() => {
    if (selectedPhase || loading) return;
    const sorted = [...CYCLE_PHASES].sort(
      (a, b) => analytics.byPhase[b].totalDays - analytics.byPhase[a].totalDays
    );
    const first = sorted.find(p => analytics.byPhase[p].totalDays > 0);
    if (first) setSelectedPhase(first);
  }, [analytics, loading, selectedPhase]);

  if (loading) return <div className="container"><p>Загрузка...</p></div>;

  const hasData = analytics.totalAll > 0;

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <header className="header" style={{ textAlign: 'left' }}>
        <h1>Статистика</h1>
        <p>Эмоции по фазам цикла</p>
      </header>

      {!hasData && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Пока нет записей с указанной фазой цикла. Заполните несколько дней,
            чтобы увидеть аналитику.
          </p>
        </div>
      )}

      {hasData && (
        <>
          <PhaseComparison analytics={analytics} onSelect={setSelectedPhase} selectedPhase={selectedPhase} />
          <PhaseDetail
            analytics={analytics}
            selectedPhase={selectedPhase}
            onSelect={setSelectedPhase}
          />
        </>
      )}

      {logs.length > 0 && <MonthlyOverview logs={logs} />}
    </div>
  );
}

// --- Phase comparison (Stacked Bar) -------------------------------------

interface AnalyticsBundle {
  byPhase: Record<string, PhaseStats>;
  totalAll: number;
}

function PhaseComparison({
  analytics,
  selectedPhase,
  onSelect,
}: {
  analytics: AnalyticsBundle;
  selectedPhase: string | null;
  onSelect: (p: string) => void;
}) {
  const phases = CYCLE_PHASES.filter(p => analytics.byPhase[p].totalDays > 0);

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '16px' }}>
      <h3 style={{ marginBottom: '6px', fontWeight: 600 }}>Сравнение фаз</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Структура эмоций и индекс баланса
      </p>

      <div className="phase-compare">
        {phases.map(phase => {
          const s = analytics.byPhase[phase];
          // Normalize so segments sum to 100% within the row
          const sum = CATEGORY_ORDER.reduce((acc, c) => acc + s.categoryShare[c], 0) || 1;
          const isActive = selectedPhase === phase;
          return (
            <button
              type="button"
              key={phase}
              className={`phase-row ${isActive ? 'phase-row--active' : ''}`}
              onClick={() => onSelect(phase)}
            >
              <div className="phase-row__header">
                <span className="phase-row__name">{phase}</span>
                <span className="phase-row__meta">
                  <span className="phase-row__days">{s.totalDays} дн.</span>
                  {s.mvi !== null && (
                    <span className="phase-row__mvi" style={{ color: mviColor(s.mvi) }}>
                      ИЭБ {formatMvi(s.mvi)}
                    </span>
                  )}
                </span>
              </div>
              <div className="stacked-bar stacked-bar--labeled">
                {CATEGORY_ORDER.map(cat => {
                  const w = (s.categoryShare[cat] / sum) * 100;
                  if (w <= 0) return null;
                  const pct = Math.round(s.categoryShare[cat] * 100);
                  return (
                    <div
                      key={cat}
                      className="stacked-bar__seg"
                      style={{ width: `${w}%`, background: CATEGORY_COLORS[cat] }}
                      title={`${cat}: ${pct}%`}
                    >
                      {w >= 9 && <span className="stacked-bar__label">{pct}%</span>}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      <div className="legend">
        {CATEGORY_ORDER.map(cat => (
          <div key={cat} className="legend__item">
            <span className="legend__dot" style={{ background: CATEGORY_COLORS[cat] }} />
            <span>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function mviColor(v: number): string {
  if (v >= 0.5) return 'var(--cat-radost)';
  if (v >= -0.2) return 'var(--text-primary)';
  return 'var(--cat-gnev)';
}

function formatMvi(v: number): string {
  const s = v.toFixed(2);
  return v > 0 ? `+${s}` : s;
}

// --- Phase detail --------------------------------------------------------

function PhaseDetail({
  analytics,
  selectedPhase,
  onSelect,
}: {
  analytics: AnalyticsBundle;
  selectedPhase: string | null;
  onSelect: (p: string) => void;
}) {
  const [mviInfoOpen, setMviInfoOpen] = useState(false);
  if (!selectedPhase) return null;
  const stat = analytics.byPhase[selectedPhase];
  if (!stat || stat.totalDays === 0) return null;

  // Baseline = категории по ОСТАЛЬНЫМ фазам (без выбранной),
  // считаем как доля выборов категории среди всех выборов в других фазах.
  const otherPhases = CYCLE_PHASES.filter(p => p !== selectedPhase);
  const otherTotalDays = otherPhases.reduce((acc, p) => acc + analytics.byPhase[p].totalDays, 0);
  const otherTotalPicks = otherPhases.reduce((acc, p) => acc + analytics.byPhase[p].totalPicks, 0);

  const otherCategoryShare = {} as Record<CategoryName, number>;
  CATEGORY_ORDER.forEach(c => {
    if (otherTotalPicks === 0) {
      otherCategoryShare[c] = 0;
      return;
    }
    const sum = otherPhases.reduce(
      (acc, p) => acc + analytics.byPhase[p].categoryPickCount[c], 0
    );
    otherCategoryShare[c] = sum / otherTotalPicks;
  });

  const anomalies = otherTotalPicks === 0 ? [] : CATEGORY_ORDER
    .map(cat => {
      const delta = stat.categoryShare[cat] - otherCategoryShare[cat];
      return { cat, delta };
    })
    .filter(a => Math.abs(a.delta) >= 0.05)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const top3 = Object.entries(stat.emotionCount)
    .map(([emotion, count]) => {
      const inPhase = count / stat.totalDays;
      let inOther = 0;
      if (otherTotalDays > 0) {
        const otherCount = otherPhases.reduce(
          (acc, p) => acc + (analytics.byPhase[p].emotionCount[emotion] || 0), 0
        );
        inOther = otherCount / otherTotalDays;
      }
      return { emotion, count, distinctiveness: inPhase - inOther };
    })
    .sort((a, b) => b.distinctiveness - a.distinctiveness || b.count - a.count)
    .slice(0, 3);

  // Trigger words from notes
  const wordFreq: Record<string, number> = {};
  for (const note of stat.notes) {
    const seen = new Set<string>();
    for (const w of tokenise(note)) {
      if (seen.has(w)) continue;
      seen.add(w);
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }
  const triggers = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Детальный анализ фазы</h3>

      <div className="chips-container" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '20px', justifyContent: 'flex-start' }}>
        {CYCLE_PHASES.map(phase => {
          const total = analytics.byPhase[phase].totalDays;
          const disabled = total === 0;
          return (
            <div
              key={phase}
              className={`chip chip-sm ${selectedPhase === phase ? 'selected cat-ЛЮБОВЬ' : ''}`}
              onClick={() => !disabled && onSelect(phase)}
              style={{
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {phase}
            </div>
          );
        })}
      </div>

      {stat.mvi !== null && (
        <div className="mvi-card">
          <div className="mvi-card__label">
            Индекс эмоционального баланса
            <button
              type="button"
              className="info-btn"
              aria-label="Что это?"
              aria-expanded={mviInfoOpen}
              onClick={() => setMviInfoOpen(v => !v)}
            >
              ?
            </button>
          </div>
          <div className="mvi-card__value" style={{ color: mviColor(stat.mvi) }}>
            {formatMvi(stat.mvi)}
          </div>
          <div className="mvi-card__hint">{valenceLabel(stat.mvi)}</div>
          {mviInfoOpen && (
            <div className="mvi-info" role="note">
              <p>
                Числовой показатель «градуса» настроения в фазе. Каждой эмоции
                присвоен вес по категории:
              </p>
              <ul className="mvi-info__weights">
                <li><span className="legend__dot" style={{ background: 'var(--cat-radost)' }} /> Радость&nbsp;/&nbsp;Любовь — <b>+1.0</b></li>
                <li><span className="legend__dot" style={{ background: 'var(--cat-grust)' }} /> Грусть — <b>−0.4</b></li>
                <li><span className="legend__dot" style={{ background: 'var(--cat-strah)' }} /> Страх — <b>−0.7</b></li>
                <li><span className="legend__dot" style={{ background: 'var(--cat-gnev)' }} /> Гнев — <b>−1.0</b></li>
              </ul>
              <p>
                ИЭБ дня — среднее весов выбранных эмоций. ИЭБ фазы — среднее по всем
                её дням. Диапазон от −1.0 до +1.0:
              </p>
              <ul className="mvi-info__ranges">
                <li><b style={{ color: 'var(--cat-radost)' }}>+0.5 … +1.0</b> — эмоциональный подъём</li>
                <li><b>−0.2 … +0.5</b> — плато, стабильность</li>
                <li><b style={{ color: 'var(--cat-gnev)' }}>−1.0 … −0.2</b> — эмоциональный спад</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <Section title="Аномалии (отклонения от среднего)">
        {anomalies.length === 0 ? (
          <p className="muted">Существенных отклонений не найдено.</p>
        ) : (
          <ul className="insight-list">
            {anomalies.map(({ cat, delta }) => {
              const pct = Math.round(Math.abs(delta) * 100);
              const direction = delta > 0 ? 'чаще' : 'реже';
              return (
                <li key={cat} className="insight-item">
                  <span className="insight-dot" style={{ background: CATEGORY_COLORS[cat] }} />
                  <span>
                    <strong style={{ color: CATEGORY_COLORS[cat] }}>{cat}</strong>
                    {' '}на {pct}% {direction}, чем в среднем по другим дням.
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Топ-3 характерных эмоций">
        {top3.length === 0 ? (
          <p className="muted">Недостаточно данных.</p>
        ) : (
          <ol className="top-emotions">
            {top3.map(({ emotion, count }) => {
              const cat = EMOTION_TO_CATEGORY[emotion];
              return (
                <li key={emotion}>
                  <span
                    className={`mini-chip${cat ? ` cat-${cat}` : ''}`}
                  >
                    {emotion}
                  </span>
                  <span className="muted" style={{ fontSize: '12px' }}>{count} дн.</span>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section title="Частые слова в заметках">
        {triggers.length === 0 ? (
          <p className="muted">Заметки пока не содержат повторяющихся слов.</p>
        ) : (
          <div className="trigger-cloud">
            {triggers.map(([word, count]) => (
              <span key={word} className="trigger-tag">
                #{word} <span className="muted" style={{ fontSize: '11px' }}>({count})</span>
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '20px' }}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

// --- Monthly overview ----------------------------------------------------

function formatDayShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}

const RANGE_OPTIONS = [7, 14, 30] as const;
type RangeDays = typeof RANGE_OPTIONS[number];

function MonthlyOverview({ logs }: { logs: DailyLog[] }) {
  const [range, setRange] = useState<RangeDays>(30);

  const { current, previous } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentTo = toISODate(today);
    const currentFrom = new Date(today);
    currentFrom.setDate(currentFrom.getDate() - (range - 1));
    const previousTo = new Date(currentFrom);
    previousTo.setDate(previousTo.getDate() - 1);
    const previousFrom = new Date(previousTo);
    previousFrom.setDate(previousFrom.getDate() - (range - 1));

    return {
      current: summarisePeriod(getRangeLogs(logs, toISODate(currentFrom), currentTo), range),
      previous: summarisePeriod(getRangeLogs(logs, toISODate(previousFrom), toISODate(previousTo)), range),
    };
  }, [logs, range]);

  const minPrevDays = Math.max(2, Math.floor(range / 4));

  const rangeSelector = (
    <div className="chips-container" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '20px', justifyContent: 'flex-start' }}>
      {RANGE_OPTIONS.map(opt => (
        <div
          key={opt}
          className={`chip chip-sm ${range === opt ? 'selected cat-ЛЮБОВЬ' : ''}`}
          onClick={() => setRange(opt)}
        >
          {opt} дней
        </div>
      ))}
    </div>
  );

  if (current.filledDays < 2) {
    return (
      <div className="glass-panel" style={{ padding: '24px', marginTop: '16px' }}>
        <h3 style={{ marginBottom: '6px', fontWeight: 600 }}>Последние {range} дней</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
          Итог по скользящему окну
        </p>
        {rangeSelector}
        <p className="muted" style={{ marginTop: '6px' }}>
          Недостаточно данных за этот период. Заполните хотя бы пару дней.
        </p>
      </div>
    );
  }

  const showDelta = previous.filledDays >= minPrevDays && previous.mvi !== null && current.mvi !== null;
  const delta = showDelta ? (current.mvi as number) - (previous.mvi as number) : null;
  const deltaArrow = delta === null ? '' : delta > 0.05 ? '↑' : delta < -0.05 ? '↓' : '→';
  const deltaClass = delta === null ? '' : delta > 0.05 ? 'delta-up' : delta < -0.05 ? 'delta-down' : 'delta-flat';

  const sumShare = CATEGORY_ORDER.reduce((acc, c) => acc + current.categoryShare[c], 0) || 1;

  const top5 = Object.entries(current.emotionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const coveragePct = Math.round((current.filledDays / current.totalDays) * 100);

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '16px' }}>
      <h3 style={{ marginBottom: '6px', fontWeight: 600 }}>Последние {range} дней</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
        Итог по скользящему окну
      </p>

      {rangeSelector}

      {current.mvi !== null && (
        <div className="mvi-card">
          <div className="mvi-card__label">Индекс эмоционального баланса</div>
          <div className="mvi-card__value" style={{ color: mviColor(current.mvi) }}>
            {formatMvi(current.mvi)}
          </div>
          <div className="mvi-card__hint">{valenceLabel(current.mvi)}</div>
          {showDelta && delta !== null ? (
            <div className={`mvi-delta ${deltaClass}`}>
              <span className="mvi-delta__arrow">{deltaArrow}</span>
              <span>{formatMvi(delta)} к прошлым {range} дням</span>
            </div>
          ) : (
            <div className="mvi-delta mvi-delta--muted">
              Недостаточно данных в предыдущем периоде для сравнения
            </div>
          )}
        </div>
      )}

      <Section title="Структура эмоций">
        <div className="stacked-bar stacked-bar--labeled" style={{ marginBottom: '12px' }}>
          {CATEGORY_ORDER.map(cat => {
            const w = (current.categoryShare[cat] / sumShare) * 100;
            if (w <= 0) return null;
            const pct = Math.round(current.categoryShare[cat] * 100);
            return (
              <div
                key={cat}
                className="stacked-bar__seg"
                style={{ width: `${w}%`, background: CATEGORY_COLORS[cat] }}
                title={`${cat}: ${pct}%`}
              >
                {w >= 9 && <span className="stacked-bar__label">{pct}%</span>}
              </div>
            );
          })}
        </div>
        <div className="legend" style={{ marginTop: 0 }}>
          {CATEGORY_ORDER.map(cat => (
            <div key={cat} className="legend__item">
              <span className="legend__dot" style={{ background: CATEGORY_COLORS[cat] }} />
              <span>{cat}</span>
            </div>
          ))}
        </div>
      </Section>

      {top5.length > 0 && (
        <Section title="Топ-5 эмоций">
          <div className="history-item-emotions">
            {top5.map(([emotion, count]) => {
              const cat = EMOTION_TO_CATEGORY[emotion];
              return (
                <span key={emotion} className={`mini-chip${cat ? ` cat-${cat}` : ''}`}>
                  {emotion} <span className="muted" style={{ fontSize: '11px' }}>×{count}</span>
                </span>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Пиковые дни">
        <div className="overview-grid">
          <DayCard kind="best" day={current.bestDay} />
          <DayCard kind="worst" day={current.worstDay} />
        </div>
        <div className="muted" style={{ marginTop: '12px', fontSize: '12px' }}>
          Заполнено {current.filledDays} из {current.totalDays} дней ({coveragePct}%)
        </div>
      </Section>
    </div>
  );
}

function DayCard({
  kind,
  day,
}: {
  kind: 'best' | 'worst';
  day: PeriodSummary['bestDay'];
}) {
  const label = kind === 'best' ? 'Лучший день' : 'Худший день';

  if (!day) {
    return (
      <div className="overview-day-card overview-day-card--empty">
        <div className="overview-day-card__label">{label}</div>
        <div className="overview-day-card__placeholder">—</div>
      </div>
    );
  }

  const chips = day.emotions.slice(0, 3);

  return (
    <Link
      to="/history"
      state={{ focusDate: day.date }}
      className="overview-day-card"
    >
      <div className="overview-day-card__label">{label}</div>
      <div className="overview-day-card__date">{formatDayShort(day.date)}</div>
      <div
        className="overview-day-card__mvi"
        style={{ color: mviColor(day.mvi) }}
      >
        ИЭБ {formatMvi(day.mvi)}
      </div>
      <div className="overview-day-card__chips">
        {chips.map(em => {
          const cat = EMOTION_TO_CATEGORY[em];
          return (
            <span key={em} className={`mini-chip${cat ? ` cat-${cat}` : ''}`}>
              {em}
            </span>
          );
        })}
        {day.emotions.length > chips.length && (
          <span className="mini-chip">+{day.emotions.length - chips.length}</span>
        )}
      </div>
    </Link>
  );
}
