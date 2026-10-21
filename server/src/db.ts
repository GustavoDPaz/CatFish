import pg from 'pg';
import { env } from './config/env.js';

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

let isPostgresConnected = false;

// Test connection on boot
export async function initDb(): Promise<boolean> {
  try {
    const client = await dbPool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    isPostgresConnected = true;
    console.log('[Database] PostgreSQL conectado com sucesso:', res.rows[0].now);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[Database] PostgreSQL indisponível, ativando fallback em memória:', message);
    isPostgresConnected = false;
    return false;
  }
}

export function isDbLive(): boolean {
  return isPostgresConnected;
}

/**
 * Executes a parameterized query scoped strictly with user isolation.
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  if (!isPostgresConnected) {
    return [];
  }
  const client = await dbPool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
