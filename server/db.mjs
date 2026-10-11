import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { MENU } from './menu.mjs'

const dbFile = process.env.DB_FILE || path.resolve('data', 'kanlungan.db')
if (dbFile !== ':memory:') mkdirSync(path.dirname(dbFile), { recursive: true })

export const db = new DatabaseSync(dbFile)
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id          TEXT PRIMARY KEY,
    category    TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    price       INTEGER NOT NULL CHECK (price >= 0),
    badge       TEXT,
    available   INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    code             TEXT NOT NULL UNIQUE,
    pickup_name      TEXT NOT NULL,
    mobile           TEXT NOT NULL,
    note             TEXT,
    student_discount INTEGER NOT NULL DEFAULT 0,
    subtotal         INTEGER NOT NULL,
    discount         INTEGER NOT NULL,
    total            INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'received'
                     CHECK (status IN ('received','preparing','ready','completed','cancelled')),
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id    TEXT NOT NULL REFERENCES menu_items(id),
    name       TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    quantity   INTEGER NOT NULL CHECK (quantity > 0)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    topic      TEXT,
    message    TEXT NOT NULL,
    handled    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`)

// Seed the menu (insert new items, keep any price edits made later in the DB).
const seed = db.prepare(
  `INSERT OR IGNORE INTO menu_items (id, category, name, description, price, badge, available)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
)
for (const m of MENU) {
  seed.run(m.id, m.category, m.name, m.description, m.price, m.badge ?? null, m.available === false ? 0 : 1)
}

/** Run fn inside a transaction; rolls back on throw. */
export function transaction(fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
