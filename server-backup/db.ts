import { DatabaseSync } from "node:sqlite";
import path from "path";
import { logger } from "../lib/logger";
import { loadConfig } from "./lib/config";

const DB_PATH = process.env.SQLITE_DB_PATH ?? path.resolve(process.cwd(), "astrologer.db");

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    logger.info({ dbPath: DB_PATH }, "SQLite database opened");
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      name TEXT,
      birth_date TEXT,
      zodiac_sign TEXT,
      referral_code TEXT UNIQUE,
      referred_by INTEGER,
      free_horoscopes INTEGER NOT NULL DEFAULT 1,
      has_subscription INTEGER NOT NULL DEFAULT 0,
      subscription_expires TEXT,
      theme TEXT NOT NULL DEFAULT 'light',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS horoscopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'daily',
      content TEXT NOT NULL,
      zodiac_sign TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      payment_id TEXT,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      is_mock INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      bonus_granted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      level TEXT NOT NULL DEFAULT 'info',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  logger.info("SQLite schema initialized");
}

export function logAction(telegramId: number | null, action: string, details?: object, level: "info" | "warn" | "error" = "info"): void {
  try {
    const database = getDb();
    const stmt = database.prepare(
      `INSERT INTO logs (telegram_id, action, details, level) VALUES (?, ?, ?, ?)`
    );
    stmt.run(telegramId, action, details ? JSON.stringify(details) : null, level);
    logger.info({ telegramId, action, details, level }, `[BOT_LOG] ${action}`);
  } catch (err) {
    logger.error({ err, action }, "Failed to write action log");
  }
}
