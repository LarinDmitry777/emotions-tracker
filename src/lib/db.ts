import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { DailyLog } from '../types';

interface EmotionDB extends DBSchema {
  dailyLogs: {
    key: string;
    value: DailyLog;
    indexes: { 'by-date': string };
  };
}

let dbPromise: Promise<IDBPDatabase<EmotionDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<EmotionDB>('EmotionTrackerV2', 1, {
      upgrade(db) {
        const logStore = db.createObjectStore('dailyLogs', {
          keyPath: 'id',
        });
        logStore.createIndex('by-date', 'date');
      },
    });
  }
  return dbPromise;
};

export const addDailyLog = async (entry: DailyLog) => {
  const db = await initDB();
  return db.put('dailyLogs', entry);
};

export const getAllLogs = async (): Promise<DailyLog[]> => {
  const db = await initDB();
  return db.getAllFromIndex('dailyLogs', 'by-date');
};

export const getLogById = async (id: string): Promise<DailyLog | undefined> => {
  const db = await initDB();
  return db.get('dailyLogs', id);
}

export const deleteLog = async (id: string) => {
  const db = await initDB();
  return db.delete('dailyLogs', id);
};
