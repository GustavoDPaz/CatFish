import React, { useState } from 'react';
import type { Transaction, BudgetLimit } from '../types';
import { Radio, AlertCircle, CheckCircle, Edit2, Save, Plus, Trash2, X } from 'lucide-react';

interface EnRadarViewProps {
  transactions: Transaction[];
  budgets: BudgetLimit[];
  onUpdateBudget: (category: string, newLimit: number) => void;
  onAddBudget: (newBudget: BudgetLimit) => void;
  onDeleteBudget: (category: string) => void;
}

export const EnRadarView: React.FC<EnRadarViewProps> = ({
  transactions,
  budgets,
  onUpdateBudget,
  onAddBudget,
  onDeleteBudget,
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLimitVal, setEditLimitVal] = useState<string>('');

  // Add category modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');

  // Delete category confirmation state
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const spentMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'ko')
    .forEach((t) => {
      spentMap[t.category] = (spentMap[t.category] || 0) + t.amount;
    });

  const handleStartEdit = (b: BudgetLimit) => {
    setEditingCategory(b.category);
    setEditLimitVal(b.limit.toString());
  };

  const handleSaveEdit = (category: string) => {
    const num = Number(editLimitVal);
    if (num && num > 0) {
      onUpdateBudget(category, num);
    }
    setEditingCategory(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = Number(newCatLimit);
    if (!newCatName.trim() || !limitNum || limitNum <= 0) return;

    onAddBudget({
      category: newCatName.trim(),
      limit: limitNum,
      icon: 'Tag',
    });

    setNewCatName('');
    setNewCatLimit('');
    setShowAddModal(false);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      onDeleteBudget(categoryToDelete);
      setCategoryToDelete(null);
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = Object.values(spentMap).reduce((sum, val) => sum + val, 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const overallUsagePct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return (
    <div className="cf-dashboard-layout">
      {/* Top Greeting & Hero KPI Card */}
      <section className="cf-greeting-hero">
        <div className="cf-greeting-top-row">
          <span className="cf-greeting-date">Orçamento planejado</span>
          <span className={`cf-risk-mode-pill ${overallUsagePct >= 85 ? 'cf-risk-mode-pill-danger' : ''}`}>
            <span className="cf-status-dot-active" />
            {overallUsagePct >= 85 ? 'Teto em risco' : 'Orçamento equilibrado'}
          </span>
        </div>

        <h1 className="cf-greeting-title">Limite de gastos por categoria</h1>
        <p className="cf-greeting-subtitle">
          Defina tetos financeiros inteligentes para evitar surpresas no fim do mês e manter sua saúde financeira.
        </p>

        {/* 4-Column Metric Strip */}
        <div className="cf-hero-metrics-strip">
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Orçamento total</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              {formatCurrency(totalBudget)}
            </span>
            <span className="cf-metric-subtext">Teto mensal consolidado</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Gasto acumulado</span>
            <span className="cf-metric-value cf-val-blue mono-number">
              {formatCurrency(totalSpent)}
            </span>
            <span className="cf-metric-subtext">Total consumido no mês</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Saldo restante</span>
            <span className="cf-metric-value cf-val-green mono-number">
              {formatCurrency(remainingBudget)}
            </span>
            <span className="cf-metric-subtext">Margem disponível</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Uso global</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              {overallUsagePct}%
            </span>
            <span className="cf-metric-subtext">{budgets.length} categorias ativas</span>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <div className="cf-card">
        <div className="cf-card-header-row" style={{ marginBottom: '1.25rem' }}>
          <div>
            <span className="cf-card-category-tag">Categorias monitoradas</span>
            <h2 className="cf-card-main-title" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
              Tetos por categoria
            </h2>
          </div>

          <button className="cf-btn-primary-blue" onClick={() => setShowAddModal(true)}>
            <Plus size={15} />
            <span>Nova categoria</span>
          </button>
        </div>

        {budgets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Radio size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--text-main)' }}>Nenhum limite de categoria cadastrado</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Defina limites para suas categorias clicando em "Nova categoria".
            </p>
            <button className="cf-btn-primary-blue" onClick={() => setShowAddModal(true)} style={{ marginTop: '1rem' }}>
              <Plus size={15} />
              <span>Cadastrar categoria</span>
            </button>
          </div>
        ) : (
        <div className="cf-cards-grid">
          {budgets.map((b) => {
            const spent = spentMap[b.category] || 0;
            const ratio = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            const isOver = spent > b.limit;
            const isWarning = ratio >= 80 && !isOver;

            return (
              <div key={b.category} className="cf-budget-card">
                {/* Header: Category Name + % + Edit/Delete */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
                      {b.category}
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }} className="mono-number">
                      {ratio.toFixed(0)}% utilizado
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleStartEdit(b)}
                      title="Editar Limite"
                      style={{ padding: '0.2rem 0.35rem', color: '#64748b' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCategoryToDelete(b.category)}
                      title="Excluir Limite"
                      style={{ padding: '0.2rem 0.35rem', color: '#dc2626' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Cyan to Emerald Gradient Progress Bar */}
                <div className="cf-debt-progress-track" style={{ height: '6px', margin: '0.1rem 0' }}>
                  <div
                    className="cf-debt-progress-fill"
                    style={{
                      width: `${Math.min(100, ratio)}%`,
                      background: isOver ? '#ef4444' : 'linear-gradient(90deg, #06b6d4, #10b981)',
                    }}
                  />
                </div>

                {/* Values row: Gasto vs Teto Máximo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Gasto</span>
                    <span className="mono-number" style={{ fontWeight: 700, fontSize: '0.88rem', color: isOver ? 'var(--color-danger)' : 'var(--text-main)' }}>
                      {formatCurrency(spent)}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Teto Máximo</span>
                    {editingCategory === b.category ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          min="0"
                          max="999999999"
                          value={editLimitVal}
                          onChange={(e) => setEditLimitVal(e.target.value)}
                          className="cf-input mono-number"
                          style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.78rem' }}
                          autoFocus
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(b.category)} style={{ padding: '0.2rem 0.4rem' }}>
                          <Save size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="mono-number" style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        {formatCurrency(b.limit)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ marginTop: '0.15rem' }}>
                  {isOver ? (
                    <span className="cf-budget-status-pill" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)' }}>
                      <AlertCircle size={12} /> Limite ultrapassado em {formatCurrency(spent - b.limit)}
                    </span>
                  ) : isWarning ? (
                    <span className="cf-budget-status-pill" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning)', border: '1px solid var(--color-warning-border)' }}>
                      <AlertCircle size={12} /> Atenção: Próximo ao limite
                    </span>
                  ) : (
                    <span className="cf-budget-status-pill" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)' }}>
                      <CheckCircle size={12} /> Dentro do planejado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* IN-APP MODAL: Add Category */}
      {showAddModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-budget-modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 id="add-budget-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Nova Categoria de Limite</h3>
              <button 
                className="btn-close" 
                onClick={() => setShowAddModal(false)} 
                title="Fechar modal"
                aria-label="Fechar modal de nova categoria"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="form-group">
                <label htmlFor="budget-cat-name">Nome da Categoria</label>
                <input
                  id="budget-cat-name"
                  type="text"
                  placeholder="Ex: Assinaturas, Pet, Lazer..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  maxLength={50}
                  className="cf-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="budget-cat-limit">Teto Mensal de Gastos (R$)</label>
                <input
                  id="budget-cat-limit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="999999999"
                  placeholder="Ex: 500,00"
                  value={newCatLimit}
                  onChange={(e) => setNewCatLimit(e.target.value)}
                  required
                  className="cf-input mono-number"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={15} aria-hidden="true" />
                  Cadastrar Limite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP MODAL: Delete Category Confirmation */}
      {categoryToDelete && (
        <div 
          className="modal-overlay" 
          onClick={() => setCategoryToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-budget-modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <Trash2 size={18} aria-hidden="true" />
                <h3 id="delete-budget-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Excluir Categoria</h3>
              </div>
              <button 
                className="btn-close" 
                onClick={() => setCategoryToDelete(null)} 
                title="Fechar modal"
                aria-label="Fechar modal de exclusão"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tem certeza de que deseja remover o limite da categoria <strong>"{categoryToDelete}"</strong>? O histórico de lançamentos não será apagado, apenas a regra de teto desta categoria.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setCategoryToDelete(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
                >
                  Excluir Limite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
