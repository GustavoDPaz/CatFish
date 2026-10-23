import type { Transaction, Debt, BudgetLimit, UserProfile, FinancialGoal, AuthUser, BankConfig, FinancialAccount } from '../types';

const STORAGE_KEYS = {
  USERS: 'catfish_users_registry_v1',
  ACTIVE_USER: 'catfish_active_user_v1',
  TRANSACTIONS: 'catfish_transactions_v1',
  DEBTS: 'catfish_debts_v1',
  BUDGETS: 'catfish_budgets_v1',
  PROFILE: 'catfish_profile_v1',
  CARDS: 'catfish_goals_v1',
  BANKS: 'catfish_bank_configs_v1',
  ACCOUNTS: 'catfish_accounts_v1',
};

export const DEFAULT_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'acc-checking-nubank',
    name: 'Conta Corrente & Cartão',
    institutionName: 'Nubank',
    type: 'checking',
    balance: 4200,
    hasCreditCard: true,
    creditLimit: 3500,
    closingDay: 5,
    dueDay: 12,
    color: '#820AD1',
    notes: 'Conta corrente Nubank com cartão de crédito integrado (limite de R$ 3.500,00, fechamento dia 5 e vencimento dia 12).',
    isDefault: true,
  },
  {
    id: 'acc-reserve-inter',
    name: 'Reserva de Emergência',
    institutionName: 'Banco Inter',
    type: 'emergency_fund',
    balance: 1500,
    creditLimit: 0,
    color: '#FF7A00',
    notes: 'Fundo de liquidez diária com rendimento de 100% do CDI guardado para imprevistos e segurança financeira.',
    isDefault: true,
  },
  {
    id: 'acc-wallet',
    name: 'Carteira Física',
    institutionName: 'Dinheiro em Mãos',
    type: 'wallet',
    balance: 1450,
    creditLimit: 0,
    color: '#10B981',
    notes: 'Dinheiro em espécie na carteira física para trocos e despesas imediatas.',
    isDefault: true,
  },
];

export const DEFAULT_BANKS: BankConfig[] = [
  { id: 'bank-nubank', name: 'Nubank', color: '#820AD1', creditCardLimit: 3500, closingDay: 5, dueDay: 12 },
  { id: 'bank-inter', name: 'Banco Inter', color: '#FF7A00', creditCardLimit: 2500, closingDay: 10, dueDay: 17 },
  { id: 'bank-itau', name: 'Itaú', color: '#EC7000', creditCardLimit: 5000, closingDay: 15, dueDay: 22 },
  { id: 'bank-bradesco', name: 'Bradesco', color: '#CC092F', creditCardLimit: 2000, closingDay: 20, dueDay: 27 },
  { id: 'bank-c6', name: 'C6 Bank', color: '#242424', creditCardLimit: 1500, closingDay: 8, dueDay: 15 },
  { id: 'bank-santander', name: 'Santander', color: '#EA1D2C', creditCardLimit: 3000, closingDay: 12, dueDay: 19 },
];

