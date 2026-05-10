import type { DailyLog } from '../types';

export const EXPORT_VERSION = 1;

export interface ExportFile {
  app: 'nastysha-emotions';
  version: number;
  exportedAt: string;
  logs: DailyLog[];
}

export function buildExport(logs: DailyLog[]): ExportFile {
  return {
    app: 'nastysha-emotions',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    logs,
  };
}

export function downloadExport(logs: DailyLog[]) {
  const data = buildExport(logs);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `emotions-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseImport(text: string): DailyLog[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Файл не является корректным JSON');
  }

  const rawLogs = Array.isArray(parsed)
    ? parsed
    : (parsed as { logs?: unknown })?.logs;

  if (!Array.isArray(rawLogs)) {
    throw new Error('В файле нет массива записей');
  }

  const result: DailyLog[] = [];
  for (const item of rawLogs) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const date = typeof r.date === 'string' ? r.date : (typeof r.id === 'string' ? r.id : null);
    if (!date || !DATE_RE.test(date)) continue;
    const emotions = Array.isArray(r.emotions) ? r.emotions.filter(e => typeof e === 'string') as string[] : [];
    result.push({
      id: date,
      date,
      emotions,
      cyclePhase: typeof r.cyclePhase === 'string' ? r.cyclePhase : undefined,
      note: typeof r.note === 'string' ? r.note : undefined,
      timestamp: typeof r.timestamp === 'number' ? r.timestamp : Date.now(),
    });
  }

  if (result.length === 0) {
    throw new Error('В файле не найдено валидных записей');
  }
  return result;
}
