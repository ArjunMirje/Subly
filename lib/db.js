import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Default to a folder inside the project for the DB
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'subly.db');
const db = new Database(dbPath);

// Initialize schema on the first load
export function initDB() {
  db.pragma('journal_mode = WAL');

  // 1. Create Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Add userId and autopayEnabled columns to existing tables if they don't exist
  const tables = ['subscriptions', 'coupons', 'notifications'];
  tables.forEach(table => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN userId INTEGER REFERENCES users(id)`);
    } catch (e) {
      // Column probably already exists, which is fine
    }
  });

  try {
    db.exec(`ALTER TABLE subscriptions ADD COLUMN autopayEnabled INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }

  // 3. Ensure tables are created if they don't exist at all
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      cost REAL NOT NULL,
      billingCycle TEXT NOT NULL,
      renewalDate TEXT NOT NULL,
      status TEXT NOT NULL,
      autopayEnabled INTEGER NOT NULL DEFAULT 0,
      url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      code TEXT NOT NULL,
      discount TEXT NOT NULL,
      expiryDate TEXT NOT NULL,
      service TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      isRead INTEGER DEFAULT 0,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);
}

// Call init to ensure tables exist
initDB();

export default db;