export const DEFAULT_USERS: AuthUser[] = [
  {
    id: 'usr-felipe-default',
    name: 'Felipe',
    email: 'felipe@catfish.finance',
    password: '123',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
];

function getUserStorageKey(baseKey: string): string {
  try {
    const rawActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (rawActive) {
      const user: AuthUser = JSON.parse(rawActive);
      if (user && user.id) {
        return `${baseKey}_usr_${user.id}`;
      }
    }
  } catch {}
  return baseKey;
}

// Helper to persist data remotely to PostgreSQL database
const persistToRemoteDb = (userId: string, key: string, payload: any) => {
  if (!userId) return;
  fetch(`/api/user-data/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, payload }),
  }).catch((err) => {
    console.debug('[Storage] Remote DB sync offline fallback:', err);
  });
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Felipe',
  title: 'Planejamento Pessoal',
  starLevel: 1,
  accountId: 'CF-2026-1920',
  hunterId: 'CF-2026-1920',
  maxDebtCapacity: 12000,
  maxAuraCapacity: 12000,
  financialProfile: 'Planejador',
  nenAffinity: 'Planejador',
  soundEnabled: true,
  bankName: 'Banco Principal',
  bankBalance: 4200,
  walletBalance: 1450,
  emergencyFundBalance: 1500,
  creditCardLimit: 5000,
  overdraftLimit: 1000,
  monthlyIncome: 7500,
};

export const DEFAULT_BUDGETS: BudgetLimit[] = [
  { category: 'Alimentação', limit: 1200, icon: 'Utensils' },
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    description: 'Salário Mensal',
    amount: 7500,
    type: 'receita',
    category: 'Salário',
    account: 'Conta Corrente',
    bankName: 'Itaú',
    date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
    recurring: true,
    notes: 'Depósito principal do mês',
  },
  {
    id: 'tx-2',
    description: 'Rendimento de Investimentos',
    amount: 1800,
    type: 'receita',
    category: 'Rendimentos Extras',
    account: 'Conta Corrente',
    bankName: 'Banco Inter',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'tx-3',
    description: 'Aluguel & Condomínio',
    amount: 2200,
    type: 'despesa',
    category: 'Moradia',
    account: 'Conta Corrente',
    bankName: 'Itaú',
    date: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString().split('T')[0],
    recurring: true,
  },
  {
    id: 'tx-4',
    description: 'Supermercado & Alimentação',
    amount: 850,
    type: 'despesa',
    category: 'Alimentação',
    account: 'Cartão de Crédito',
    bankName: 'Nubank',
    date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'tx-5',
    description: 'Cursos & Livros',
    amount: 320,
    type: 'despesa',
    category: 'Educação & Cursos',
    account: 'Conta Corrente',
    bankName: 'Banco Inter',
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'tx-6',
    description: 'Combustível & Transporte',
    amount: 280,
    type: 'despesa',
    category: 'Transporte',
    account: 'Cartão de Crédito',
    bankName: 'Nubank',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'tx-7',
    description: 'Reserva de Emergência',
    amount: 1500,
    type: 'reserva',
    category: 'Reserva de Emergência',
    account: 'Reserva de Emergência',
    bankName: 'Banco Inter',
    date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: 'Aporte mensal da reserva',
  },
];

export const DEFAULT_DEBTS: Debt[] = [
  {
    id: 'debt-1',
    title: 'Fatura do Cartão de Crédito',
    principalAmount: 1920,
    installmentsCount: 6,
    startMonth: new Date().toISOString().slice(0, 7),
    startDate: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
    category: 'cartao_credito',
    notes: 'Compra parcelada em 6x',
    status: 'active',
    paidAmount: 320,
  },
  {
    id: 'debt-2',
    title: 'Empréstimo Pessoal',
    principalAmount: 3200,
    installmentsCount: 10,
    startMonth: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 7),
    startDate: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString().split('T')[0],
    category: 'emprestimo',
    notes: 'Parcelamento em 10x',
    status: 'active',
    paidAmount: 640,
  },
];

export const DEFAULT_CARDS: FinancialGoal[] = [];

const sanitizeAccountName = (acc: string): string => {
  if (acc.includes('Conta Corrente Principal')) return 'Conta Corrente';
  if (acc.includes('Carteira Física')) return 'Carteira';
  if (acc.includes('Cartão de Crédito Black')) return 'Cartão de Crédito';
  if (acc.includes('Reserva de Emergência')) return 'Reserva de Emergência';
  return acc;
};

const sanitizeCategoryName = (cat: string): string => {
  if (cat.includes('Gourmet')) return 'Alimentação';
  if (cat.includes('Nen')) return 'Educação & Cursos';
  if (cat.includes('Dirigível')) return 'Transporte';
  if (cat.includes('Fórmulas')) return 'Saúde';
  if (cat.includes('Ten')) return 'Reserva de Emergência';
  return cat;
};

export const storage = {
  // --------------------------------------------------------------------------
  // User Authentication & Session Management
  // --------------------------------------------------------------------------
  getUsers: (): AuthUser[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  },

  getActiveUser: (): AuthUser | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setActiveUser: (user: AuthUser | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    }
  },

  registerUser: (name: string, email: string, password: string): { success: boolean; user?: AuthUser; error?: string } => {
    const users = storage.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim()) return { success: false, error: 'Nome completo é obrigatório.' };
    if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, error: 'Insira um email válido.' };
    if (!password || password.length < 3) return { success: false, error: 'A senha deve ter pelo menos 3 caracteres.' };

    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'Este email já está cadastrado. Tente entrar.' };
    }

    const newUser: AuthUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: cleanEmail,
      password: password,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    storage.setActiveUser(newUser);

    // Initialize custom clean profile for new user
    const userProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: newUser.name,
      accountId: `CF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      hunterId: `CF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      bankBalance: 0,
      walletBalance: 0,
      emergencyFundBalance: 0,
      creditCardLimit: 5000,
      maxDebtCapacity: 10000,
      maxAuraCapacity: 10000,
    };
    storage.saveProfile(userProfile);
    storage.saveTransactions([]);
    storage.saveDebts([]);
    storage.saveBudgets(DEFAULT_BUDGETS);
    storage.saveCards([]);
    storage.saveBankConfigs(DEFAULT_BANKS);
    storage.saveAccounts(DEFAULT_ACCOUNTS);

    // Register user and seed initial financial data in remote PostgreSQL database
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUser.name, email: newUser.email, password }),
    }).catch((err) => console.debug('[Auth] Remote register fallback:', err));

    storage.syncAllToRemote(newUser.id);

    return { success: true, user: newUser };
  },

  loginUser: (email: string, password: string): { success: boolean; user?: AuthUser; error?: string } => {
    const users = storage.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado. Verifique o email ou crie uma conta.' };
    }
    if (user.password && user.password !== password) {
      return { success: false, error: 'Senha incorreta. Tente novamente.' };
    }

    // Inform remote PostgreSQL backend
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    }).catch((err) => console.debug('[Auth] Remote login fallback:', err));

    storage.setActiveUser(user);
    return { success: true, user };
  },

  logout: () => {
    storage.setActiveUser(null);
  },

  // --------------------------------------------------------------------------
  // Financial Data Management (Isolated per Active User)
  // --------------------------------------------------------------------------
  getTransactions: (): Transaction[] => {
    const inferBankName = (t: Partial<Transaction>): string => {
      if (t.bankName) return t.bankName;
      const desc = (t.description || '').toLowerCase();
      const acc = (t.account || '').toLowerCase();
      if (acc.includes('cartão') || desc.includes('combustível') || desc.includes('supermercado')) return 'Nubank';
      if (desc.includes('salário') || desc.includes('aluguel') || desc.includes('condomínio')) return 'Itaú';
      if (desc.includes('investimento') || desc.includes('reserva') || desc.includes('curso') || desc.includes('livro')) return 'Banco Inter';
      return 'Nubank';
    };

    try {
      const activeUser = storage.getActiveUser();
      const key = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!activeUser || activeUser.id === 'usr-felipe-default') {
          const legacy = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
          if (legacy) {
            const list: Transaction[] = JSON.parse(legacy);
            return list.map((t) => ({
              ...t,
              bankName: t.bankName || inferBankName(t),
            }));
          }
          return DEFAULT_TRANSACTIONS;
        }
        return [];
      }
      const parsed: Transaction[] = JSON.parse(data);
      return parsed.map((t) => ({
        ...t,
        type: t.type === 'ren' ? 'receita' : t.type === 'ko' ? 'despesa' : t.type === 'ten' ? 'reserva' : t.type,
        account: sanitizeAccountName(t.account),
        category: sanitizeCategoryName(t.category),
        bankName: t.bankName || inferBankName(t),
      }));
    } catch {
      return [];
    }
  },
  saveTransactions: (txs: Transaction[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS);
    localStorage.setItem(key, JSON.stringify(txs));
    const active = storage.getActiveUser();
    if (active?.id) {
      persistToRemoteDb(active.id, 'transactions', txs);
    }
  },

  getDebts: (): Debt[] => {
    try {
      const activeUser = storage.getActiveUser();
      const key = getUserStorageKey(STORAGE_KEYS.DEBTS);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!activeUser || activeUser.id === 'usr-felipe-default') {
          const legacy = localStorage.getItem(STORAGE_KEYS.DEBTS);
          if (legacy) return JSON.parse(legacy);
          return DEFAULT_DEBTS;
        }
        return [];
      }
      const list: Debt[] = JSON.parse(data);
      return list.map((d) => ({
        ...d,
        installmentsCount: d.installmentsCount || (d.id === 'debt-1' ? 6 : d.id === 'debt-2' ? 10 : 1),
        startMonth: d.startMonth || (d.startDate ? d.startDate.slice(0, 7) : new Date().toISOString().slice(0, 7)),
      }));
    } catch {
      return [];
    }
  },
  saveDebts: (debts: Debt[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.DEBTS);
    localStorage.setItem(key, JSON.stringify(debts));
    const active = storage.getActiveUser();
    if (active?.id) {
      persistToRemoteDb(active.id, 'debts', debts);
    }
  },

  getProfile: (): UserProfile => {
    try {
      const activeUser = storage.getActiveUser();
      const key = getUserStorageKey(STORAGE_KEYS.PROFILE);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!activeUser || activeUser.id === 'usr-felipe-default') {
          const legacy = localStorage.getItem(STORAGE_KEYS.PROFILE);
          if (legacy) return JSON.parse(legacy);
          return DEFAULT_PROFILE;
        }
        return {
          ...DEFAULT_PROFILE,
          name: activeUser.name,
          bankBalance: 0,
          walletBalance: 0,
          emergencyFundBalance: 0,
          creditCardLimit: 5000,
        };
      }
      const parsed: Partial<UserProfile> = JSON.parse(data);
      const resolvedCapacity = typeof parsed.maxDebtCapacity === 'number' && !isNaN(parsed.maxDebtCapacity)
        ? parsed.maxDebtCapacity
        : (typeof parsed.maxAuraCapacity === 'number' && !isNaN(parsed.maxAuraCapacity) ? parsed.maxAuraCapacity : 10000);
      const resolvedAccountId = parsed.accountId || parsed.hunterId?.replace('HNT-', 'CF-').replace('USR-', 'CF-') || 'CF-2026-1920';

      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        accountId: resolvedAccountId,
        hunterId: resolvedAccountId,
        bankName: parsed.bankName || DEFAULT_PROFILE.bankName,
        bankBalance: typeof parsed.bankBalance === 'number' && !isNaN(parsed.bankBalance) ? parsed.bankBalance : 0,
        walletBalance: typeof parsed.walletBalance === 'number' && !isNaN(parsed.walletBalance) ? parsed.walletBalance : 0,
        emergencyFundBalance: typeof parsed.emergencyFundBalance === 'number' && !isNaN(parsed.emergencyFundBalance) ? parsed.emergencyFundBalance : 0,
        creditCardLimit: typeof parsed.creditCardLimit === 'number' && !isNaN(parsed.creditCardLimit) ? parsed.creditCardLimit : 5000,
        overdraftLimit: typeof parsed.overdraftLimit === 'number' && !isNaN(parsed.overdraftLimit) ? parsed.overdraftLimit : 0,
        monthlyIncome: typeof parsed.monthlyIncome === 'number' && !isNaN(parsed.monthlyIncome) ? parsed.monthlyIncome : 0,
        maxDebtCapacity: resolvedCapacity,
        maxAuraCapacity: resolvedCapacity,
        financialProfile: parsed.financialProfile || parsed.nenAffinity || 'Planejador',
        nenAffinity: parsed.financialProfile || parsed.nenAffinity || 'Planejador',
        title: parsed.title && !parsed.title.includes('Hunter') ? parsed.title : 'Planejamento Pessoal',
      };
    } catch {
      return DEFAULT_PROFILE;
    }
  },
  saveProfile: (p: UserProfile) => {
    const key = getUserStorageKey(STORAGE_KEYS.PROFILE);
    localStorage.setItem(key, JSON.stringify(p));
    const active = storage.getActiveUser();
    if (active?.id) {
      persistToRemoteDb(active.id, 'profile', p);
    }
  },

  getBudgets: (): BudgetLimit[] => {
    try {
      const activeUser = storage.getActiveUser();
      const key = getUserStorageKey(STORAGE_KEYS.BUDGETS);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!activeUser || activeUser.id === 'usr-felipe-default') {
          const legacy = localStorage.getItem(STORAGE_KEYS.BUDGETS);
          if (legacy) return JSON.parse(legacy);
          return DEFAULT_BUDGETS;
        }
        return DEFAULT_BUDGETS;
      }
      const list: BudgetLimit[] = JSON.parse(data);
      // Auto-migrate legacy 6 default categories to single 1 example if user has old default set
      if (list.length === 6 && list.some(b => b.category === 'Moradia' && b.limit === 2500) && list.some(b => b.category === 'Saúde' && b.limit === 400)) {
        storage.saveBudgets(DEFAULT_BUDGETS);
        return DEFAULT_BUDGETS;
      }
      return list;
    } catch {
      return DEFAULT_BUDGETS;
    }
  },
  saveBudgets: (b: BudgetLimit[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.BUDGETS);
    localStorage.setItem(key, JSON.stringify(b));
    const active = storage.getActiveUser();
    if (active?.id) {
      persistToRemoteDb(active.id, 'budgets', b);
    }
  },

  getCards: (): FinancialGoal[] => {
    try {
      const key = getUserStorageKey(STORAGE_KEYS.CARDS);
      const data = localStorage.getItem(key);
      if (!data) {
        const legacy = localStorage.getItem(STORAGE_KEYS.CARDS);
        if (legacy) return JSON.parse(legacy);
        return [];
      }
      const list: FinancialGoal[] = JSON.parse(data);
      // Auto-clean legacy default goals if user was initialized with the 4 default mock goals
      if (list.length === 4 && list.some(c => c.id === 'goal-1' && c.cardNo === '001') && list.some(c => c.id === 'goal-4' && c.cardNo === '004')) {
        storage.saveCards([]);
        return [];
      }
      return list.map((c) => ({
        ...c,
        imageUrl: c.imageUrl && !c.imageUrl.includes('potclean') ? c.imageUrl : undefined,
      }));
    } catch {
      return [];
    }
  },
  saveCards: (c: FinancialGoal[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.CARDS);
    localStorage.setItem(key, JSON.stringify(c));
    const active = storage.getActiveUser();
    if (active?.id) {
      persistToRemoteDb(active.id, 'cards', c);
    }
  },

  getBankConfigs: (): BankConfig[] => {
    try {
      const activeUser = storage.getActiveUser();
      const key = getUserStorageKey(STORAGE_KEYS.BANKS);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!activeUser || activeUser.id === 'usr-felipe-default') {
          const legacy = localStorage.getItem(STORAGE_KEYS.BANKS);
          if (legacy) return JSON.parse(legacy);
          return DEFAULT_BANKS;
        }
        return DEFAULT_BANKS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_BANKS;
    }
  },

  saveBankConfigs: (banks: BankConfig[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.BANKS);
    localStorage.setItem(key, JSON.stringify(banks));
    const active = storage.getActiveUser();
    if (active?.id) {
      persistToRemoteDb(active.id, 'bankConfigs', banks);
    }
  },

  getAccounts: (): FinancialAccount[] => {
    const normalizeAccounts = (list: FinancialAccount[]): FinancialAccount[] => {
      const checkingMap = new Map<string, FinancialAccount>();
      const otherAccounts: FinancialAccount[] = [];
      const cardsToMerge: FinancialAccount[] = [];

      list.forEach((acc) => {
        if (acc.type === 'checking') {
          const key = (acc.institutionName || 'banco').toLowerCase().trim();
          checkingMap.set(key, {
            ...acc,
            hasCreditCard: acc.hasCreditCard ?? (typeof acc.creditLimit === 'number' && acc.creditLimit > 0),
          });
        } else if (acc.type === 'credit_card') {
          cardsToMerge.push(acc);
        } else {
          otherAccounts.push(acc);
        }
      });

      // Merge standalone credit card accounts into matching checking accounts, or convert to checking with credit card
      cardsToMerge.forEach((card) => {
        const instKey = (card.institutionName || 'banco').toLowerCase().trim();
        const existingChecking = checkingMap.get(instKey);
        if (existingChecking) {
          existingChecking.hasCreditCard = true;
          existingChecking.creditLimit = card.creditLimit || existingChecking.creditLimit || 3500;
          existingChecking.closingDay = card.closingDay || existingChecking.closingDay || 5;
          existingChecking.dueDay = card.dueDay || existingChecking.dueDay || 12;
          if (card.notes && !existingChecking.notes?.includes(card.notes)) {
            existingChecking.notes = `${existingChecking.notes || ''} • Cartão: ${card.notes}`.trim();
          }
        } else {
          const converted: FinancialAccount = {
            ...card,
            type: 'checking',
            hasCreditCard: true,
            name: card.name.toLowerCase().includes('cartão') ? `${card.institutionName} (Conta & Cartão)` : card.name,
            creditLimit: card.creditLimit || 3500,
            closingDay: card.closingDay || 5,
            dueDay: card.dueDay || 12,
          };
          checkingMap.set(instKey, converted);
        }
      });

      return [...Array.from(checkingMap.values()), ...otherAccounts];
    };

    try {
      const activeUser = storage.getActiveUser();
      const key = getUserStorageKey(STORAGE_KEYS.ACCOUNTS);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!activeUser || activeUser.id === 'usr-felipe-default') {
          const legacy = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
          if (legacy) return normalizeAccounts(JSON.parse(legacy));
        }
        // Initialize from profile if available
        const p = storage.getProfile();
        const initial: FinancialAccount[] = [
          {
            id: 'acc-checking-nubank',
            name: 'Conta Corrente & Cartão',
            institutionName: p.bankName || 'Nubank',
            type: 'checking',
            balance: typeof p.bankBalance === 'number' ? p.bankBalance : 4200,
            hasCreditCard: true,
            creditLimit: typeof p.creditCardLimit === 'number' ? p.creditCardLimit : 3500,
            closingDay: 5,
            dueDay: 12,
            color: '#820AD1',
            notes: 'Conta corrente com cartão de crédito integrado.',
            isDefault: true,
          },
          {
            id: 'acc-reserve-inter',
            name: 'Reserva de Emergência',
            institutionName: 'Banco Inter',
            type: 'emergency_fund',
            balance: typeof p.emergencyFundBalance === 'number' ? p.emergencyFundBalance : 1500,
            creditLimit: 0,
            color: '#FF7A00',
            notes: 'Fundo de liquidez diária com rendimento de 100% do CDI guardado para segurança financeira.',
            isDefault: true,
          },
          {
            id: 'acc-wallet',
            name: 'Carteira Física',
            institutionName: 'Dinheiro em Mãos',
            type: 'wallet',
            balance: typeof p.walletBalance === 'number' ? p.walletBalance : 1450,
            creditLimit: 0,
            color: '#10B981',
            notes: 'Dinheiro em espécie na carteira física para trocos e pequenas despesas cotidianas.',
            isDefault: true,
          },
        ];
        storage.saveAccounts(initial);
        return initial;
      }
      return normalizeAccounts(JSON.parse(data));
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  },

  saveAccounts: (accounts: FinancialAccount[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.ACCOUNTS);
    localStorage.setItem(key, JSON.stringify(accounts));
    const active = storage.getActiveUser();
    if (active?.id) {
      persistToRemoteDb(active.id, 'accounts', accounts);
    }

    // Keep profile metrics seamlessly in sync with the sum of accounts
    try {
      const profileKey = getUserStorageKey(STORAGE_KEYS.PROFILE);
      const existingProfileData = localStorage.getItem(profileKey);
      if (existingProfileData) {
        const p: UserProfile = JSON.parse(existingProfileData);
        const checkingSum = accounts.filter(a => a.type === 'checking').reduce((acc, a) => acc + (a.balance || 0), 0);
        const walletSum = accounts.filter(a => a.type === 'wallet').reduce((acc, a) => acc + (a.balance || 0), 0);
        const reserveSum = accounts.filter(a => a.type === 'emergency_fund').reduce((acc, a) => acc + (a.balance || 0), 0);
        const cardLimitSum = accounts
          .filter(a => (a.type === 'checking' && a.hasCreditCard) || a.type === 'credit_card')
          .reduce((acc, a) => acc + (a.creditLimit || 0), 0);
        const firstChecking = accounts.find(a => a.type === 'checking');
        
        p.bankBalance = checkingSum;
        p.walletBalance = walletSum;
        p.emergencyFundBalance = reserveSum;
        p.creditCardLimit = cardLimitSum;
        if (firstChecking) p.bankName = firstChecking.institutionName;
        localStorage.setItem(profileKey, JSON.stringify(p));
      }
    } catch {}
  },

  exportBackup: () => {
    const backup = {
      user: storage.getActiveUser(),
      transactions: storage.getTransactions(),
      debts: storage.getDebts(),
      profile: storage.getProfile(),
      budgets: storage.getBudgets(),
      cards: storage.getCards(),
      banks: storage.getBankConfigs(),
      accounts: storage.getAccounts(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catfish_finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.transactions) storage.saveTransactions(parsed.transactions);
      if (parsed.debts) storage.saveDebts(parsed.debts);
      if (parsed.profile) storage.saveProfile(parsed.profile);
      if (parsed.budgets) storage.saveBudgets(parsed.budgets);
      if (parsed.cards) storage.saveCards(parsed.cards);
      if (parsed.banks) storage.saveBankConfigs(parsed.banks);
      if (parsed.accounts) storage.saveAccounts(parsed.accounts);
      return true;
    } catch (e) {
      console.error('Failed to parse backup', e);
      return false;
    }
  },

  syncFromRemote: async (userId: string): Promise<Record<string, any> | null> => {
    if (!userId) return null;
    try {
      const res = await fetch(`/api/user-data/${encodeURIComponent(userId)}`);
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.success || !json.data) return null;
      const remote = json.data;

      const userPrefix = `catfish_${userId}_`;
      if (remote.accounts && Array.isArray(remote.accounts)) {
        localStorage.setItem(`${userPrefix}accounts`, JSON.stringify(remote.accounts));
      }
      if (remote.transactions && Array.isArray(remote.transactions)) {
        localStorage.setItem(`${userPrefix}transactions`, JSON.stringify(remote.transactions));
      }
      if (remote.debts && Array.isArray(remote.debts)) {
        localStorage.setItem(`${userPrefix}debts`, JSON.stringify(remote.debts));
      }
      if (remote.budgets && Array.isArray(remote.budgets)) {
        localStorage.setItem(`${userPrefix}budgets`, JSON.stringify(remote.budgets));
      }
      if (remote.cards && Array.isArray(remote.cards)) {
        localStorage.setItem(`${userPrefix}cards`, JSON.stringify(remote.cards));
      }
      if (remote.profile && typeof remote.profile === 'object') {
        localStorage.setItem(`${userPrefix}profile`, JSON.stringify(remote.profile));
      }
      if (remote.bankConfigs && Array.isArray(remote.bankConfigs)) {
        localStorage.setItem(`${userPrefix}banks`, JSON.stringify(remote.bankConfigs));
      }

      return remote;
    } catch (err) {
      console.debug('[Storage] syncFromRemote fallback to local storage:', err);
      return null;
    }
  },

  syncAllToRemote: async (userId: string) => {
    if (!userId) return;
    try {
      const accounts = storage.getAccounts();
      const transactions = storage.getTransactions();
      const debts = storage.getDebts();
      const budgets = storage.getBudgets();
      const cards = storage.getCards();
      const profile = storage.getProfile();
      const bankConfigs = storage.getBankConfigs();

      await fetch(`/api/user-data/${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            accounts,
            transactions,
            debts,
            budgets,
            cards,
            profile,
            bankConfigs,
          },
        }),
      });
    } catch (err) {
      console.debug('[Storage] syncAllToRemote fallback:', err);
    }
  },

  resetAll: () => {
    localStorage.clear();
  }
};
