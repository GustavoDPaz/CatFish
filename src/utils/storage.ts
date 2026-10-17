import type { Transaction, Debt, BudgetLimit, UserProfile, FinancialGoal, AuthUser } from '../types';

const STORAGE_KEYS = {
  USERS: 'catfish_users_registry_v1',
  ACTIVE_USER: 'catfish_active_user_v1',
  TRANSACTIONS: 'catfish_transactions_v1',
  DEBTS: 'catfish_debts_v1',
  BUDGETS: 'catfish_budgets_v1',
  PROFILE: 'catfish_profile_v1',
  CARDS: 'catfish_goals_v1',
};

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
  { category: 'Moradia', limit: 2500, icon: 'Home' },
  { category: 'Alimentação', limit: 1200, icon: 'Utensils' },
  { category: 'Educação & Cursos', limit: 600, icon: 'Zap' },
  { category: 'Transporte', limit: 500, icon: 'Compass' },
  { category: 'Lazer', limit: 800, icon: 'Gamepad2' },
  { category: 'Saúde', limit: 400, icon: 'HeartPulse' },
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    description: 'Salário Mensal',
    amount: 7500,
    type: 'receita',
    category: 'Salário',
    account: 'Conta Corrente',
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
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'tx-3',
    description: 'Aluguel & Condomínio',
    amount: 2200,
    type: 'despesa',
    category: 'Moradia',
    account: 'Conta Corrente',
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
    date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'tx-5',
    description: 'Cursos & Livros',
    amount: 320,
    type: 'despesa',
    category: 'Educação & Cursos',
    account: 'Conta Corrente',
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'tx-6',
    description: 'Combustível & Transporte',
    amount: 280,
    type: 'despesa',
    category: 'Transporte',
    account: 'Cartão de Crédito',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'tx-7',
    description: 'Reserva de Emergência',
    amount: 1500,
    type: 'reserva',
    category: 'Reserva de Emergência',
    account: 'Reserva de Emergência',
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

export const DEFAULT_CARDS: FinancialGoal[] = [
  {
    id: 'goal-1',
    cardNo: '001',
    name: 'Quitação Total de Dívidas',
    rank: 'Alta',
    description: 'Elimine qualquer pendência financeira ou compra parcelada ativa.',
    objective: 'Quitar 100% de faturas ou empréstimos ativos.',
    unlocked: true,
    rewardText: 'Tranquilidade e proteção do fluxo mensal',
    targetAmount: 2000,
    currentAmount: 2000,
  },
  {
    id: 'goal-2',
    cardNo: '002',
    name: 'Reserva de Emergência (Meta R$ 5.000)',
    rank: 'Alta',
    description: 'Construa uma base sólida para cobrir imprevistos sem recorrer a crédito.',
    objective: 'Acumular mais de R$ 5.000 na reserva de emergência.',
    unlocked: false,
    rewardText: 'Estabilidade e segurança patrimonial',
    targetAmount: 5000,
    currentAmount: 1500,
  },
  {
    id: 'goal-3',
    cardNo: '003',
    name: 'Mês no Azul (Balanço Positivo)',
    rank: 'Média',
    description: 'Mantenha o controle mensal fechando com receita superior às despesas.',
    objective: 'Terminar o mês com saldo positivo de pelo menos R$ 2.000.',
    unlocked: true,
    rewardText: 'Consistência no planejamento orçamentário',
    targetAmount: 2000,
    currentAmount: 2000,
  },
  {
    id: 'goal-4',
    cardNo: '004',
    name: 'Orçamento Sob Controle',
    rank: 'Normal',
    description: 'Acompanhe todas as despesas categorizadas no mês.',
    objective: 'Cadastrar mais de 5 lançamentos categorizados.',
    unlocked: true,
    rewardText: 'Visão clara dos hábitos de consumo',
    targetAmount: 5,
    currentAmount: 6,
  },
];

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
    storage.saveCards(DEFAULT_CARDS);

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
    try {
      const activeUser = storage.getActiveUser();
      const key = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS);
      const data = localStorage.getItem(key);
      if (!data) {
        if (!activeUser || activeUser.id === 'usr-felipe-default') {
          const legacy = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
          if (legacy) return JSON.parse(legacy);
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
      }));
    } catch {
      return [];
    }
  },
  saveTransactions: (txs: Transaction[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.TRANSACTIONS);
    localStorage.setItem(key, JSON.stringify(txs));
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
  },

  getBudgets: (): BudgetLimit[] => {
    try {
      const key = getUserStorageKey(STORAGE_KEYS.BUDGETS);
      const data = localStorage.getItem(key);
      if (!data) {
        const legacy = localStorage.getItem(STORAGE_KEYS.BUDGETS);
        if (legacy) return JSON.parse(legacy);
        return DEFAULT_BUDGETS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_BUDGETS;
    }
  },
  saveBudgets: (b: BudgetLimit[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.BUDGETS);
    localStorage.setItem(key, JSON.stringify(b));
  },

  getCards: (): FinancialGoal[] => {
    try {
      const key = getUserStorageKey(STORAGE_KEYS.CARDS);
      const data = localStorage.getItem(key);
      if (!data) {
        const legacy = localStorage.getItem(STORAGE_KEYS.CARDS);
        if (legacy) return JSON.parse(legacy);
        return DEFAULT_CARDS;
      }
      const list: FinancialGoal[] = JSON.parse(data);
      return list.map((c) => ({
        ...c,
        imageUrl: c.imageUrl && !c.imageUrl.includes('potclean') ? c.imageUrl : undefined,
      }));
    } catch {
      return DEFAULT_CARDS;
    }
  },
  saveCards: (c: FinancialGoal[]) => {
    const key = getUserStorageKey(STORAGE_KEYS.CARDS);
    localStorage.setItem(key, JSON.stringify(c));
  },

  exportBackup: () => {
    const backup = {
      user: storage.getActiveUser(),
      transactions: storage.getTransactions(),
      debts: storage.getDebts(),
      profile: storage.getProfile(),
      budgets: storage.getBudgets(),
      cards: storage.getCards(),
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
      return true;
    } catch (e) {
      console.error('Failed to parse backup', e);
      return false;
    }
  },

  resetAll: () => {
    localStorage.clear();
  }
};
