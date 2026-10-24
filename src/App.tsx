import React, { useState, useEffect, useRef } from 'react';
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
import { OfxImportModal } from './components/OfxImportModal';
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
  BankConfig,
  FinancialAccount,
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
  const [bankConfigs, setBankConfigs] = useState<BankConfig[]>(() => storage.getBankConfigs());
  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => storage.getAccounts());

  // Automatic bidirectional synchronization with remote PostgreSQL database
  useEffect(() => {
    const userId = currentUser?.id || 'usr-felipe-default';
    storage.syncFromRemote(userId).then((remoteData) => {
      if (remoteData && Object.keys(remoteData).length > 0) {
        if (remoteData.accounts) setAccounts(remoteData.accounts);
        if (remoteData.transactions) {
          setTransactions(
            remoteData.transactions.map((t: Transaction) => ({
              ...t,
              description: (t.description || '').replace(/^Amortização:\s*/i, 'Parcela: '),
            }))
          );
        }
        if (remoteData.debts) setDebts(remoteData.debts);
        if (remoteData.budgets) setBudgets(remoteData.budgets);
        if (remoteData.cards) setCards(remoteData.cards);
        if (remoteData.profile) setProfile(remoteData.profile);
        if (remoteData.bankConfigs) setBankConfigs(remoteData.bankConfigs);
      } else {
        // If remote DB was clean, push local defaults to PostgreSQL
        storage.syncAllToRemote(userId);
      }
    });
  }, [currentUser?.id]);

  const handleUpdateAccounts = (updated: FinancialAccount[]) => {
    setAccounts(updated);
    storage.saveAccounts(updated);
    setProfile(storage.getProfile());
  };

  const handleUpdateBankConfigs = (updated: BankConfig[]) => {
    setBankConfigs(updated);
    storage.saveBankConfigs(updated);
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'apr' | 'transactions' | 'en' | 'greed_island'>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'financial' | 'profile'>('financial');
  const [showDebtAlertModal, setShowDebtAlertModal] = useState(false);

  // Open Finance & AI Assistant State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isBalancePopoverOpen, setIsBalancePopoverOpen] = useState(false);
  const [isOpenFinanceModalOpen, setIsOpenFinanceModalOpen] = useState(false);
  const [isOfxModalOpen, setIsOfxModalOpen] = useState(false);
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
  const [quickTxBank, setQuickTxBank] = useState('Nubank');

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

  const viewportRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top on tab change so headers and metrics are never clipped
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
  }, [activeTab]);

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

  const handleImportOfx = (
    accountName: string,
    importedTxs: Omit<Transaction, 'id'>[],
    newBalance?: number
  ) => {
    const createdTxs: Transaction[] = importedTxs.map((t, idx) => ({
      ...t,
      id: `tx-ofx-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    }));

    setTransactions((prev) => [...createdTxs, ...prev]);

    if (newBalance !== undefined) {
      setProfile((prev) => {
        const updated = {
          ...prev,
          bankName: accountName,
          bankBalance: newBalance,
        };
        storage.saveProfile(updated);
        return updated;
      });
    }

    audioManager.playSuccessChime();
    api.importOfxTransactions(accountName, createdTxs, newBalance).catch(() => {});
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
      bankName: quickTxBank,
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
    const debtObj = debts.find((d) => d.id === debtId);
    if (!debtObj) return;

    const totalInstallments = Math.max(1, debtObj.installmentsCount || 1);
    const singleInstallmentVal = debtObj.principalAmount / totalInstallments;
    const currentPaidInst = Math.floor((debtObj.paidAmount || 0) / (singleInstallmentVal || 1));
    const nextInstallmentNum = Math.min(totalInstallments, currentPaidInst + 1);

    const newPaid = debtObj.paidAmount + amount;
    const isDone = newPaid >= debtObj.principalAmount;

    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === debtId) {
          return {
            ...d,
            paidAmount: newPaid,
            status: isDone ? 'paid_off' : 'active',
          };
        }
        return d;
      })
    );

    const desc = isDone
      ? `Quitação: ${debtObj.title}`
      : totalInstallments > 1
      ? `Parcela ${nextInstallmentNum}/${totalInstallments}: ${debtObj.title}`
      : `Pagamento: ${debtObj.title}`;

    handleAddTransaction({
      description: desc,
      amount,
      type: 'despesa',
      category: debtObj.category === 'cartao_credito' ? 'Cartão de Crédito' : 'Despesa Financeira',
      account: 'Conta Corrente',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handlePayOffDebt = (debtId: string) => {
    const debtObj = debts.find((d) => d.id === debtId);
    if (!debtObj) return;

    const remainingAmount = Math.max(0, debtObj.principalAmount - debtObj.paidAmount);

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

    if (remainingAmount > 0) {
      handleAddTransaction({
        description: `Quitação: ${debtObj.title}`,
        amount: remainingAmount,
        type: 'despesa',
        category: debtObj.category === 'cartao_credito' ? 'Cartão de Crédito' : 'Despesa Financeira',
        account: 'Conta Corrente',
        date: new Date().toISOString().split('T')[0],
      });
    }

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
    setAccounts(storage.getAccounts());
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

  // Calculations derived directly from manual accounts and transactions
  const manualChecking = accounts.filter((a) => a.type === 'checking');
  const manualWallet = accounts.filter((a) => a.type === 'wallet');
  const manualReserve = accounts.filter((a) => a.type === 'emergency_fund');
  const manualCardAccounts = accounts.filter((a) => (a.type === 'checking' && a.hasCreditCard && (a.creditLimit || 0) > 0) || a.type === 'credit_card');

  const getAccountNetTx = (acc: FinancialAccount) => {
    return transactions
      .filter((t) => {
        // Purchases made on credit do NOT deduct from checking liquid balance
        if (t.paymentMethod === 'credit' || t.account === 'Cartão de Crédito') {
          return false;
        }
        return (
          t.account === acc.name ||
          (acc.type === 'checking' && t.account === 'Conta Corrente' && t.bankName?.toLowerCase() === acc.institutionName.toLowerCase()) ||
          (acc.type === 'wallet' && t.account === 'Carteira') ||
          (acc.type === 'emergency_fund' && (t.account === 'Reserva de Emergência' || t.type === 'reserva' || t.type === 'ten'))
        );
      })
      .reduce((sum, t) => {
        if (t.type === 'receita' || t.type === 'ren' || t.type === 'reserva' || t.type === 'ten') return sum + t.amount;
        if (t.type === 'despesa' || t.type === 'ko') return sum - t.amount;
        return sum;
      }, 0);
  };

  const currentBank = manualChecking.length > 0
    ? manualChecking.reduce((sum, a) => sum + (a.balance || 0) + getAccountNetTx(a), 0)
    : (profile.bankBalance ?? 4200) + transactions.filter(t => t.account === 'Conta Corrente').reduce((sum, t) => (t.type === 'receita' || t.type === 'ren') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const currentWallet = manualWallet.length > 0
    ? manualWallet.reduce((sum, a) => sum + (a.balance || 0) + getAccountNetTx(a), 0)
    : (profile.walletBalance ?? 1450) + transactions.filter(t => t.account === 'Carteira').reduce((sum, t) => (t.type === 'receita' || t.type === 'ren') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const currentReserve = manualReserve.length > 0
    ? manualReserve.reduce((sum, a) => sum + (a.balance || 0) + getAccountNetTx(a), 0)
    : (profile.emergencyFundBalance ?? 1500) + transactions.filter(t => t.type === 'reserva' || t.type === 'ten' || t.account === 'Reserva de Emergência').reduce((sum, t) => (t.type === 'receita' || t.type === 'ren' || t.type === 'reserva' || t.type === 'ten') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const totalLiquidBalance = currentBank + currentWallet + currentReserve;

  const activeTotalBalance = (bankConnections.length > 0 && consolidatedBalances.consolidatedTotal > 0)
    ? consolidatedBalances.consolidatedTotal
    : totalLiquidBalance;

  const activeBalances: ConsolidatedBalances = (bankConnections.length > 0 && consolidatedBalances.accounts.length > 0)
    ? consolidatedBalances
    : {
        consolidatedTotal: totalLiquidBalance,
        accounts: accounts
          .filter((a) => a.type !== 'credit_card')
          .map((a) => ({
            accountId: a.id,
            institutionName: a.institutionName,
            accountName: a.name,
            balance: (a.balance || 0) + getAccountNetTx(a),
            color: a.color || '#10b981',
            type: a.type,
          })),
        lastUpdated: new Date().toISOString(),
      };

  const cardDebts = debts
    .filter((d) => d.category === 'cartao_credito' && d.status === 'active')
    .reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0);

  const derivedCards = manualCardAccounts.length > 0
    ? manualCardAccounts.map((acc) => {
        const bCardExpenses = transactions
          .filter(
            (t) =>
              ((t.account === acc.name && t.paymentMethod === 'credit') ||
               (t.account === acc.name && acc.type === 'credit_card') ||
               (t.bankName?.toLowerCase() === acc.institutionName.toLowerCase() && (t.account === 'Cartão de Crédito' || t.paymentMethod === 'credit'))) &&
              (t.type === 'despesa' || t.type === 'ko')
          )
          .reduce((sum, t) => sum + t.amount, 0);
        const totalLimit = acc.creditLimit || 0;
        const usedLimit = bCardExpenses;
        const availableLimit = Math.max(0, totalLimit - usedLimit);
        const usagePercent = totalLimit > 0 ? Math.min(100, Math.round((usedLimit / totalLimit) * 100)) : 0;
        return {
          accountId: acc.id,
          institutionName: acc.institutionName,
          cardName: acc.type === 'checking' ? `Cartão ${acc.institutionName}` : acc.name,
          totalLimit,
          usedLimit,
          availableLimit,
          usagePercent,
          closingDay: acc.closingDay || 10,
          dueDay: acc.dueDay || 17,
          color: acc.color || '#820ad1',
        };
      })
    : bankConfigs.map((b) => {
        const bCardExpenses = transactions
          .filter(
            (t) =>
              (t.bankName === b.name || t.bankName?.toLowerCase() === b.name.toLowerCase()) &&
              t.account === 'Cartão de Crédito' &&
              (t.type === 'despesa' || t.type === 'ko')
          )
          .reduce((sum, t) => sum + t.amount, 0);
        const totalLimit = b.creditCardLimit || 0;
        const usedLimit = bCardExpenses;
        const availableLimit = Math.max(0, totalLimit - usedLimit);
        const usagePercent = totalLimit > 0 ? Math.min(100, Math.round((usedLimit / totalLimit) * 100)) : 0;
        return {
          accountId: b.id,
          institutionName: b.name,
          cardName: `Cartão ${b.name}`,
          totalLimit,
          usedLimit,
          availableLimit,
          usagePercent,
          closingDay: b.closingDay || 15,
          dueDay: b.dueDay || 22,
          color: b.color || '#10b981',
        };
      });

  const activeCardsSummary: CreditCardsSummary = (creditCardsSummary?.cards && creditCardsSummary.cards.length > 0)
    ? creditCardsSummary
    : {
        consolidated: {
          totalLimit: derivedCards.reduce((acc, c) => acc + c.totalLimit, 0),
          totalUsed: derivedCards.reduce((acc, c) => acc + c.usedLimit, 0),
          totalAvailable: derivedCards.reduce((acc, c) => acc + c.availableLimit, 0),
          usagePercent: derivedCards.reduce((acc, c) => acc + c.totalLimit, 0) > 0
            ? Math.round((derivedCards.reduce((acc, c) => acc + c.usedLimit, 0) / derivedCards.reduce((acc, c) => acc + c.totalLimit, 0)) * 100)
            : 0,
        },
        cards: derivedCards,
      };

  const hasOpenFinanceCards = Boolean(creditCardsSummary?.cards && creditCardsSummary.cards.length > 0);
  const effectiveCardsUsed = hasOpenFinanceCards
    ? creditCardsSummary.cards.reduce((sum, c) => sum + (Number(c.usedLimit) || 0), 0)
    : activeCardsSummary.cards.reduce((sum, c) => sum + (Number(c.usedLimit) || 0), 0) + cardDebts;

  const effectiveCardsLimit = hasOpenFinanceCards
    ? creditCardsSummary.cards.reduce((sum, c) => sum + (Number(c.totalLimit) || 0), 0)
    : (activeCardsSummary.consolidated.totalLimit || profile.creditCardLimit || 5000);

  const otherActiveDebts = debts
    .filter((d) => d.status === 'active' && d.category !== 'cartao_credito')
    .reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0);

  const totalDebt = otherActiveDebts + effectiveCardsUsed;

  const safeCapacity = Math.max(
    profile.maxDebtCapacity || profile.maxAuraCapacity || 0,
    effectiveCardsLimit
  ) || 10000;

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
            setAccounts(storage.getAccounts());
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
      <div className="app-main-viewport" ref={viewportRef}>
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
            creditCardsSummary={activeCardsSummary}
            onOpenOpenFinance={() => setIsOpenFinanceModalOpen(true)}
            onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
            accounts={accounts}
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
            onOpenOfxModal={() => setIsOfxModalOpen(true)}
            bankConfigs={bankConfigs}
            onUpdateBankConfigs={handleUpdateBankConfigs}
            accounts={accounts}
            onUpdateAccounts={handleUpdateAccounts}
            onOpenContabilizar={() => handleOpenProfileModal('financial')}
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
          accounts={accounts}
          onUpdateAccounts={handleUpdateAccounts}
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
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setQuickTxAccount(selectedVal);
                      const matched = accounts.find(a => a.name === selectedVal || a.id === selectedVal);
                      if (matched) {
                        setQuickTxBank(matched.institutionName);
                        if (matched.type === 'credit_card') {
                          setQuickTxType('despesa');
                        }
                      }
                    }}
                    className="cf-select"
                  >
                    {accounts.length > 0 ? (
                      accounts.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.institutionName} • {a.name} ({a.hasCreditCard ? 'Conta com Cartão' : a.type === 'credit_card' ? 'Cartão' : 'Conta'})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Conta Corrente">{profile.bankName || 'Banco Principal'}</option>
                        <option value="Carteira">Carteira</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Reserva de Emergência">Reserva de Emergência</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label 
                    htmlFor="quick-tx-bank"
                    style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}
                  >
                    Banco / Instituição
                  </label>
                  <select 
                    id="quick-tx-bank"
                    value={quickTxBank}
                    onChange={(e) => setQuickTxBank(e.target.value)}
                    className="cf-select"
                  >
                    {bankConfigs.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
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

      {/* Popover de Detalhamento do Saldo Consolidado e Individual */}
      <BalanceBreakdownPopover
        isOpen={isBalancePopoverOpen}
        onClose={() => setIsBalancePopoverOpen(false)}
        balances={activeBalances}
        onSync={handleSyncOpenFinance}
        isSyncing={isSyncingOpenFinance}
        onOpenManageBanks={() => setIsOpenFinanceModalOpen(true)}
        accounts={accounts}
        onOpenContabilizar={() => handleOpenProfileModal('financial')}
      />

      {/* Drawer de Chat com o Assistente de IA (Google Gemini) */}
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        userName={profile.name || 'Gustavo'}
        onTransactionCreated={(newTx) => {
          handleAddTransaction(newTx);
          audioManager.playSuccessChime();
        }}
      />

      {/* Modal de Gerenciamento de Conexões Bancárias Open Finance */}
      <OpenFinanceModal
        isOpen={isOpenFinanceModalOpen}
        onClose={() => setIsOpenFinanceModalOpen(false)}
        connections={bankConnections}
        onRefreshConnections={loadOpenFinanceData}
        onOpenOfxModal={() => setIsOfxModalOpen(true)}
        accounts={accounts}
        onOpenContabilizar={() => handleOpenProfileModal('financial')}
      />

      {/* Modal de Importação de Extrato Bancário OFX */}
      <OfxImportModal
        isOpen={isOfxModalOpen}
        onClose={() => setIsOfxModalOpen(false)}
        existingTransactions={transactions}
        onImport={handleImportOfx}
      />
    </div>
  );
};

export default App;
