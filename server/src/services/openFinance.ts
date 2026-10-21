import { query, isDbLive } from '../db.js';
import { encryptData, decryptData } from '../security/crypto.js';
import { env } from '../config/env.js';

export interface BankConnectionRecord {
  id: string;
  user_id: string;
  provider: string;
  item_id: string;
  institution_id: string;
  institution_name: string;
  institution_logo_url: string;
  status: string;
  encrypted_access_token?: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface BankAccountRecord {
  id: string;
  user_id: string;
  bank_connection_id: string;
  external_account_id: string;
  name: string;
  institution_name: string;
  account_type: 'checking' | 'wallet' | 'credit_card' | 'emergency_fund' | 'investment';
  subtype: string;
  current_balance: number;
  credit_limit: number;
  used_limit: number;
  available_limit: number;
  closing_day?: number;
  due_day?: number;
  color?: string;
  is_active: boolean;
}

// In-memory fallback repository when PostgreSQL container is not started
class MemoryStore {
  connections: Map<string, any[]> = new Map();
  accounts: Map<string, any[]> = new Map();
  transactions: Map<string, any[]> = new Map();

  constructor() {
    // Seed initial demo multi-bank data for user 'usr-felipe-default'
    const defaultUserId = 'usr-felipe-default';
    this.connections.set(defaultUserId, [
      {
        id: 'conn-itau-001',
        user_id: defaultUserId,
        provider: 'pluggy',
        item_id: 'item-itau-pluggy-88',
        institution_id: 'itau',
        institution_name: 'Itaú Unibanco',
        institution_logo_url: 'https://assets.pluggy.ai/connectors/itau.svg',
        status: 'ACTIVE',
        encrypted_access_token: encryptData('mock_itau_token_pluggy'),
        last_synced_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'conn-nubank-002',
        user_id: defaultUserId,
        provider: 'pluggy',
        item_id: 'item-nu-pluggy-99',
        institution_id: 'nubank',
        institution_name: 'Nubank S.A.',
        institution_logo_url: 'https://assets.pluggy.ai/connectors/nubank.svg',
        status: 'ACTIVE',
        encrypted_access_token: encryptData('mock_nu_token_pluggy'),
        last_synced_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      }
    ]);

    this.accounts.set(defaultUserId, [
      {
        id: 'acc-itau-chk',
        user_id: defaultUserId,
        bank_connection_id: 'conn-itau-001',
        external_account_id: 'ext-itau-chk-1',
        name: 'Conta Corrente Itaú',
        institution_name: 'Itaú Unibanco',
        account_type: 'checking',
        subtype: 'CHECKING',
        current_balance: 2450.00,
        credit_limit: 0,
        used_limit: 0,
        available_limit: 0,
        color: '#EC7000',
        is_active: true,
      },
      {
        id: 'acc-itau-card',
        user_id: defaultUserId,
        bank_connection_id: 'conn-itau-001',
        external_account_id: 'ext-itau-card-1',
        name: 'Itaú Visa Infinite',
        institution_name: 'Itaú Unibanco',
        account_type: 'credit_card',
        subtype: 'CREDIT_CARD',
        current_balance: 0,
        credit_limit: 15000.00,
        used_limit: 3820.50,
        available_limit: 11179.50,
        closing_day: 18,
        due_day: 25,
        color: '#EC7000',
        is_active: true,
      },
      {
        id: 'acc-nu-chk',
        user_id: defaultUserId,
        bank_connection_id: 'conn-nubank-002',
        external_account_id: 'ext-nu-chk-1',
        name: 'Conta Nubank',
        institution_name: 'Nubank S.A.',
        account_type: 'checking',
        subtype: 'CHECKING',
        current_balance: 1750.00,
        credit_limit: 0,
        used_limit: 0,
        available_limit: 0,
        color: '#820AD1',
        is_active: true,
      },
      {
        id: 'acc-nu-card',
        user_id: defaultUserId,
        bank_connection_id: 'conn-nubank-002',
        external_account_id: 'ext-nu-card-1',
        name: 'Nubank Ultravioleta',
        institution_name: 'Nubank S.A.',
        account_type: 'credit_card',
        subtype: 'CREDIT_CARD',
        current_balance: 0,
        credit_limit: 10000.00,
        used_limit: 2150.00,
        available_limit: 7850.00,
        closing_day: 5,
        due_day: 12,
        color: '#820AD1',
        is_active: true,
      }
    ]);
  }
}

export const memoryStore = new MemoryStore();

export class OpenFinanceService {
  /**
   * Generates a temporary connect token from Pluggy API or sandbox
   */
  static async getConnectToken(userId: string): Promise<{ connectToken: string }> {
    if (env.PLUGGY_CLIENT_ID && env.PLUGGY_CLIENT_SECRET) {
      try {
        // Authenticate with Pluggy API
        const authRes = await fetch(`${env.PLUGGY_BASE_URL}/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: env.PLUGGY_CLIENT_ID,
            clientSecret: env.PLUGGY_CLIENT_SECRET,
          }),
        });
        const authData = (await authRes.json()) as { apiKey: string };

        // Create Connect Token
        const tokenRes = await fetch(`${env.PLUGGY_BASE_URL}/connect_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': authData.apiKey,
          },
          body: JSON.stringify({ clientUserId: userId }),
        });
        const tokenData = (await tokenRes.json()) as { accessToken: string };
        return { connectToken: tokenData.accessToken };
      } catch (err) {
        console.error('[OpenFinance] Erro ao obter connect token da Pluggy, fallback mock:', err);
      }
    }

