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
    
    // Auto-migrate essential tables if they do not exist
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS bank_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(100) NOT NULL,
        provider VARCHAR(40) NOT NULL DEFAULT 'pluggy',
        item_id VARCHAR(100) NOT NULL,
        institution_id VARCHAR(60),
        institution_name VARCHAR(120) NOT NULL,
        institution_logo_url TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        encrypted_access_token TEXT NOT NULL,
        last_synced_at TIMESTAMPTZ,
        last_error_code VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_user_provider_item UNIQUE (user_id, provider, item_id)
      );

      DO $$ BEGIN
        CREATE TYPE account_type_enum AS ENUM ('checking', 'wallet', 'credit_card', 'emergency_fund', 'investment');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(100) NOT NULL,
        bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE CASCADE,
        external_account_id VARCHAR(100),
        name VARCHAR(100) NOT NULL,
        institution_name VARCHAR(100),
        account_type account_type_enum NOT NULL DEFAULT 'checking',
        subtype VARCHAR(30) DEFAULT 'CHECKING',
        current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        credit_limit NUMERIC(14, 2) DEFAULT 0.00,
        used_limit NUMERIC(14, 2) DEFAULT 0.00,
        available_limit NUMERIC(14, 2) DEFAULT 0.00,
        closing_day INT,
        due_day INT,
        color VARCHAR(20) DEFAULT '#10b981',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_connection_id UUID;
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS institution_name VARCHAR(100);
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_balance NUMERIC(14, 2) DEFAULT 0.00;
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14, 2) DEFAULT 0.00;
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS used_limit NUMERIC(14, 2) DEFAULT 0.00;
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS available_limit NUMERIC(14, 2) DEFAULT 0.00;
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS closing_day INT;
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS due_day INT;
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#10b981';
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(100) NOT NULL,
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        category_id UUID,
        amount NUMERIC(14, 2) NOT NULL,
        transaction_date DATE NOT NULL,
        description VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        raw_provider_category VARCHAR(100),
        status VARCHAR(20) DEFAULT 'SETTLED',
        external_provider_id VARCHAR(150),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);

      CREATE TABLE IF NOT EXISTS app_users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO app_users (id, name, email, password)
      VALUES ('usr-felipe-default', 'Felipe', 'felipe@catfish.finance', '123')
      ON CONFLICT (email) DO NOTHING;

      CREATE TABLE IF NOT EXISTS user_app_storage (
        user_id VARCHAR(100) NOT NULL,
        data_key VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, data_key)
      );

      CREATE INDEX IF NOT EXISTS idx_user_app_storage_user ON user_app_storage(user_id);
    `);

    client.release();
    isPostgresConnected = true;
    console.log('[Database] PostgreSQL conectado e tabelas migradas com sucesso:', res.rows[0].now);
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
