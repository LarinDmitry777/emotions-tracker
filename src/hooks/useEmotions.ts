import { useState, useEffect, useCallback } from 'react';
import type { DailyLog } from '../types';
import { addDailyLog, getAllLogs, deleteLog, getLogById } from '../lib/db';

export function useEmotions() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllLogs();
      // sort descending by default (newest date first)
      setLogs(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error('Failed to load logs', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const saveDay = async (dateStr: string, emotions: string[], cyclePhase?: string, note?: string) => {
    const entry: DailyLog = {
      id: dateStr, // ID is YYYY-MM-DD
      date: dateStr,
      emotions,
      cyclePhase,
      note,
      timestamp: Date.now(),
    };
    await addDailyLog(entry);
    await loadLogs();
  };

  const removeLog = async (id: string) => {
    await deleteLog(id);
    await loadLogs();
  };

  return { logs, loading, saveDay, removeLog, getLogById, reload: loadLogs };
}
