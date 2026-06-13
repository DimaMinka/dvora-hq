import { Firestore } from '@google-cloud/firestore';
import { config } from './config.js';

let db;

export function getDb() {
  if (db) return db;

  console.log('[DB] Initializing Cloud Firestore...');
  db = new Firestore({
    projectId: config.gcpProjectId,
  });

  return db;
}

// Keep setupDatabase for compatibility with index.js startup sequence
export async function setupDatabase() {
  console.log('[DB] Firestore initialization complete (NoSQL mode).');
  return getDb();
}
