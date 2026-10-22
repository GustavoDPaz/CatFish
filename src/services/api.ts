import type { ConsolidatedBalances, CreditCardsSummary, BankConnection, ChatMessage } from '../types';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && !envUrl.includes('localhost:3001')) {
    return `${envUrl.replace(/\/+$/, '')}/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

// Fallback in-memory state when server container is not active in dev
const localFallbackState = {
  balances: {
    consolidatedTotal: 0.00,
    accounts: [],
    lastUpdated: new Date().toISOString(),
  } as ConsolidatedBalances,

  cards: {
    consolidated: {
      totalLimit: 0.00,
      totalUsed: 0.00,
      totalAvailable: 0.00,
      usagePercent: 0,
    },
    cards: [],
  } as CreditCardsSummary,

  connections: [] as BankConnection[],
};

export const api = {
  /**
   * Get connect token for Open Finance widget
   */
  async getConnectToken(): Promise<{ connectToken?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/open-finance/connect-token`, { credentials: 'omit' });
      const data = await res.json();
      if (res.ok && data.connectToken) {
        return { connectToken: data.connectToken };
      }
      return { error: data.error || data.message || 'Token não gerado pela Pluggy.' };
    } catch {
      return { error: 'Não foi possível conectar ao servidor do CatFish.' };
    }
  },

  /**
   * Link new bank connection via itemId
   */
  async saveConnection(itemId: string, institutionName: string, institutionId: string): Promise<BankConnection> {
    try {
      const res = await fetch(`${API_BASE}/open-finance/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, institutionName, institutionId }),
      });
      if (res.ok) {
        return (await res.json()) as BankConnection;
      }
    } catch {}

    const mockConn: BankConnection = {
      id: `conn-${Date.now()}`,
      provider: 'pluggy',
      itemId,
      institutionId,
      institutionName,
      status: 'ACTIVE',
      lastSyncedAt: new Date().toISOString(),
    };
    localFallbackState.connections.push(mockConn);
    return mockConn;
  },

  /**
   * List user's bank connections
   */
  async getConnections(): Promise<BankConnection[]> {
    try {
      const res = await fetch(`${API_BASE}/open-finance/connections`);
      if (res.ok) {
        const data = await res.json();
        return data.connections;
      }
    } catch {}
    return localFallbackState.connections;
  },

  /**
   * Delete or disconnect bank connection
   */
  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/open-finance/connections/${connectionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        localFallbackState.connections = localFallbackState.connections.filter((c) => c.id !== connectionId && c.itemId !== connectionId);
        return true;
      }
    } catch {}
    localFallbackState.connections = localFallbackState.connections.filter((c) => c.id !== connectionId && c.itemId !== connectionId);
    return true;
  },

  /**
   * Trigger on-demand sync with debounce
   */
  async syncOpenFinance(): Promise<{ success: boolean; balances?: ConsolidatedBalances; cards?: CreditCardsSummary; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/open-finance/sync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Limite de taxa excedido.' };
      }
      return { success: true, balances: data.balances, cards: data.cards };
    } catch {
      // Local fallback simulation
      await new Promise((r) => setTimeout(r, 600));
      localFallbackState.balances.lastUpdated = new Date().toISOString();
      return {
        success: true,
        balances: localFallbackState.balances,
        cards: localFallbackState.cards,
      };
    }
  },

  /**
   * Fetch consolidated and individual account balances
   */
  async getConsolidatedBalances(): Promise<ConsolidatedBalances> {
    try {
      const res = await fetch(`${API_BASE}/open-finance/balances`);
      if (res.ok) {
        return (await res.json()) as ConsolidatedBalances;
      }
    } catch {}
    return localFallbackState.balances;
  },

  /**
   * Fetch consolidated and individual credit card limits
   */
  async getCreditCardsSummary(): Promise<CreditCardsSummary> {
    try {
      const res = await fetch(`${API_BASE}/open-finance/cards`);
      if (res.ok) {
        return (await res.json()) as CreditCardsSummary;
      }
    } catch {}
    return localFallbackState.cards;
  },

  /**
   * Send imported OFX transactions to server if available
   */
  async importOfxTransactions(accountName: string, transactions: any[], newBalance?: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/open-finance/import-ofx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountName, transactions, newBalance }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Send user message to Gemini Agent (Function Calling)
   */
  async sendChatMessage(message: string, history: ChatMessage[] = []): Promise<{ reply: string; toolsExecuted?: string[] }> {
    try {
      const formattedHistory = history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: formattedHistory }),
      });

      if (res.ok) {
        return (await res.json()) as { reply: string; toolsExecuted: string[] };
      }

      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || `Erro HTTP ${res.status}: ${res.statusText}`);
    } catch (err: any) {
      console.error('[OpenFinanceApi.sendChatMessage] Erro ao comunicar com API de IA:', err);
      throw err;
    }
  },
};
