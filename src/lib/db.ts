import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

type GlobalDb = typeof globalThis & {
  __voteTrackerDb?: Database.Database;
};

const globalDb = globalThis as GlobalDb;

const initDb = () => {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, "vote-tracker.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      closed_at TEXT,
      candidates_json TEXT
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL,
      voter_name TEXT NOT NULL,
      candidate_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(room_code) REFERENCES rooms(code)
    );

    CREATE INDEX IF NOT EXISTS votes_room_code_idx ON votes(room_code);
  `);
  return db;
};

export const getDb = () => {
  if (!globalDb.__voteTrackerDb) {
    globalDb.__voteTrackerDb = initDb();
  }
  return globalDb.__voteTrackerDb;
};
