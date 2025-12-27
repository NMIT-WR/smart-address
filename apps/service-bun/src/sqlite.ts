import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { Database } from "bun:sqlite"

export type AddressSqliteConfig = {
  readonly path?: string
}

const defaultDbPath = "data/smart-address.db"

const resolveDbPath = (path: string | undefined) =>
  path ? resolve(path) : resolve(process.cwd(), defaultDbPath)

const applyPragmas = (db: Database) => {
  db.exec("PRAGMA journal_mode=WAL;")
  db.exec("PRAGMA synchronous=FULL;")
  db.exec("PRAGMA foreign_keys=ON;")
  db.exec("PRAGMA busy_timeout=5000;")
}

const migrate = (db: Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS address_cache (
      key TEXT PRIMARY KEY,
      stored_at INTEGER NOT NULL,
      stale_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      entry_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS address_search_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      query_text TEXT NOT NULL,
      query_normalized TEXT NOT NULL,
      strategy TEXT NOT NULL,
      limit_value INTEGER,
      country_code TEXT,
      locale TEXT,
      session_token TEXT,
      result_count INTEGER NOT NULL,
      error_count INTEGER NOT NULL,
      cache_key TEXT NOT NULL,
      result_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_address_cache_expires
      ON address_cache (expires_at);

    CREATE INDEX IF NOT EXISTS idx_address_search_log_created_at
      ON address_search_log (created_at);

    CREATE INDEX IF NOT EXISTS idx_address_search_log_query
      ON address_search_log (query_normalized);
  `)
}

export const openAddressSqlite = (config: AddressSqliteConfig = {}) => {
  const dbPath = resolveDbPath(config.path)
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  applyPragmas(db)
  migrate(db)
  return { db, path: dbPath }
}