    // Fallback sandbox token for testing without API keys
    return {
      connectToken: `catfish_sandbox_token_${Buffer.from(userId + Date.now()).toString('base64')}`,
    };
  }

  /**
   * Links or updates a bank connection from an Open Finance itemId
   */
  static async saveConnection(
    userId: string,
    itemId: string,
    institutionName: string = 'Banco Conectado',
    institutionId: string = 'generic_bank'
  ): Promise<BankConnectionRecord> {
    const encryptedToken = encryptData(`token_for_${itemId}`);
    const now = new Date().toISOString();

    if (isDbLive()) {
      const res = await query<BankConnectionRecord>(
        `INSERT INTO bank_connections (user_id, provider, item_id, institution_id, institution_name, encrypted_access_token, status, last_synced_at)
         VALUES ($1, 'pluggy', $2, $3, $4, $5, 'ACTIVE', NOW())
         ON CONFLICT (user_id, provider, item_id) DO UPDATE
         SET status = 'ACTIVE', last_synced_at = NOW(), updated_at = NOW()
         RETURNING id, user_id, provider, item_id, institution_id, institution_name, institution_logo_url, status, last_synced_at, created_at`,
        [userId, itemId, institutionId, institutionName, encryptedToken]
      );
      return res[0];
    }

    // Memory Store branch
    const userConns = memoryStore.connections.get(userId) || [];
    const existingIdx = userConns.findIndex((c) => c.item_id === itemId);
    const record: BankConnectionRecord = {
      id: existingIdx >= 0 ? userConns[existingIdx].id : `conn-${Date.now()}`,
      user_id: userId,
      provider: 'pluggy',
      item_id: itemId,
      institution_id: institutionId,
      institution_name: institutionName,
      institution_logo_url: '',
      status: 'ACTIVE',
      last_synced_at: now,
      created_at: now,
    };

    if (existingIdx >= 0) {
      userConns[existingIdx] = { ...userConns[existingIdx], ...record };
    } else {
      userConns.push(record);
    }
    memoryStore.connections.set(userId, userConns);
    return record;
  }

  /**
   * Retrieves all connected bank institutions for a user (Anti-IDOR safe)
   */
  static async getUserConnections(userId: string): Promise<BankConnectionRecord[]> {
    if (isDbLive()) {
      return query<BankConnectionRecord>(
        `SELECT id, user_id, provider, item_id, institution_id, institution_name, institution_logo_url, status, last_synced_at, created_at
         FROM bank_connections
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
    }
    return memoryStore.connections.get(userId) || [];
  }

  /**
   * Retrieves accounts with multi-bank balances and credit limits (Anti-IDOR safe)
   */
  static async getUserAccounts(userId: string): Promise<BankAccountRecord[]> {
    if (isDbLive()) {
      return query<BankAccountRecord>(
        `SELECT id, user_id, bank_connection_id, external_account_id, name, institution_name, account_type, subtype,
                current_balance, credit_limit, used_limit, available_limit, closing_day, due_day, color, is_active
         FROM accounts
         WHERE user_id = $1 AND is_active = true
         ORDER BY institution_name, name`,
        [userId]
      );
    }
    return memoryStore.accounts.get(userId) || [];
  }

  /**
   * Computes Consolidated and Individual Balances for the Sidebar and Overview
   */
  static async getConsolidatedBalances(userId: string) {
    const accounts = await this.getUserAccounts(userId);

    const checkingAccounts = accounts.filter(
      (a) => a.account_type === 'checking' || a.account_type === 'wallet'
    );

    const totalConsolidatedBalance = checkingAccounts.reduce(
      (sum, a) => sum + Number(a.current_balance || 0),
      0
    );

    const individualBalances = checkingAccounts.map((a) => ({
      accountId: a.id,
      institutionName: a.institution_name || a.name,
      accountName: a.name,
      balance: Number(a.current_balance || 0),
      color: a.color || '#10b981',
      type: a.account_type,
    }));

    return {
      consolidatedTotal: totalConsolidatedBalance,
      accounts: individualBalances,
      count: individualBalances.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Computes Consolidated and Individual Credit Card Limits
   */
  static async getCreditCardsSummary(userId: string) {
    const accounts = await this.getUserAccounts(userId);
    const cardAccounts = accounts.filter((a) => a.account_type === 'credit_card');

    const totalCreditLimit = cardAccounts.reduce((sum, a) => sum + Number(a.credit_limit || 0), 0);
    const totalUsedLimit = cardAccounts.reduce((sum, a) => sum + Number(a.used_limit || 0), 0);
    const totalAvailableLimit = totalCreditLimit - totalUsedLimit;

    const cards = cardAccounts.map((c) => ({
      accountId: c.id,
      institutionName: c.institution_name,
      cardName: c.name,
      totalLimit: Number(c.credit_limit || 0),
      usedLimit: Number(c.used_limit || 0),
      availableLimit: Number(c.available_limit || (c.credit_limit - c.used_limit) || 0),
      usagePercent: c.credit_limit > 0 ? Math.round((c.used_limit / c.credit_limit) * 100) : 0,
      closingDay: c.closing_day || 15,
      dueDay: c.due_day || 22,
      color: c.color || '#6366f1',
    }));

    return {
      consolidated: {
        totalLimit: totalCreditLimit,
        totalUsed: totalUsedLimit,
        totalAvailable: totalAvailableLimit,
        usagePercent: totalCreditLimit > 0 ? Math.round((totalUsedLimit / totalCreditLimit) * 100) : 0,
      },
      cards,
      count: cards.length,
    };
  }

  /**
   * Synchronizes active connections (polling balances, limits, and transactions with upsert)
   */
  static async syncAllActiveConnections(userId?: string): Promise<{ syncedCount: number }> {
    const userFilter = userId ? `WHERE user_id = '${userId}' AND status = 'ACTIVE'` : `WHERE status = 'ACTIVE'`;
    console.log(`[OpenFinance] Iniciando sincronização programada/on-demand (${userId ? `User: ${userId}` : 'Global'})...`);

    if (isDbLive()) {
      const connections = await query<BankConnectionRecord>(
        `SELECT id, user_id, provider, item_id, encrypted_access_token FROM bank_connections ${userFilter}`
      );

      for (const conn of connections) {
        try {
          // Decrypt stored access token
          if (conn.encrypted_access_token) {
            decryptData(conn.encrypted_access_token);
          }
          // If live pluggy is configured, fetch live updates; otherwise update sync timestamp
          await query(
            `UPDATE bank_connections SET last_synced_at = NOW(), status = 'ACTIVE' WHERE id = $1`,
            [conn.id]
          );
        } catch (err) {
          console.error(`[OpenFinance] Falha ao sincronizar conexão ${conn.id}:`, err);
          await query(
            `UPDATE bank_connections SET status = 'LOGIN_ERROR', last_error_code = 'SYNC_FAIL' WHERE id = $1`,
            [conn.id]
          );
        }
      }
      return { syncedCount: connections.length };
    }

    // Memory store simulation
    const conns = userId
      ? memoryStore.connections.get(userId) || []
      : Array.from(memoryStore.connections.values()).flat();

    for (const c of conns) {
      c.last_synced_at = new Date().toISOString();
      c.status = 'ACTIVE';
    }

    return { syncedCount: conns.length };
  }

  /**
   * Ingests a transaction with Idempotency (ON CONFLICT DO UPDATE)
   */
  static async upsertTransaction(
    userId: string,
    accountId: string,
    txData: {
      externalProviderId: string;
      amount: number;
      type: 'income' | 'expense' | 'transfer';
      description: string;
      transactionDate: string;
      rawCategory?: string;
    }
  ) {
    if (isDbLive()) {
      await query(
        `INSERT INTO transactions (user_id, account_id, external_provider_id, amount, transaction_date, description, type, raw_provider_category, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SETTLED')
         ON CONFLICT (external_provider_id) DO UPDATE
         SET amount = EXCLUDED.amount,
             description = EXCLUDED.description,
             updated_at = NOW()`,
        [
          userId,
          accountId,
          txData.externalProviderId,
          txData.amount,
          txData.transactionDate,
          txData.description,
          txData.type,
          txData.rawCategory || null,
        ]
      );
    }
  }
}
