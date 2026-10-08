import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

// node:sqlite is loaded through getBuiltinModule so the bundler leaves it alone.
const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

const globalForDb = globalThis as unknown as { kartDb?: DatabaseSyncType };

function open(): DatabaseSyncType {
  const file = process.env.DATABASE_PATH || "./data/kart.db";
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      uid TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    -- Card applications made through this site (orderNo is needed for delivery tracking).
    CREATE TABLE IF NOT EXISTS cards (
      user_bankcard_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      order_no TEXT,
      created_at INTEGER NOT NULL
    );

    -- Top-up / withdraw orders; requestOrderId must be unique per the API.
    CREATE TABLE IF NOT EXISTS balance_orders (
      request_order_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_bankcard_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    -- Webhooks are retried up to 7 times; eventId de-duplicates them.
    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_bankcard_id TEXT,
      payload TEXT NOT NULL,
      received_at INTEGER NOT NULL
    );

    -- Pending 3DS challenges shown to the card holder.
    CREATE TABLE IF NOT EXISTS three_ds (
      event_id TEXT PRIMARY KEY,
      user_bankcard_id TEXT NOT NULL,
      verification_type TEXT NOT NULL,
      otp TEXT,
      auth_id TEXT,
      amount TEXT,
      currency TEXT,
      merchant_name TEXT,
      scene TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

export function db(): DatabaseSyncType {
  globalForDb.kartDb ??= open();
  return globalForDb.kartDb;
}

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  uid: string | null;
  created_at: number;
}

export interface CardRow {
  user_bankcard_id: string;
  user_id: number;
  product_id: number;
  order_no: string | null;
  created_at: number;
}

export interface ThreeDsRow {
  event_id: string;
  user_bankcard_id: string;
  verification_type: string;
  otp: string | null;
  auth_id: string | null;
  amount: string | null;
  currency: string | null;
  merchant_name: string | null;
  scene: string | null;
  status: string;
  created_at: number;
}
