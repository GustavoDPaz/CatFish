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
  onUpdateAccounts?: (accounts: FinancialAccount[]) => void;
  onOpenContabilizar?: () => void;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente',
  credit_card: 'Cartão de Crédito',
  emergency_fund: 'Reserva de Emergência',
  wallet: 'Dinheiro em Mãos',
  investment: 'Investimentos',
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
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
  const [paymentMethod, setPaymentMethod] = useState<'debit' | 'credit'>('debit');

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

  // Real Card Accounts (Contas correntes com cartão habilitado ou cartões dedicados)
  const realCardAccounts = useMemo(() => {
    return accounts.filter(
      (a) => (a.type === 'checking' && a.hasCreditCard) || a.type === 'credit_card'
    );
  }, [accounts]);

  // Real Card Invoices: expenses where paymentMethod === 'credit' or account === 'Cartão de Crédito'
  const getAccountCardInvoice = (acc: FinancialAccount): number => {
    return transactions
      .filter(
        (t) =>
          ((t.account === acc.name && t.paymentMethod === 'credit') ||
            (t.account === acc.name && acc.type === 'credit_card') ||
            (t.bankName?.toLowerCase() === acc.institutionName.toLowerCase() &&
              (t.account === 'Cartão de Crédito' || t.paymentMethod === 'credit'))) &&
          (t.type === 'despesa' || t.type === 'ko')
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Consolidated Credit Card Metrics: strictly tied to real accounts with credit card
  const consolidatedTotalLimit = realCardAccounts.reduce(
    (sum, a) => sum + (Number(a.creditLimit) || 0),
    0
  );

  const consolidatedUsedLimit = realCardAccounts.reduce(
    (sum, a) => sum + getAccountCardInvoice(a),
    0
  );

  const consolidatedAvailableLimit = Math.max(0, consolidatedTotalLimit - consolidatedUsedLimit);
  const consolidatedUsagePercent =
    consolidatedTotalLimit > 0
      ? Math.min(100, Math.round((consolidatedUsedLimit / consolidatedTotalLimit) * 100))
      : 0;

  // Period totals
  const totalRen = transactions
    .filter((t) => t.type === 'ren' || t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalKo = transactions
    .filter((t) => t.type === 'ko' || t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const netTotal = totalRen - totalKo;

  const numEntered = Number(amount) || 0;

  // Search & Filter ranking by relevance (por Lançamento, Banco ou Categoria)
  const q = searchQuery.toLowerCase().trim();

  const computeRelevance = (tx: Transaction): number => {
    if (!q) return 1;
    const desc = (tx.description || '').toLowerCase();
    const notes = (tx.notes || '').toLowerCase();
    const bank = (tx.bankName || '').toLowerCase();
    const acc = (tx.account || '').toLowerCase();
    const cat = (tx.category || '').toLowerCase();

    let score = 0;
    // 1. Banco (prioridade de busca por banco)
    if (bank === q || acc === q) score += 100;
    else if (bank.startsWith(q) || acc.startsWith(q)) score += 60;
    else if (bank.includes(q) || acc.includes(q)) score += 30;

    // 2. Categoria / Tipo de Gasto
    if (cat === q) score += 80;
    else if (cat.startsWith(q)) score += 50;
    else if (cat.includes(q)) score += 25;

    // 3. Lançamento (Descrição / Notas)
    if (desc === q) score += 90;
    else if (desc.startsWith(q)) score += 55;
    else if (desc.includes(q) || notes.includes(q)) score += 35;

    return score;
  };

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        // 1. Filtro por Tipo (Receita, Despesa, Reserva)
        if (filterType !== 'all') {
          if (filterType === 'ren' || filterType === 'receita') {
            if (tx.type !== 'ren' && tx.type !== 'receita') return false;
          } else if (filterType === 'ko' || filterType === 'despesa') {
            if (tx.type !== 'ko' && tx.type !== 'despesa') return false;
          } else if (filterType === 'ten' || filterType === 'reserva') {
            if (tx.type !== 'ten' && tx.type !== 'reserva') return false;
          } else if ((tx.type as string) !== (filterType as string)) {
            return false;
          }
        }

        // 2. Busca por Lançamento, Banco ou Categoria
        if (q) {
          return computeRelevance(tx) > 0;
        }

        return true;
      })
      .sort((a, b) => {
        if (q) {
          const scoreB = computeRelevance(b);
          const scoreA = computeRelevance(a);
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [transactions, filterType, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  // Adjust page if items were deleted and page is now empty
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Selected manual account details
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const hasAccountCard = Boolean(selectedAccount?.hasCreditCard || selectedAccount?.type === 'credit_card');
  const isCreditMode = (selectedAccount?.type === 'credit_card') || (hasAccountCard && paymentMethod === 'credit');

  const selectedAccountLimit = isCreditMode ? (selectedAccount?.creditLimit || 0) : 0;
  const selectedAccountUsed = selectedAccount
    ? transactions
        .filter(
          (t) =>
            ((t.account === selectedAccount.name && t.paymentMethod === 'credit') ||
             (t.account === selectedAccount.name && selectedAccount.type === 'credit_card') ||
             (t.bankName?.toLowerCase() === selectedAccount.institutionName.toLowerCase() && (t.account === 'Cartão de Crédito' || t.paymentMethod === 'credit'))) &&
            (t.type === 'despesa' || t.type === 'ko')
        )
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;
  const selectedAccountAvail = Math.max(0, selectedAccountLimit - selectedAccountUsed);
  const willExceedSelectedLimit =
    isCreditMode && numEntered > 0 && numEntered > selectedAccountAvail;

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
      type: isCreditMode ? 'ko' : type,
      category,
      account: finalAccount,
      bankName: finalBank,
      paymentMethod: isCreditMode ? 'credit' : 'debit',
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

  return (
    <div className="cf-dashboard-layout">
      {/* Top Greeting & Hero KPI Card */}
      <section className="cf-greeting-hero">
        <div className="cf-greeting-top-row">
          <span className="cf-greeting-date">
            Extrato consolidado • Multi-bancos
          </span>
          <span className={`cf-risk-mode-pill ${netTotal < 0 ? 'cf-risk-mode-pill-danger' : ''}`}>
            <span className="cf-status-dot-active" />
            {netTotal >= 0 ? 'Saldo geral positivo' : 'Saldo geral negativo'}
          </span>
        </div>

        <h1 className="cf-greeting-title">
          Lançamentos e extrato
        </h1>
        <p className="cf-greeting-subtitle">
          Histórico consolidado de receitas, despesas e cartões com busca unificada por lançamento, banco ou categoria.
        </p>

        {/* 4-Column Metric Strip */}
        <div className="cf-hero-metrics-strip">
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">
              Saldo do período
            </span>
            <span className={`cf-metric-value mono-number ${netTotal >= 0 ? 'cf-val-green' : 'cf-val-dark'}`}>
              {netTotal >= 0 ? '+' : ''}
              {formatCurrency(netTotal)}
            </span>
            <span className="cf-metric-subtext">Resultado líquido</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">
              Total de receitas
            </span>
            <span className="cf-metric-value cf-val-green mono-number">+{formatCurrency(totalRen)}</span>
            <span className="cf-metric-subtext">Entradas registradas</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">
              Total de despesas
            </span>
            <span className="cf-metric-value cf-val-dark mono-number">-{formatCurrency(totalKo)}</span>
            <span className="cf-metric-subtext">Saídas contabilizadas</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">
              Limite dos Cartões
            </span>
            <span className="cf-metric-value cf-val-blue mono-number" style={{ fontSize: '1.05rem' }}>
              {formatCurrency(consolidatedUsedLimit)}
            </span>
            <span className="cf-metric-subtext">
              de {formatCurrency(consolidatedTotalLimit)} ({consolidatedUsagePercent}% • {formatCurrency(consolidatedAvailableLimit)} disp.)
            </span>
          </div>
        </div>
      </section>

      {/* Main Transactions Card */}
      <div className="cf-card">
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

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '440px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="text"
                placeholder="Buscar por lançamento, banco ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="clean-search-input"
                style={{ width: '100%', paddingLeft: '2.2rem', paddingRight: searchQuery ? '2.2rem' : '0.75rem' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
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
                Nenhum lançamento encontrado com os filtros atuais.
              </p>
              <button
                type="button"
                className="cf-btn-secondary"
                onClick={() => {
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
                          {(tx.paymentMethod === 'credit' || tx.account === 'Cartão de Crédito') && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: '#820ad1',
                                fontWeight: 600,
                                background: 'rgba(130, 10, 209, 0.1)',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              title="Lançamento efetuado via Cartão de Crédito"
                            >
                              <CreditCard size={11} />
                              Crédito
                            </span>
                          )}
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
                          setPaymentMethod('credit');
                        } else if (chosen.hasCreditCard) {
                          // Keep existing paymentMethod or default to debit
                        } else {
                          setPaymentMethod('debit');
                        }
                      }
                    }}
                    className="cf-select"
                  >
                    {accounts.map((acc) => {
                      const typeLabel = ACCOUNT_TYPE_LABELS[acc.type] || acc.type;
                      const hasCardBadge = acc.hasCreditCard ? ' • 💳 Cartão' : '';
                      const limitOrBalance = (acc.hasCreditCard || acc.type === 'credit_card')
                        ? `Saldo: ${formatCurrency(acc.balance || 0)} | Lim. ${formatCurrency(acc.creditLimit || 0)}`
                        : `Saldo: ${formatCurrency(acc.balance || 0)}`;
                      return (
                        <option key={acc.id} value={acc.id}>
                          {acc.institutionName} • {acc.name} ({typeLabel}{hasCardBadge} — {limitOrBalance})
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

              {/* Payment Method Selector if Account has Coupled Credit Card */}
              {hasAccountCard && selectedAccount?.type !== 'credit_card' && (
                <div style={{ marginTop: '0.65rem', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                    Forma de Lançamento nesta Conta:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('debit')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        border: paymentMethod === 'debit' ? '2px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.12)',
                        background: paymentMethod === 'debit' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
                        color: paymentMethod === 'debit' ? 'var(--color-primary)' : 'var(--text-secondary)',
                        fontWeight: paymentMethod === 'debit' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Landmark size={14} />
                      <span>Saldo em Conta (Débito)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('credit');
                        setType('ko');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        border: paymentMethod === 'credit' ? '2px solid #820ad1' : '1px solid rgba(0,0,0,0.12)',
                        background: paymentMethod === 'credit' ? 'rgba(130, 10, 209, 0.12)' : 'var(--bg-surface)',
                        color: paymentMethod === 'credit' ? '#820ad1' : 'var(--text-secondary)',
                        fontWeight: paymentMethod === 'credit' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <CreditCard size={14} />
                      <span>Cartão de Crédito (Fatura)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Informative Account Limit & Rules Box */}
              {selectedAccount ? (
                <div
                  className={`cf-tx-account-callout ${
                    isCreditMode ? 'credit-card' : 'liquid'
                  } ${willExceedSelectedLimit ? 'warning' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {isCreditMode ? (
                        <CreditCard size={15} color="#820ad1" />
                      ) : (
                        <Landmark size={15} color="var(--color-primary)" />
                      )}
                      <strong style={{ fontSize: '0.85rem' }}>
                        {selectedAccount.institutionName} • {selectedAccount.name}
                        {hasAccountCard && (
                          <span style={{ fontSize: '0.74rem', marginLeft: '6px', color: isCreditMode ? '#820ad1' : 'var(--color-primary)', fontWeight: 600 }}>
                            ({isCreditMode ? '💳 Cartão de Crédito' : '🏦 Saldo em Conta'})
                          </span>
                        )}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {ACCOUNT_TYPE_LABELS[selectedAccount.type]}
                    </span>
                  </div>

                  {isCreditMode ? (
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
                      {hasAccountCard && selectedAccount.creditLimit && selectedAccount.creditLimit > 0 ? (
                        <span style={{ marginLeft: '0.75rem', color: '#820ad1', fontWeight: 600 }}>
                          💳 Cartão Vinculado: {formatCurrency(selectedAccount.creditLimit)}
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
