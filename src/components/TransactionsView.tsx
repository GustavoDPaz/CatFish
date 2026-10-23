import React, { useState, useEffect, useMemo } from 'react';
import type { Transaction, TransactionType, BankConfig, FinancialAccount } from '../types';
import { audioManager } from '../utils/audio';
import {
  Plus,
  Search,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  X,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Landmark,
  CreditCard,
  AlertCircle,
  Info,
  Settings,
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenOfxModal?: () => void;
  bankConfigs: BankConfig[];
  onUpdateBankConfigs: (banks: BankConfig[]) => void;
  accounts?: FinancialAccount[];
  onOpenContabilizar?: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente',
  credit_card: 'Cartão de Crédito',
  emergency_fund: 'Reserva de Emergência',
  wallet: 'Dinheiro em Mãos',
  investment: 'Investimentos',
};

const PRESET_COLORS = [
  '#820AD1', // Nubank purple
  '#FF7A00', // Inter orange
  '#EC7000', // Itaú amber
  '#CC092F', // Bradesco crimson
  '#242424', // C6 dark
  '#EA1D2C', // Santander red
  '#003882', // BB royal blue
  '#0066B3', // Caixa blue
  '#10B981', // Emerald green
];

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onOpenOfxModal,
  bankConfigs,
  onUpdateBankConfigs,
  accounts = [],
  onOpenContabilizar,
}) => {
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Selected manual account for new transaction
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return accounts.length > 0 ? accounts[0].id : '';
  });

  // Add Transaction Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('despesa');
  const [category, setCategory] = useState('Alimentação');
  const [account, setAccount] = useState('Conta Corrente');
  const [bankName, setBankName] = useState<string>(() => {
    return accounts[0]?.institutionName || bankConfigs[0]?.name || 'Nubank';
  });
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Quick inline add bank state inside add modal
  const [isInlineAddingBank, setIsInlineAddingBank] = useState(false);
  const [inlineBankName, setInlineBankName] = useState('');
  const [inlineBankLimit, setInlineBankLimit] = useState('3000');
  const inlineBankColor = '#820AD1';

  // Limits Modal Form state (for adding a new bank in limits modal)
  const [newBankName, setNewBankName] = useState('');
  const [newBankLimit, setNewBankLimit] = useState('3000');
  const [newBankColor, setNewBankColor] = useState('#820AD1');
  const [newBankClosing, setNewBankClosing] = useState('10');
  const [newBankDue, setNewBankDue] = useState('17');
  const [showAddNewBankPanel, setShowAddNewBankPanel] = useState(false);

  // Sync selectedAccountId if accounts change
  useEffect(() => {
    if (accounts.length > 0 && !accounts.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0].id);
      setBankName(accounts[0].institutionName);
      setAccount(accounts[0].name);
    }
  }, [accounts, selectedAccountId]);

  // Sync default bankName if bankConfigs change and bankName is invalid
  useEffect(() => {
    if (!bankConfigs.some((b) => b.name.toLowerCase() === bankName.toLowerCase()) && bankConfigs.length > 0) {
      if (!accounts.some((a) => a.institutionName.toLowerCase() === bankName.toLowerCase())) {
        setBankName(bankConfigs[0].name);
      }
    }
  }, [bankConfigs, bankName, accounts]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getBankColor = (bName?: string): string => {
    if (!bName) return '#10B981';
    const found = bankConfigs.find((b) => b.name.toLowerCase() === bName.toLowerCase());
    if (found) return found.color;
    const lower = bName.toLowerCase();
    if (lower.includes('nu')) return '#820AD1';
    if (lower.includes('inter')) return '#FF7A00';
    if (lower.includes('ita')) return '#EC7000';
    if (lower.includes('bradesco')) return '#CC092F';
    if (lower.includes('santander')) return '#EA1D2C';
    if (lower.includes('c6')) return '#242424';
    if (lower.includes('brasil')) return '#003882';
    if (lower.includes('caixa')) return '#0066B3';
    return '#10B981';
  };

  // Card invoices per bank
  const getBankCardInvoice = (bName: string): number => {
    return transactions
      .filter(
        (t) =>
          (t.bankName?.toLowerCase() === bName.toLowerCase()) &&
          t.account === 'Cartão de Crédito' &&
          (t.type === 'despesa' || t.type === 'ko')
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Consolidated Credit Card Metrics across all banks
  const consolidatedTotalLimit = bankConfigs.reduce((sum, b) => sum + (Number(b.creditCardLimit) || 0), 0);
  const consolidatedUsedLimit = bankConfigs.reduce((sum, b) => sum + getBankCardInvoice(b.name), 0);
  const consolidatedAvailableLimit = Math.max(0, consolidatedTotalLimit - consolidatedUsedLimit);
  const consolidatedUsagePercent =
    consolidatedTotalLimit > 0
      ? Math.min(100, Math.round((consolidatedUsedLimit / consolidatedTotalLimit) * 100))
      : 0;

  // Selected bank metrics
  const activeBankConfig = bankConfigs.find((b) => b.name.toLowerCase() === selectedBank.toLowerCase());
  const activeBankInvoice = activeBankConfig ? getBankCardInvoice(activeBankConfig.name) : 0;
  const activeBankLimit = activeBankConfig?.creditCardLimit || 0;
  const activeBankAvailable = Math.max(0, activeBankLimit - activeBankInvoice);
  const activeBankUsagePercent =
    activeBankLimit > 0 ? Math.min(100, Math.round((activeBankInvoice / activeBankLimit) * 100)) : 0;

  // Filter transactions
  const filtered = transactions
    .filter((tx) => {
      // 1. Type filter
      let matchesType = filterType === 'all';
      if (!matchesType) {
        if (filterType === 'ren' || filterType === 'receita') {
          matchesType = tx.type === 'ren' || tx.type === 'receita';
        } else if (filterType === 'ko' || filterType === 'despesa') {
          matchesType = tx.type === 'ko' || tx.type === 'despesa';
        } else if (filterType === 'ten' || filterType === 'reserva') {
          matchesType = tx.type === 'ten' || tx.type === 'reserva';
        } else {
          matchesType = (tx.type as string) === (filterType as string);
        }
      }

      // 2. Bank filter
      const txBank = tx.bankName || 'Nubank';
      const matchesBank =
        selectedBank === 'all' || txBank.toLowerCase() === selectedBank.toLowerCase();

      // 3. Search query filter
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.account.toLowerCase().includes(q) ||
        txBank.toLowerCase().includes(q);

      return matchesType && matchesBank && matchesSearch;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedBank, searchQuery]);

  // Adjust page if items were deleted and page is now empty
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Period totals for current filter
  const targetTxs = selectedBank === 'all'
    ? transactions
    : transactions.filter((t) => (t.bankName || 'Nubank').toLowerCase() === selectedBank.toLowerCase());

  const totalRen = targetTxs
    .filter((t) => t.type === 'ren' || t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalKo = targetTxs
    .filter((t) => t.type === 'ko' || t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const netTotal = totalRen - totalKo;

  const numEntered = Number(amount) || 0;

  // Selected manual account details
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const selectedAccountLimit = selectedAccount?.type === 'credit_card' ? (selectedAccount.creditLimit || 0) : 0;
  const selectedAccountUsed = selectedAccount
    ? transactions
        .filter(
          (t) =>
            (t.account === selectedAccount.name || (t.bankName?.toLowerCase() === selectedAccount.institutionName.toLowerCase() && t.account === 'Cartão de Crédito')) &&
            (t.type === 'despesa' || t.type === 'ko')
        )
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const selectedAccountAvail = Math.max(0, selectedAccountLimit - selectedAccountUsed);
  const willExceedSelectedLimit =
    selectedAccount?.type === 'credit_card' && numEntered > 0 && numEntered > selectedAccountAvail;

  // Combined bank filter list (manual accounts institutions + bankConfigs)
  const bankFilterItems = useMemo(() => {
    const list: { name: string; color: string; creditCardLimit: number; id: string }[] = [];
    const seen = new Set<string>();

    accounts.forEach((acc) => {
      const lower = acc.institutionName.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({
          id: `inst-${acc.id}`,
          name: acc.institutionName,
          color: acc.color || getBankColor(acc.institutionName),
          creditCardLimit: acc.type === 'credit_card' ? (acc.creditLimit || 0) : 0,
        });
      } else if (acc.type === 'credit_card' && acc.creditLimit) {
        const found = list.find((item) => item.name.toLowerCase() === lower);
        if (found) found.creditCardLimit += acc.creditLimit;
      }
    });

    bankConfigs.forEach((b) => {
      const lower = b.name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({
          id: b.id,
          name: b.name,
          color: b.color,
          creditCardLimit: b.creditCardLimit || 0,
        });
      }
    });

    return list;
  }, [accounts, bankConfigs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0 || !description.trim()) return;

    const chosenAcc = accounts.find((a) => a.id === selectedAccountId);
    const finalBank = chosenAcc ? chosenAcc.institutionName : (bankName.trim() || 'Nubank');
    const finalAccount = chosenAcc ? chosenAcc.name : account;

    onAddTransaction({
      description,
      amount: num,
      type,
      category,
      account: finalAccount,
      bankName: finalBank,
      date,
      notes,
    });

    if (type === 'ren' || type === 'receita') audioManager.playIncomeSound();
    else if (type === 'ko' || type === 'despesa') audioManager.playExpenseSound();
    else audioManager.playAprChime();

    setDescription('');
    setAmount('');
    setNotes('');
    setShowAddModal(false);
  };

  const handleUpdateSingleLimit = (bankId: string, newLimit: number) => {
    const updated = bankConfigs.map((b) => (b.id === bankId ? { ...b, creditCardLimit: Math.max(0, newLimit) } : b));
    onUpdateBankConfigs(updated);
  };

  const handleQuickAdjustLimit = (bankId: string, delta: number) => {
    const found = bankConfigs.find((b) => b.id === bankId);
    if (!found) return;
    handleUpdateSingleLimit(bankId, Math.max(0, (found.creditCardLimit || 0) + delta));
  };

  const handleCreateNewBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;

    const cleanName = newBankName.trim();
    if (bankConfigs.some((b) => b.name.toLowerCase() === cleanName.toLowerCase())) {
      alert(`O banco "${cleanName}" já existe.`);
      return;
    }

    const createdBank: BankConfig = {
      id: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      color: newBankColor,
      creditCardLimit: Math.max(0, Number(newBankLimit) || 0),
      closingDay: Number(newBankClosing) || 10,
      dueDay: Number(newBankDue) || 17,
    };

    const updated = [...bankConfigs, createdBank];
    onUpdateBankConfigs(updated);
    audioManager.playSuccessChime();

    setNewBankName('');
    setNewBankLimit('3000');
    setShowAddNewBankPanel(false);
  };

  const handleCreateInlineBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineBankName.trim()) return;

    const cleanName = inlineBankName.trim();
    if (bankConfigs.some((b) => b.name.toLowerCase() === cleanName.toLowerCase())) {
      setBankName(cleanName);
      setIsInlineAddingBank(false);
      return;
    }

    const createdBank: BankConfig = {
      id: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      color: inlineBankColor,
      creditCardLimit: Math.max(0, Number(inlineBankLimit) || 0),
      closingDay: 10,
      dueDay: 17,
    };

    const updated = [...bankConfigs, createdBank];
    onUpdateBankConfigs(updated);
    setBankName(cleanName);
    setIsInlineAddingBank(false);
    setInlineBankName('');
    audioManager.playSuccessChime();
  };

  const handleDeleteBank = (bankId: string, bName: string) => {
    if (bankConfigs.length <= 1) {
      alert('Você deve manter pelo menos um banco cadastrado.');
      return;
    }
    if (!window.confirm(`Tem certeza de que deseja remover o banco "${bName}" da lista?`)) return;

    const updated = bankConfigs.filter((b) => b.id !== bankId);
    onUpdateBankConfigs(updated);
    if (selectedBank.toLowerCase() === bName.toLowerCase()) {
      setSelectedBank('all');
    }
    audioManager.playKoExpense();
  };

  return (
    <div className="cf-dashboard-layout">
      {/* Top Greeting & Hero KPI Card */}
      <section className="cf-greeting-hero">
        <div className="cf-greeting-top-row">
          <span className="cf-greeting-date">
            {selectedBank === 'all'
              ? 'Extrato consolidado • Multi-bancos'
              : `Extrato filtrado • ${selectedBank}`}
          </span>
          <span className={`cf-risk-mode-pill ${netTotal < 0 ? 'cf-risk-mode-pill-danger' : ''}`}>
            <span
              className="cf-status-dot-active"
              style={selectedBank !== 'all' ? { backgroundColor: getBankColor(selectedBank) } : undefined}
            />
            {selectedBank === 'all'
              ? netTotal >= 0
                ? 'Saldo geral positivo'
                : 'Saldo geral negativo'
              : `Filtro ativo: ${selectedBank}`}
          </span>
        </div>

        <h1 className="cf-greeting-title">
          {selectedBank === 'all' ? 'Lançamentos e extrato' : `Lançamentos • ${selectedBank}`}
        </h1>
        <p className="cf-greeting-subtitle">
          {selectedBank === 'all'
            ? 'Histórico consolidado de receitas, despesas e faturas de cartão com filtro por banco e busca rápida.'
            : `Histórico de movimentações vinculadas ao ${selectedBank} com acompanhamento do limite de cartão de crédito.`}
        </p>

        {/* 4-Column Metric Strip */}
        <div className="cf-hero-metrics-strip">
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">
              {selectedBank === 'all' ? 'Saldo do período' : `Saldo no ${selectedBank}`}
            </span>
            <span className={`cf-metric-value mono-number ${netTotal >= 0 ? 'cf-val-green' : 'cf-val-dark'}`}>
              {netTotal >= 0 ? '+' : ''}
              {formatCurrency(netTotal)}
            </span>
            <span className="cf-metric-subtext">Resultado líquido</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">
              {selectedBank === 'all' ? 'Total de receitas' : `Receitas no ${selectedBank}`}
            </span>
            <span className="cf-metric-value cf-val-green mono-number">+{formatCurrency(totalRen)}</span>
            <span className="cf-metric-subtext">Entradas registradas</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">
              {selectedBank === 'all' ? 'Total de despesas' : `Despesas no ${selectedBank}`}
            </span>
            <span className="cf-metric-value cf-val-dark mono-number">-{formatCurrency(totalKo)}</span>
            <span className="cf-metric-subtext">Saídas contabilizadas</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">
              {selectedBank === 'all' ? 'Limite Cartões (Geral)' : `Cartão ${selectedBank}`}
            </span>
            <span className="cf-metric-value cf-val-blue mono-number" style={{ fontSize: '1.05rem' }}>
              {selectedBank === 'all'
                ? `${formatCurrency(consolidatedUsedLimit)}`
                : `${formatCurrency(activeBankInvoice)}`}
            </span>
            <span className="cf-metric-subtext">
              {selectedBank === 'all'
                ? `de ${formatCurrency(consolidatedTotalLimit)} (${consolidatedUsagePercent}% usado)`
                : `${formatCurrency(activeBankAvailable)} disp. (${activeBankUsagePercent}% usado)`}
            </span>
          </div>
        </div>
      </section>

      {/* Main Transactions Card */}
      <div className="cf-card">
        {/* BANK FILTER BAR (Escolher entre bancos disponíveis & Gerenciar Limites) */}
        <div className="cf-bank-filter-wrapper">
          <div className="cf-bank-filter-scroll">
            <button
              type="button"
              className={`cf-bank-filter-pill ${selectedBank === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedBank('all')}
              title="Exibir lançamentos de todas as instituições financeiras"
            >
              <Landmark size={14} />
              <span>Todos os bancos</span>
              <span className="cf-bank-pill-count">{transactions.length}</span>
            </button>

            {bankFilterItems.map((b) => {
              const count = transactions.filter(
                (t) => (t.bankName || 'Nubank').toLowerCase() === b.name.toLowerCase()
              ).length;
              const isSelected = selectedBank.toLowerCase() === b.name.toLowerCase();

              return (
                <button
                  key={b.id}
                  type="button"
                  className={`cf-bank-filter-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedBank(isSelected ? 'all' : b.name)}
                  title={`Filtrar lançamentos de ${b.name} ${b.creditCardLimit > 0 ? `(Limite do Cartão: ${formatCurrency(b.creditCardLimit)})` : ''}`}
                >
                  <span className="cf-bank-dot" style={{ backgroundColor: b.color }} />
                  <span>{b.name}</span>
                  <span className="cf-bank-pill-count">{count}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="cf-btn-limits"
            onClick={() => setShowLimitsModal(true)}
            title="Definir e acompanhar limites de cartão para cada banco"
          >
            <CreditCard size={15} />
            <span>Limites de Cartão</span>
            <span className="cf-btn-limits-badge">
              {formatCurrency(consolidatedUsedLimit)} / {formatCurrency(consolidatedTotalLimit)}
            </span>
          </button>
        </div>

        {/* Clean Toolbar: Type Tabs, Search, OFX, and New Transaction */}
        <div className="clean-toolbar" style={{ marginBottom: '1.25rem' }}>
          <div className="clean-filter-tabs">
            <button
              className={`filter-tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Todos
            </button>
            <button
              className={`filter-tab-btn ${filterType === 'ren' ? 'active' : ''}`}
              onClick={() => setFilterType('ren')}
            >
              Receitas
            </button>
            <button
              className={`filter-tab-btn ${filterType === 'ko' ? 'active' : ''}`}
              onClick={() => setFilterType('ko')}
            >
              Despesas
            </button>
            <button
              className={`filter-tab-btn ${filterType === 'ten' ? 'active' : ''}`}
              onClick={() => setFilterType('ten')}
            >
              Reservas
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="text"
                placeholder={selectedBank === 'all' ? 'Buscar lançamento ou banco...' : `Buscar no ${selectedBank}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="clean-search-input"
              />
            </div>

            {onOpenOfxModal && (
              <button
                className="cf-btn-secondary"
                onClick={onOpenOfxModal}
                title="Importar extrato bancário em formato .OFX"
              >
                <FileSpreadsheet size={16} />
                <span>Importar OFX</span>
              </button>
            )}

            <button className="cf-btn-primary-blue" onClick={() => setShowAddModal(true)}>
              <Plus size={15} />
              <span>Novo lançamento</span>
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="transactions-clean-section">
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                {selectedBank !== 'all'
                  ? `Nenhum lançamento encontrado para ${selectedBank}.`
                  : 'Nenhum lançamento encontrado com os filtros atuais.'}
              </p>
              <button
                type="button"
                className="cf-btn-secondary"
                onClick={() => {
                  setSelectedBank('all');
                  setFilterType('all');
                  setSearchQuery('');
                }}
                style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            <div className="clean-tx-list">
              {paginatedTransactions.map((tx) => {
                const isIncome = tx.type === 'ren' || tx.type === 'receita';
                const isExpense = tx.type === 'ko' || tx.type === 'despesa';
                const isReserve = tx.type === 'ten' || tx.type === 'reserva';
                const currentBankName = tx.bankName || 'Nubank';
                const bColor = getBankColor(currentBankName);

                return (
                  <div key={tx.id} className="clean-tx-row">
                    <div className="tx-col-left">
                      <div className={`tx-type-tag ${isIncome ? 'ren' : isExpense ? 'ko' : 'ten'}`}>
                        {isIncome && <ArrowUpRight size={16} />}
                        {isExpense && <ArrowDownRight size={16} />}
                        {isReserve && <Lock size={15} />}
                      </div>

                      <div className="tx-desc-col">
                        <span className="tx-title-main">{tx.description}</span>
                        <div className="tx-sub-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span
                            className={`badge badge-${isIncome ? 'ren' : isExpense ? 'ko' : 'ten'}`}
                            style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}
                          >
                            {isIncome ? 'Receita' : isExpense ? 'Despesa' : 'Reserva'}
                          </span>

                          {/* Bank Badge */}
                          <span
                            className="cf-bank-badge"
                            style={{
                              backgroundColor: `${bColor}15`,
                              color: bColor,
                              border: `1px solid ${bColor}35`,
                            }}
                            title={`Banco: ${currentBankName}`}
                          >
                            <span className="cf-bank-dot" style={{ backgroundColor: bColor }} />
                            {currentBankName}
                          </span>

                          <span>•</span>
                          <span>{tx.category}</span>
                          <span>•</span>
                          <span>{tx.account}</span>
                          <span>•</span>
                          <span>{new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="tx-col-right">
                      <span className={`tx-val-mono mono-number ${isIncome ? 'ren' : isExpense ? 'ko' : 'ten'}`}>
                        {isIncome ? '+' : isExpense ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </span>
                      <button
                        className="tx-delete-btn"
                        onClick={() => setTxToDelete(tx)}
                        title="Excluir Lançamento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.25rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filtered.length}{' '}
                    lançamentos no total)
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem',
                        opacity: currentPage === 1 ? 0.45 : 1,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      }}
                      title="Página Anterior"
                    >
                      <ChevronLeft size={15} /> Anterior
                    </button>

                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        if (
                          totalPages <= 7 ||
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => setCurrentPage(pageNum)}
                              style={{ minWidth: '32px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return (
                            <span
                              key={pageNum}
                              style={{
                                color: 'var(--text-dim)',
                                padding: '0 0.15rem',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem',
                        opacity: currentPage === totalPages ? 0.45 : 1,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      }}
                      title="Próxima Página"
                    >
                      Próxima <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Novo Lançamento Financeiro (Permite escolher entre bancos disponíveis) */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-tx-modal-title"
        >
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="add-tx-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                Novo Lançamento Financeiro
              </h3>
              <button
                className="btn-close"
                onClick={() => setShowAddModal(false)}
                title="Fechar modal"
                aria-label="Fechar modal de novo lançamento"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
            >
              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${type === 'ren' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setType('ren')}
                  style={{ fontSize: '0.8rem' }}
                >
                  Receita
                </button>
                <button
                  type="button"
                  className={`btn ${type === 'ko' ? 'btn-danger' : 'btn-outline'}`}
                  onClick={() => setType('ko')}
                  style={{ fontSize: '0.8rem' }}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  className={`btn ${type === 'ten' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setType('ten')}
                  style={{ fontSize: '0.8rem' }}
                >
                  Reserva
                </button>
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="tx-form-description">Descrição</label>
                <input
                  id="tx-form-description"
                  type="text"
                  placeholder="Ex: Salário, Aluguel, Supermercado..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="cf-input"
                  autoFocus
                />
              </div>

              {/* Amount and Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="tx-form-amount">Valor (R$)</label>
                  <input
                    id="tx-form-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="cf-input mono-number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tx-form-date">Data</label>
                  <input
                    id="tx-form-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="cf-input"
                  />
                </div>
              </div>

              {/* Bank Selector & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="tx-form-bank">Banco / Instituição</label>
                    <button
                      type="button"
                      onClick={() => setIsInlineAddingBank(!isInlineAddingBank)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {isInlineAddingBank ? 'Cancelar' : '+ Novo banco'}
                    </button>
                  </div>

                  {!isInlineAddingBank ? (
                    <select
                      id="tx-form-bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="cf-select"
                    >
                      {bankConfigs.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} (Lim. {formatCurrency(b.creditCardLimit)})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                      <input
                        type="text"
                        placeholder="Nome do banco (ex: BTG)"
                        value={inlineBankName}
                        onChange={(e) => setInlineBankName(e.target.value)}
                        className="cf-input"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <input
                          type="number"
                          placeholder="Limite Cartão (R$)"
                          value={inlineBankLimit}
                          onChange={(e) => setInlineBankLimit(e.target.value)}
                          className="cf-input"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={handleCreateInlineBank}
                          disabled={!inlineBankName.trim()}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="tx-form-category">Categoria</label>
                  <select
                    id="tx-form-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="cf-select"
                  >
                    <option value="Salário">Salário</option>
                    <option value="Rendimentos Extras">Rendimentos Extras</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Educação & Cursos">Educação & Cursos</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Reserva de Emergência">Reserva de Emergência</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              {/* Account Selection */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="tx-form-account">Conta de Movimentação</label>
                  {onOpenContabilizar && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        onOpenContabilizar();
                      }}
                      className="cf-link-btn"
                      title="Gerenciar contas e limites na aba Contabilizar"
                    >
                      <Settings size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                      Aba Contabilizar
                    </button>
                  )}
                </div>
                
                {accounts && accounts.length > 0 ? (
                  <select
                    id="tx-form-account"
                    value={selectedAccountId}
                    onChange={(e) => {
                      const accId = e.target.value;
                      setSelectedAccountId(accId);
                      const chosen = accounts.find((a) => a.id === accId);
                      if (chosen) {
                        setBankName(chosen.institutionName);
                        setAccount(chosen.name);
                        if (chosen.type === 'credit_card') {
                          setType('ko');
                        }
                      }
                    }}
                    className="cf-select"
                  >
                    {accounts.map((acc) => {
                      const typeLabel = ACCOUNT_TYPE_LABELS[acc.type] || acc.type;
                      const limitOrBalance = acc.type === 'credit_card'
                        ? `Lim. ${formatCurrency(acc.creditLimit || 0)}`
                        : `Saldo: ${formatCurrency(acc.balance || 0)}`;
                      return (
                        <option key={acc.id} value={acc.id}>
                          {acc.institutionName} • {acc.name} ({typeLabel} • {limitOrBalance})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <select
                    id="tx-form-account"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="cf-select"
                  >
                    <option value="Conta Corrente">Conta Corrente ({bankName})</option>
                    <option value="Cartão de Crédito">Cartão de Crédito ({bankName})</option>
                    <option value="Carteira">Carteira (Dinheiro em Mãos)</option>
                    <option value="Reserva de Emergência">Reserva de Emergência</option>
                  </select>
                )}
              </div>

              {/* Informative Account Limit & Rules Box */}
              {selectedAccount ? (
                <div
                  className={`cf-tx-account-callout ${
                    selectedAccount.type === 'credit_card' ? 'credit-card' : 'liquid'
                  } ${willExceedSelectedLimit ? 'warning' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {selectedAccount.type === 'credit_card' ? (
                        <CreditCard size={15} color="#820ad1" />
                      ) : (
                        <Landmark size={15} color="var(--color-primary)" />
                      )}
                      <strong style={{ fontSize: '0.85rem' }}>
                        {selectedAccount.institutionName} • {selectedAccount.name}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {ACCOUNT_TYPE_LABELS[selectedAccount.type]}
                    </span>
                  </div>

                  {selectedAccount.type === 'credit_card' ? (
                    <div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        <span>
                          Limite Total: <strong>{formatCurrency(selectedAccountLimit)}</strong>
                        </span>
                        <span>
                          Fatura/Uso: <strong>{formatCurrency(selectedAccountUsed)}</strong>
                        </span>
                        <span style={{ color: willExceedSelectedLimit ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                          Disponível: {formatCurrency(selectedAccountAvail)}
                        </span>
                      </div>
                      {willExceedSelectedLimit && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          <AlertCircle size={14} />
                          <span>Atenção: este lançamento de {formatCurrency(numEntered)} excede o limite disponível!</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                      <span>
                        Saldo Inicial/Atual: <strong style={{ color: '#10b981' }}>{formatCurrency(selectedAccount.balance || 0)}</strong>
                      </span>
                      {selectedAccount.creditLimit && selectedAccount.creditLimit > 0 ? (
                        <span style={{ marginLeft: '0.75rem' }}>
                          Cheque Especial: <strong>{formatCurrency(selectedAccount.creditLimit)}</strong>
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Account Explanation / Notes */}
                  {selectedAccount.notes && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.35rem',
                      fontSize: '0.73rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(0,0,0,0.02)',
                      padding: '0.3rem 0.5rem',
                      borderRadius: '4px',
                      marginTop: '0.25rem',
                    }}>
                      <Info size={12} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{selectedAccount.notes}</span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Notes */}
              <div className="form-group">
                <label htmlFor="tx-form-notes">Observações (opcional)</label>
                <input
                  id="tx-form-notes"
                  type="text"
                  placeholder="Detalhes ou anotações..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="cf-input"
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cf-btn-primary-blue">
                  <Plus size={15} aria-hidden="true" />
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Definir Limites de Cartão por Banco */}
      {showLimitsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowLimitsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-limits-modal-title"
        >
          <div
            className="modal-content cf-limits-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <CreditCard size={20} color="var(--color-primary)" />
                <div>
                  <h3 id="card-limits-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                    Limites de Cartão por Instituição
                  </h3>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Defina e ajuste o limite de crédito aprovado para cada um dos seus bancos.
                  </small>
                </div>
              </div>
              <button
                className="btn-close"
                onClick={() => setShowLimitsModal(false)}
                title="Fechar modal"
                aria-label="Fechar modal de limites de cartão"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="cf-limits-modal-body">
              {/* Consolidated Summary Banner */}
              <div className="cf-limits-summary-banner">
                <div className="cf-limits-banner-top">
                  <span className="cf-limits-banner-title">Consolidado Geral de Crédito</span>
                  <span className="cf-limits-banner-pct">{consolidatedUsagePercent}% Utilizado</span>
                </div>

                <div className="cf-limits-progress-track">
                  <div
                    className="cf-limits-progress-fill"
                    style={{
                      width: `${consolidatedUsagePercent}%`,
                      backgroundColor:
                        consolidatedUsagePercent >= 85
                          ? '#ef4444'
                          : consolidatedUsagePercent >= 60
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  />
                </div>

                <div className="cf-limits-banner-metrics">
                  <div className="cf-limits-metric-item">
                    <span className="cf-limits-metric-lbl">Limite Total Aprovado</span>
                    <span className="cf-limits-metric-val mono-number">
                      {formatCurrency(consolidatedTotalLimit)}
                    </span>
                  </div>
                  <div className="cf-limits-metric-item">
                    <span className="cf-limits-metric-lbl">Faturas Atuais (Usado)</span>
                    <span className="cf-limits-metric-val mono-number" style={{ color: '#f87171' }}>
                      {formatCurrency(consolidatedUsedLimit)}
                    </span>
                  </div>
                  <div className="cf-limits-metric-item">
                    <span className="cf-limits-metric-lbl">Limite Total Disponível</span>
                    <span className="cf-limits-metric-val mono-number" style={{ color: '#34d399' }}>
                      {formatCurrency(consolidatedAvailableLimit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Cards List */}
              <div className="cf-bank-limits-list">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Bancos Cadastrados ({bankConfigs.length})
                  </h4>
                  <button
                    type="button"
                    className="cf-btn-secondary"
                    onClick={() => setShowAddNewBankPanel(!showAddNewBankPanel)}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    <Plus size={14} />
                    <span>{showAddNewBankPanel ? 'Cancelar' : 'Cadastrar Novo Banco'}</span>
                  </button>
                </div>

                {/* Form to add new bank inside limits modal */}
                {showAddNewBankPanel && (
                  <form onSubmit={handleCreateNewBank} className="cf-add-bank-panel">
                    <h5 style={{ margin: '0 0 0.6rem 0', fontSize: '0.85rem', fontWeight: 700 }}>
                      Adicionar Nova Instituição
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.6rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nome do Banco</label>
                        <input
                          type="text"
                          placeholder="Ex: BTG Pactual, Safra, XP..."
                          value={newBankName}
                          onChange={(e) => setNewBankName(e.target.value)}
                          className="cf-input"
                          required
                          autoFocus
                          style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Limite do Cartão (R$)</label>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={newBankLimit}
                          onChange={(e) => setNewBankLimit(e.target.value)}
                          className="cf-input mono-number"
                          required
                          style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dia Fechamento</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={newBankClosing}
                          onChange={(e) => setNewBankClosing(e.target.value)}
                          className="cf-input mono-number"
                          style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dia Vencimento</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={newBankDue}
                          onChange={(e) => setNewBankDue(e.target.value)}
                          className="cf-input mono-number"
                          style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '0.6rem' }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cor de Identificação</label>
                      <div className="cf-color-palette-row">
                        {PRESET_COLORS.map((c) => (
                          <div
                            key={c}
                            className={`cf-color-dot-choice ${newBankColor === c ? 'selected' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewBankColor(c)}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowAddNewBankPanel(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="cf-btn-primary-blue" style={{ fontSize: '0.78rem' }}>
                        <Plus size={14} />
                        <span>Cadastrar Banco</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* List of existing bank limit cards */}
                {bankConfigs.map((b) => {
                  const invoice = getBankCardInvoice(b.name);
                  const limit = b.creditCardLimit || 0;
                  const available = Math.max(0, limit - invoice);
                  const usagePct = limit > 0 ? Math.min(100, Math.round((invoice / limit) * 100)) : 0;

                  return (
                    <div key={b.id} className="cf-bank-limit-card">
                      <div className="cf-bank-limit-header">
                        <div className="cf-bank-limit-title-wrap">
                          <div className="cf-bank-avatar" style={{ backgroundColor: b.color }}>
                            {b.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="cf-bank-limit-name">{b.name}</h4>
                            <span className="cf-bank-limit-sub">
                              Fechamento dia {b.closingDay || 10} • Vencimento dia {b.dueDay || 17}
                            </span>
                          </div>
                        </div>

                        <div className="cf-bank-limit-controls">
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>
                              Limite do Cartão
                            </label>
                            <input
                              type="number"
                              step="100"
                              min="0"
                              value={limit}
                              onChange={(e) => handleUpdateSingleLimit(b.id, Number(e.target.value) || 0)}
                              className="cf-bank-limit-input mono-number"
                              title={`Editar limite do cartão para ${b.name}`}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <button
                              type="button"
                              className="cf-quick-adjust-btn"
                              onClick={() => handleQuickAdjustLimit(b.id, 500)}
                              title="Aumentar R$ 500 no limite"
                            >
                              +500
                            </button>
                            <button
                              type="button"
                              className="cf-quick-adjust-btn"
                              onClick={() => handleQuickAdjustLimit(b.id, 1000)}
                              title="Aumentar R$ 1.000 no limite"
                            >
                              +1k
                            </button>
                          </div>

                          {bankConfigs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBank(b.id, b.name)}
                              className="tx-delete-btn"
                              title={`Remover ${b.name}`}
                              style={{ marginLeft: '0.25rem' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Usage Progress Bar */}
                      <div className="cf-limits-progress-track">
                        <div
                          className="cf-limits-progress-fill"
                          style={{
                            width: `${usagePct}%`,
                            backgroundColor: usagePct >= 85 ? '#ef4444' : usagePct >= 60 ? '#f59e0b' : '#10b981',
                          }}
                        />
                      </div>

                      <div className="cf-bank-limit-stats">
                        <span className="cf-stat-used">
                          Fatura atual: <strong>{formatCurrency(invoice)}</strong> ({usagePct}%)
                        </span>
                        <span className="cf-stat-avail">
                          Disponível: <strong>{formatCurrency(available)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '0.9rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="cf-btn-primary-blue"
                onClick={() => {
                  audioManager.playSuccessChime();
                  setShowLimitsModal(false);
                }}
              >
                Concluir & Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmação de Exclusão de Lançamento */}
      {txToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setTxToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-tx-modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <Trash2 size={18} aria-hidden="true" />
                <h3 id="delete-tx-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Excluir Lançamento
                </h3>
              </div>
              <button
                className="btn-close"
                onClick={() => setTxToDelete(null)}
                title="Fechar modal"
                aria-label="Fechar modal de exclusão"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tem certeza de que deseja excluir o lançamento <strong>"{txToDelete.description}"</strong> (
                {txToDelete.bankName || 'Nubank'}) no valor de <strong>{formatCurrency(txToDelete.amount)}</strong>? Esta
                ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setTxToDelete(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    onDeleteTransaction(txToDelete.id);
                    audioManager.playExpenseSound();
                    setTxToDelete(null);
                  }}
                >
                  Excluir Lançamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
