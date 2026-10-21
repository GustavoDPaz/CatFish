import React, { useState, useEffect } from 'react';
import './App.css';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { AprManagerView } from './components/AprManagerView';
import { EnRadarView } from './components/EnRadarView';
import { GreedIslandView } from './components/GreedIslandView';
import { ProfileModal } from './components/HunterLicenseModal';
import { DebtAlertModal } from './components/ZetsuAlertModal';
import { AuthView } from './components/AuthView';
import { BalanceBreakdownPopover } from './components/BalanceBreakdownPopover';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { OpenFinanceModal } from './components/OpenFinanceModal';
import { storage } from './utils/storage';
import { audioManager } from './utils/audio';
import { api } from './services/api';
import type { 
  Transaction, 
  Debt, 
  BudgetLimit, 
  UserProfile, 
  FinancialGoal, 
  TransactionType, 
  AuthUser,
  ConsolidatedBalances,
  CreditCardsSummary,
  BankConnection,
} from './types';
import { X } from 'lucide-react';

export const App: React.FC = () => {
  // Theme state: 'light' | 'dark' (Defaulting to light mode with full dark mode support)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('catfish_theme') || localStorage.getItem('hunter_theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  // Collapsible Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('catfish_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('catfish_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  // Active Authenticated User Session
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => storage.getActiveUser());

  const handleLogout = () => {
    storage.logout();
    setCurrentUser(null);
  };

  const [profile, setProfile] = useState<UserProfile>(() => storage.getProfile());
  const [transactions, setTransactions] = useState<Transaction[]>(() => storage.getTransactions());
  const [debts, setDebts] = useState<Debt[]>(() => storage.getDebts());
  const [budgets, setBudgets] = useState<BudgetLimit[]>(() => storage.getBudgets());
  const [cards, setCards] = useState<FinancialGoal[]>(() => storage.getCards());

  const [activeTab, setActiveTab] = useState<'dashboard' | 'apr' | 'transactions' | 'en' | 'greed_island'>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'financial' | 'profile'>('financial');
  const [showDebtAlertModal, setShowDebtAlertModal] = useState(false);

  // Open Finance & AI Assistant State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isBalancePopoverOpen, setIsBalancePopoverOpen] = useState(false);
  const [isOpenFinanceModalOpen, setIsOpenFinanceModalOpen] = useState(false);
  const [isSyncingOpenFinance, setIsSyncingOpenFinance] = useState(false);

  const [consolidatedBalances, setConsolidatedBalances] = useState<ConsolidatedBalances>({
    consolidatedTotal: 0,
    accounts: [],
    lastUpdated: new Date().toISOString(),
  });

  const [creditCardsSummary, setCreditCardsSummary] = useState<CreditCardsSummary>({
    consolidated: {
      totalLimit: 0,
      totalUsed: 0,
      totalAvailable: 0,
      usagePercent: 0,
    },
    cards: [],
  });

  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);

  const loadOpenFinanceData = async () => {
    try {
      const [balances, cards, conns] = await Promise.all([
        api.getConsolidatedBalances(),
        api.getCreditCardsSummary(),
        api.getConnections(),
      ]);
      setConsolidatedBalances(balances);
      setCreditCardsSummary(cards);
      setBankConnections(conns);
    } catch (err) {
      console.warn('Erro ao carregar dados do Open Finance:', err);
    }
  };

  useEffect(() => {
    loadOpenFinanceData();
  }, []);

  const handleSyncOpenFinance = async () => {
    setIsSyncingOpenFinance(true);
    try {
      const result = await api.syncOpenFinance();
      if (result.success) {
        if (result.balances) setConsolidatedBalances(result.balances);
        if (result.cards) setCreditCardsSummary(result.cards);
        audioManager.playSuccessChime();
      }
    } catch (err) {
      console.error('Falha ao sincronizar Open Finance:', err);
    } finally {
      setIsSyncingOpenFinance(false);
    }
  };

  // Quick Transaction Modal
  const [showQuickTxModal, setShowQuickTxModal] = useState(false);
  const [quickTxDesc, setQuickTxDesc] = useState('');
  const [quickTxAmount, setQuickTxAmount] = useState('');
  const [quickTxType, setQuickTxType] = useState<TransactionType>('despesa');
  const [quickTxCategory, setQuickTxCategory] = useState('Alimentação');
  const [quickTxAccount, setQuickTxAccount] = useState('Conta Corrente');

  const handleOpenProfileModal = (tab: 'financial' | 'profile' = 'profile') => {
    setProfileModalTab(tab);
    setShowProfileModal(true);
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('catfish_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sync with audioManager
  useEffect(() => {
    audioManager.setEnabled(profile.soundEnabled);
  }, [profile.soundEnabled]);

  // Save changes to storage
  useEffect(() => {
    storage.saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    storage.saveDebts(debts);
  }, [debts]);

  useEffect(() => {
    storage.saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    storage.saveBudgets(budgets);
  }, [budgets]);

  useEffect(() => {
    storage.saveCards(cards);
  }, [cards]);

  // Handlers
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const created: Transaction = {
      ...newTx,
      id: 'tx-' + Date.now(),
    };
    setTransactions((prev) => [created, ...prev]);

    if (transactions.length >= 4) {
      setCards((prev) =>
        prev.map((c) => (c.cardNo === '084' ? { ...c, unlocked: true } : c))
      );
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleQuickTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(quickTxAmount);
    if (!num || num <= 0 || !quickTxDesc.trim()) return;

    handleAddTransaction({
      description: quickTxDesc.trim(),
      amount: num,
      type: quickTxType,
      category: quickTxCategory,
      account: quickTxAccount,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });

    if (quickTxType === 'receita' || quickTxType === 'ren') {
      audioManager.playIncomeSound();
    } else if (quickTxType === 'despesa' || quickTxType === 'ko') {
      audioManager.playExpenseSound();
    } else {
      audioManager.playSuccessChime();
    }

    setQuickTxDesc('');
    setQuickTxAmount('');
    setShowQuickTxModal(false);
  };

  const handleAddDebt = (debt: Omit<Debt, 'id' | 'paidAmount' | 'status'>) => {
    const created: Debt = {
      ...debt,
      id: 'debt-' + Date.now(),
      paidAmount: 0,
      status: 'active',
    };
    setDebts((prev) => [created, ...prev]);
  };

  const handlePayDebt = (debtId: string, amount: number) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === debtId) {
          const newPaid = d.paidAmount + amount;
          const isDone = newPaid >= d.principalAmount;
          return {
            ...d,
            paidAmount: newPaid,
            status: isDone ? 'paid_off' : 'active',
          };
        }
        return d;
      })
    );

    const debtObj = debts.find((d) => d.id === debtId);
    if (debtObj) {
      handleAddTransaction({
        description: `Amortização: ${debtObj.title}`,
        amount,
        type: 'despesa',
        category: 'Despesa Financeira',
        account: 'Conta Corrente',
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handlePayOffDebt = (debtId: string) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === debtId) {
          return {
            ...d,
            paidAmount: d.principalAmount,
            status: 'paid_off',
          };
        }
        return d;
      })
    );

    setCards((prev) =>
      prev.map((c) => (c.cardNo === '017' ? { ...c, unlocked: true } : c))
    );
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateBudget = (category: string, newLimit: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.category === category ? { ...b, limit: newLimit } : b))
    );
  };

  const handleAddBudget = (newBudget: BudgetLimit) => {
    setBudgets((prev) => [...prev.filter((b) => b.category !== newBudget.category), newBudget]);
  };

  const handleDeleteBudget = (category: string) => {
    setBudgets((prev) => prev.filter((b) => b.category !== category));
  };

  const handleToggleSound = () => {
    setProfile((prev) => ({
      ...prev,
      soundEnabled: !prev.soundEnabled,
    }));
  };

  const handleReloadData = () => {
    setProfile(storage.getProfile());
    setTransactions(storage.getTransactions());
    setDebts(storage.getDebts());
    setBudgets(storage.getBudgets());
    setCards(storage.getCards());
  };

  const handleAddCard = (newCard: Omit<FinancialGoal, 'id'>) => {
    const card: FinancialGoal = {
      ...newCard,
      id: 'card-' + Date.now(),
    };
    setCards((prev) => [card, ...prev]);
  };

  const handleUpdateCard = (updatedCard: FinancialGoal) => {
    setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  };

  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Calculations
  const netBankTx = transactions
    .filter((t) => t.account === 'Conta Corrente')
    .reduce((sum, t) => (t.type === 'receita' || t.type === 'ren') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const netWalletTx = transactions
    .filter((t) => t.account === 'Carteira')
    .reduce((sum, t) => (t.type === 'receita' || t.type === 'ren') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const netReserveTx = transactions
    .filter((t) => t.type === 'reserva' || t.type === 'ten' || t.account === 'Reserva de Emergência')
    .reduce((sum, t) => (t.type === 'receita' || t.type === 'ren' || t.type === 'reserva' || t.type === 'ten') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const currentBank = (profile.bankBalance ?? 4200) + netBankTx;
  const currentWallet = (profile.walletBalance ?? 1450) + netWalletTx;
  const currentReserve = (profile.emergencyFundBalance ?? 1500) + netReserveTx;

  const activeTotalBalance = consolidatedBalances?.consolidatedTotal ?? (currentBank + currentWallet + currentReserve);

  const totalDebt = debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0);

  const safeCapacity = profile.maxDebtCapacity || profile.maxAuraCapacity || 10000;
  const isElevatedDebt = totalDebt > 0 && (totalDebt >= safeCapacity || (safeCapacity > 0 && (totalDebt / safeCapacity) >= 0.7));

  // If user is unauthenticated, render isolated authentication page
  if (!currentUser) {
    return (
      <div className="hunter-app-container cf-app-container" data-theme={theme}>
        <AuthView 
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setTransactions(storage.getTransactions());
            setDebts(storage.getDebts());
            setBudgets(storage.getBudgets());
            setProfile(storage.getProfile());
            setCards(storage.getCards());
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className={`hunter-app-container cf-app-container ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'} ${isElevatedDebt ? 'risk-mode-active' : ''}`}
      data-risk-mode={isElevatedDebt ? 'true' : 'false'}
    >
      {/* Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggleOpen={handleToggleSidebar}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        profile={profile}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenLicense={() => handleOpenProfileModal('profile')}
        onToggleSound={handleToggleSound}
        onOpenNewTransaction={() => setShowQuickTxModal(true)}
        onLogout={handleLogout}
        totalBalance={activeTotalBalance}
        totalDebt={totalDebt}
        isRiskMode={isElevatedDebt}
        onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
        isAiOpen={isAiDrawerOpen}
        onOpenBalanceBreakdown={() => setIsBalancePopoverOpen(true)}
        onOpenOpenFinance={() => setIsOpenFinanceModalOpen(true)}
        isSyncingBalance={isSyncingOpenFinance}
      />

      {/* Main Viewport */}
      <div className="app-main-viewport">
        {/* Main Views */}
        <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            debts={debts}
            profile={profile}
            onOpenNewTransaction={() => setActiveTab('transactions')}
            onPayDebt={handlePayDebt}
            onPayOffDebt={handlePayOffDebt}
            onNavigateToDebts={() => setActiveTab('apr')}
            onNavigateToTransactions={() => setActiveTab('transactions')}
            onTriggerRiskModal={() => setShowDebtAlertModal(true)}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenFinancials={() => handleOpenProfileModal('financial')}
            isRiskMode={isElevatedDebt}
            creditCardsSummary={creditCardsSummary}
            onOpenOpenFinance={() => setIsOpenFinanceModalOpen(true)}
            onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
          />
        )}

        {activeTab === 'apr' && (
          <AprManagerView
            debts={debts}
            onAddDebt={handleAddDebt}
            onPayDebt={handlePayDebt}
            onPayOffDebt={handlePayOffDebt}
            onDeleteDebt={handleDeleteDebt}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'en' && (
          <EnRadarView
            transactions={transactions}
            budgets={budgets}
            onUpdateBudget={handleUpdateBudget}
            onAddBudget={handleAddBudget}
            onDeleteBudget={handleDeleteBudget}
          />
        )}

        {activeTab === 'greed_island' && (
          <GreedIslandView
            cards={cards}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            onReloadData={handleReloadData}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="hunter-footer cf-footer">
        <p>
          CatFish • Gestão Financeira Inteligente
        </p>
      </footer>
      </div>

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal
          profile={profile}
          onSave={setProfile}
          onClose={() => setShowProfileModal(false)}
          initialTab={profileModalTab}
        />
      )}

      {showDebtAlertModal && (
        <DebtAlertModal
          onClose={() => setShowDebtAlertModal(false)}
        />
      )}

      {/* Quick Transaction Modal */}
      {showQuickTxModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowQuickTxModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-tx-title"
        >
          <div className="modal-content" style={{ maxWidth: '440px', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="cf-card-header-row" style={{ marginBottom: '1.25rem' }}>
              <div>
                <span className="cf-card-category-tag">Nova movimentação</span>
                <h3 id="quick-tx-title" className="cf-card-main-title" style={{ margin: '0.2rem 0 0 0' }}>Novo lançamento</h3>
              </div>
              <button 
                onClick={() => setShowQuickTxModal(false)}
                className="btn-close"
                title="Fechar modal"
                aria-label="Fechar modal de novo lançamento"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleQuickTxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label 
                  htmlFor="quick-tx-desc"
                  style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}
                >
                  Descrição do lançamento
                </label>
                <input 
                  id="quick-tx-desc"
                  type="text"
                  placeholder="Ex: Mercado, Salário, Internet..."
                  value={quickTxDesc}
                  onChange={(e) => setQuickTxDesc(e.target.value)}
                  className="cf-input"
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div>
                <label 
                  htmlFor="quick-tx-amount"
                  style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}
                >
                  Valor (R$)
                </label>
                <input 
                  id="quick-tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={quickTxAmount}
                  onChange={(e) => setQuickTxAmount(e.target.value)}
                  className="cf-input mono-number"
                  style={{ fontWeight: 700, fontSize: '1rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label 
                    htmlFor="quick-tx-type"
                    style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}
                  >
                    Tipo
                  </label>
                  <select 
                    id="quick-tx-type"
                    value={quickTxType}
                    onChange={(e) => setQuickTxType(e.target.value as TransactionType)}
                    className="cf-select"
                  >
                    <option value="despesa">Despesa (-)</option>
                    <option value="receita">Receita (+)</option>
                    <option value="reserva">Reserva / Seguro</option>
                  </select>
                </div>

                <div>
                  <label 
                    htmlFor="quick-tx-account"
                    style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}
                  >
                    Conta de débito/crédito
                  </label>
                  <select 
                    id="quick-tx-account"
                    value={quickTxAccount}
                    onChange={(e) => setQuickTxAccount(e.target.value)}
                    className="cf-select"
                  >
                    <option value="Conta Corrente">{profile.bankName || 'Banco Principal'}</option>
                    <option value="Carteira">Carteira</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Reserva de Emergência">Reserva de Emergência</option>
                  </select>
                </div>
              </div>

              <div>
                <label 
                  htmlFor="quick-tx-category"
                  style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}
                >
                  Categoria
                </label>
                <select 
                  id="quick-tx-category"
                  value={quickTxCategory}
                  onChange={(e) => setQuickTxCategory(e.target.value)}
                  className="cf-select"
                >
                  <option value="Alimentação">Alimentação</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Moradia">Moradia</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Salário">Salário / Renda</option>
                  <option value="Investimentos">Investimentos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowQuickTxModal(false)}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="cf-btn-primary-blue"
                >
                  Salvar lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popover de Detalhamento do Saldo Consolidado e Individual (Open Finance) */}
      <BalanceBreakdownPopover
        isOpen={isBalancePopoverOpen}
        onClose={() => setIsBalancePopoverOpen(false)}
        balances={consolidatedBalances}
        onSync={handleSyncOpenFinance}
        isSyncing={isSyncingOpenFinance}
        onOpenManageBanks={() => setIsOpenFinanceModalOpen(true)}
      />

      {/* Drawer de Chat com o Assistente de IA (Google Gemini) */}
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        userName={profile.name || 'Gustavo'}
      />

      {/* Modal de Gerenciamento de Conexões Bancárias Open Finance */}
      <OpenFinanceModal
        isOpen={isOpenFinanceModalOpen}
        onClose={() => setIsOpenFinanceModalOpen(false)}
        connections={bankConnections}
        onRefreshConnections={loadOpenFinanceData}
      />
    </div>
  );
};

export default App;
