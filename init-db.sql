-- ============================================================================
-- CatFish - PostgreSQL Initialization & Multi-tenant Schema
-- Baseado no Plano de Arquitetura em Nuvem Aprovado
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE USUÁRIOS E AUTENTICAÇÃO
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    financial_title VARCHAR(80) DEFAULT 'Planejamento Pessoal',
    theme_preference VARCHAR(10) DEFAULT 'light',
    sound_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. TABELA DE SESSÕES & REFRESH TOKENS
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

-- 2.5 TABELA DE CONEXÕES OPEN FINANCE (AGREGADOR PLUGGY / BELVO)
CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);

-- 3. CONTAS E CARTEIRAS FINANCEIRAS
DO $$ BEGIN
    CREATE TYPE account_type_enum AS ENUM ('checking', 'wallet', 'credit_card', 'emergency_fund', 'investment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE CASCADE,
    external_account_id VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    institution_name VARCHAR(100),
    account_type account_type_enum NOT NULL,
    subtype VARCHAR(30) DEFAULT 'CHECKING',
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    credit_limit NUMERIC(14, 2) DEFAULT 0.00,
    used_limit NUMERIC(14, 2) DEFAULT 0.00,
    available_limit NUMERIC(14, 2) DEFAULT 0.00,
    closing_day INT CHECK (closing_day BETWEEN 1 AND 31),
    due_day INT CHECK (due_day BETWEEN 1 AND 31),
    color VARCHAR(20) DEFAULT '#10b981',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_conn ON accounts(bank_connection_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_conn_external ON accounts(bank_connection_id, external_account_id)
WHERE bank_connection_id IS NOT NULL;

-- 4. CATEGORIAS DE RECEITAS E DESPESAS
DO $$ BEGIN
    CREATE TYPE category_type_enum AS ENUM ('income', 'expense', 'transfer', 'investment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    category_type category_type_enum NOT NULL,
    icon VARCHAR(40) DEFAULT 'Tag',
    color VARCHAR(20) DEFAULT '#3b82f6',
    is_system_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- 5. TRANSAÇÕES E LANÇAMENTOS CONTÁBEIS (COM IDEMPOTÊNCIA OPEN FINANCE)
DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense', 'transfer', 'reserve_deposit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    type transaction_type_enum NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    notes TEXT,
    external_provider_id VARCHAR(150),
    raw_provider_category VARCHAR(100),
    status VARCHAR(20) DEFAULT 'SETTLED',
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tx_external_provider_id ON transactions(external_provider_id)
WHERE external_provider_id IS NOT NULL;

-- 6. DÍVIDAS, PARCELAMENTOS E AMORTIZAÇÃO
DO $$ BEGIN
    CREATE TYPE debt_status_enum AS ENUM ('active', 'paid_off', 'defaulted');
    CREATE TYPE debt_category_enum AS ENUM ('cartao_credito', 'cartao_rotativo', 'emprestimo', 'financiamento', 'outro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    category debt_category_enum NOT NULL DEFAULT 'cartao_credito',
    principal_amount NUMERIC(14, 2) NOT NULL CHECK (principal_amount > 0),
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    installments_count INT NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
    monthly_installment_value NUMERIC(14, 2) NOT NULL,
    monthly_interest_rate NUMERIC(5, 4) DEFAULT 0.0000,
    start_date DATE NOT NULL,
    status debt_status_enum NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);

CREATE TABLE IF NOT EXISTS debt_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    paid_date DATE,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_debt ON debt_installments(debt_id);

-- 7. ORÇAMENTOS MENSAIS (Teto de Gastos)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    monthly_limit NUMERIC(14, 2) NOT NULL CHECK (monthly_limit > 0),
    alert_threshold_pct INT DEFAULT 80 CHECK (alert_threshold_pct BETWEEN 10 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_category_budget UNIQUE (user_id, category_id)
);

-- 8. METAS FINANCEIRAS E CONQUISTAS
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_number VARCHAR(10) NOT NULL,
    title VARCHAR(120) NOT NULL,
    rank_badge VARCHAR(10) DEFAULT 'A',
    description TEXT,
    objective TEXT,
    target_amount NUMERIC(14, 2) CHECK (target_amount > 0),
    current_amount NUMERIC(14, 2) DEFAULT 0.00 CHECK (current_amount >= 0),
    image_url TEXT,
    is_completed BOOLEAN DEFAULT false,
    deadline_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON financial_goals(user_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
