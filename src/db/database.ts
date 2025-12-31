import { open } from 'react-native-quick-sqlite';

const dbName = 'notes.db';

let db: ReturnType<typeof open> | null = null;

export const getDatabase = () => {
  if (!db) {
    db = open({
      name: dbName,
      location: 'default',
    });

    // Create notes table if it doesn't exist
    db.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0
      )
    `);

    // Create index for faster queries
    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)
    `);
  }
  return db;
};

export const closeDatabase = () => {
  if (db) {
    db.close();
    db = null;
  }
};

