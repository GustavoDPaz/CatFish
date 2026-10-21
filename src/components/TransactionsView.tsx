import React, { useState, useEffect } from 'react';
import type { Transaction, TransactionType } from '../types';
import { audioManager } from '../utils/audio';
import { Plus, Search, Trash2, ArrowUpRight, ArrowDownRight, Lock, X, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenOfxModal?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onOpenOfxModal,
}) => {
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('despesa');
  const [category, setCategory] = useState('Alimentação');
  const [account, setAccount] = useState('Conta Corrente');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filtered = transactions.filter((tx) => {
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
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.account.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0 || !description.trim()) return;

    onAddTransaction({
      description,
      amount: num,
      type,
      category,
      account,
      date,
      notes,
    });

    if (type === 'ren') audioManager.playRenCoin();
    else if (type === 'ko') audioManager.playKoExpense();
    else audioManager.playAprChime();

    setDescription('');
    setAmount('');
    setNotes('');
    setShowAddModal(false);
  };

  const totalRen = transactions
    .filter((t) => t.type === 'ren' || t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalKo = transactions
    .filter((t) => t.type === 'ko' || t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0);

  const netTotal = totalRen - totalKo;

  return (
    <div className="cf-dashboard-layout">
      {/* Top Greeting & Hero KPI Card */}
      <section className="cf-greeting-hero">
        <div className="cf-greeting-top-row">
          <span className="cf-greeting-date">Extrato consolidado</span>
          <span className={`cf-risk-mode-pill ${netTotal < 0 ? 'cf-risk-mode-pill-danger' : ''}`}>
            <span className="cf-status-dot-active" />
            {netTotal >= 0 ? 'Saldo positivo' : 'Saldo negativo no período'}
          </span>
        </div>

        <h1 className="cf-greeting-title">Lançamentos e extrato</h1>
        <p className="cf-greeting-subtitle">
          Histórico consolidado de receitas, despesas e transferências com categorização e busca rápida.
        </p>

        {/* 4-Column Metric Strip */}
        <div className="cf-hero-metrics-strip">
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Saldo do período</span>
            <span className={`cf-metric-value mono-number ${netTotal >= 0 ? 'cf-val-green' : 'cf-val-dark'}`}>
              {netTotal >= 0 ? '+' : ''}{formatCurrency(netTotal)}
            </span>
            <span className="cf-metric-subtext">Resultado líquido</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Total de receitas</span>
            <span className="cf-metric-value cf-val-green mono-number">
              +{formatCurrency(totalRen)}
            </span>
            <span className="cf-metric-subtext">Entradas registradas</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Total de despesas</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              -{formatCurrency(totalKo)}
            </span>
            <span className="cf-metric-subtext">Saídas contabilizadas</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Registros</span>
            <span className="cf-metric-value cf-val-blue mono-number">
              {filtered.length}
            </span>
            <span className="cf-metric-subtext">Movimentações ativas</span>
          </div>
        </div>
      </section>

      {/* Main Transactions Card */}
      <div className="cf-card">
        {/* Clean Toolbar */}
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

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Buscar lançamento..."
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
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.95rem' }}
              >
                <FileSpreadsheet size={15} />
                <span>Importar OFX</span>
              </button>
            )}

            <button className="cf-btn-primary-blue" onClick={() => setShowAddModal(true)}>
              <Plus size={15} />
              <span>Novo lançamento</span>
            </button>
          </div>
        </div>

        {/* Transactions Container */}
        <div className="transactions-clean-section">
          {filtered.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhum lançamento encontrado.
            </div>
        ) : (
          <div className="clean-tx-list">
            {paginatedTransactions.map((tx) => {
              const isIncome = tx.type === 'ren' || tx.type === 'receita';
              const isExpense = tx.type === 'ko' || tx.type === 'despesa';
              const isReserve = tx.type === 'ten' || tx.type === 'reserva';

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
                      <div className="tx-sub-meta">
                        <span className={`badge badge-${isIncome ? 'ren' : isExpense ? 'ko' : 'ten'}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                          {isIncome ? 'Receita' : isExpense ? 'Despesa' : 'Reserva'}
                        </span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filtered.length} lançamentos no total)
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', opacity: currentPage === 1 ? 0.45 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
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
                          <span key={pageNum} style={{ color: 'var(--text-dim)', padding: '0 0.15rem', display: 'flex', alignItems: 'center' }}>
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
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', opacity: currentPage === totalPages ? 0.45 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
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

      {/* Add Modal */}
      {showAddModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-tx-modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="add-tx-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Novo Lançamento Financeiro</h3>
              <button 
                className="btn-close" 
                onClick={() => setShowAddModal(false)} 
                title="Fechar modal"
                aria-label="Fechar modal de novo lançamento"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="tx-form-amount">Valor (R$)</label>
                  <input
                    id="tx-form-amount"
                    type="number"
                    step="0.01"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="tx-form-account">Conta</label>
                  <select
                    id="tx-form-account"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="cf-select"
                  >
                    <option value="Conta Corrente">Conta Corrente</option>
                    <option value="Carteira">Carteira (Dinheiro em Mãos)</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Reserva de Emergência">Reserva de Emergência</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={15} aria-hidden="true" />
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP MODAL: Delete Transaction Confirmation */}
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
                <h3 id="delete-tx-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Excluir Lançamento</h3>
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
                Tem certeza de que deseja excluir o lançamento <strong>"{txToDelete.description}"</strong> no valor de <strong>{formatCurrency(txToDelete.amount)}</strong>? Esta ação não pode ser desfeita.
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
                    audioManager.playKoExpense();
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
