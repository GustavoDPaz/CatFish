import React, { useState } from 'react';
import type { Debt, DebtCategory } from '../types';
import { audioManager } from '../utils/audio';
import { getInstallmentDetails } from '../utils/installments';
import { Plus, CheckCircle, X, Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AprManagerViewProps {
  debts: Debt[];
  onAddDebt: (debt: Omit<Debt, 'id' | 'paidAmount' | 'status'>) => void;
  onPayDebt: (id: string, amount: number) => void;
  onPayOffDebt: (id: string) => void;
  onDeleteDebt: (id: string) => void;
}

export const AprManagerView: React.FC<AprManagerViewProps> = ({
  debts,
  onAddDebt,
  onPayDebt,
  onPayOffDebt,
  onDeleteDebt,
}) => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Last month helper for past month default
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const [showAddModal, setShowAddModal] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newInstallments, setNewInstallments] = useState(6);
  const [isCurrentMonth, setIsCurrentMonth] = useState(true);
  const [selectedPastMonth, setSelectedPastMonth] = useState(lastMonthStr);
  const [newCategory, setNewCategory] = useState<DebtCategory>('cartao_credito');
  const [newNotes, setNewNotes] = useState('');

  // Simulator state
  const [simPrincipal, setSimPrincipal] = useState(1800);
  const [simInstallments, setSimInstallments] = useState(6);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'cartao_credito': return 'Cartão de Crédito';
      case 'cartao_rotativo': return 'Cartão Rotativo';
      case 'emprestimo': return 'Empréstimo';
      case 'financiamento': return 'Financiamento';
      case 'cheque_especial': return 'Cheque Especial';
      default: return 'Outro';
    }
  };

  // Helper for live preview in modal
  const principalNum = Number(newPrincipal) || 0;
  const installmentVal = principalNum > 0 && newInstallments > 0 ? principalNum / newInstallments : 0;

  // Calculation for past month selection
  let elapsedPreview = 0;
  if (!isCurrentMonth && selectedPastMonth) {
    const [pYear, pMonth] = selectedPastMonth.split('-').map(Number);
    if (pYear && pMonth) {
      elapsedPreview = Math.max(0, (now.getFullYear() - pYear) * 12 + (now.getMonth() + 1 - pMonth));
    }
  }
  const paidCountPreview = Math.min(newInstallments, elapsedPreview);
  const currentInstallmentPreview = Math.min(newInstallments, paidCountPreview + 1);
  const remainingCountPreview = Math.max(0, newInstallments - paidCountPreview);
  const remainingAmountPreview = remainingCountPreview * installmentVal;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalNum || principalNum <= 0 || !newTitle.trim()) return;

    const startMonth = isCurrentMonth ? currentMonthStr : selectedPastMonth;
    const installments = Math.max(1, newInstallments);
    
    // Initial paid amount calculated if purchase was made in previous months
    const initialPaid = !isCurrentMonth ? Math.min(principalNum, paidCountPreview * (principalNum / installments)) : 0;

    onAddDebt({
      title: newTitle,
      principalAmount: principalNum,
      installmentsCount: installments,
      startMonth,
      startDate: `${startMonth}-01`,
      category: newCategory,
      notes: newNotes,
    });

    // If there were already paid installments from past months, record them immediately
    if (initialPaid > 0) {
      // The onAddDebt creates with paidAmount: 0, we can amortize right after or rely on storage
    }

    audioManager.playAprChime();
    setNewTitle('');
    setNewPrincipal('');
    setNewInstallments(6);
    setIsCurrentMonth(true);
    setNewNotes('');
    setShowAddModal(false);
  };

  const simMonthlyInstallment = simPrincipal > 0 && simInstallments > 0 ? simPrincipal / simInstallments : 0;

  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalRemaining = debts.filter(d => d.status === 'active').reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0);
  const activeDebts = debts.filter(d => d.status === 'active');
  const monthlyImpactTotal = activeDebts.reduce((sum, d) => {
    const details = getInstallmentDetails(d);
    return sum + details.installmentValue;
  }, 0);

  const displayTotalDebt = totalRemaining;
  const displayMonthly = monthlyImpactTotal;

  return (
    <div className="cf-dashboard-layout">
      {/* Top Greeting & Hero KPI Card */}
      <section className="cf-greeting-hero">
        <div className="cf-greeting-top-row">
          <span className="cf-greeting-date">Compromissos & parcelas</span>
          <span className={`cf-risk-mode-pill ${displayTotalDebt > 5000 ? 'cf-risk-mode-pill-danger' : ''}`}>
            <span className="cf-status-dot-active" />
            {displayTotalDebt > 5000 ? 'Atenção ao limite de dívidas' : 'Dívidas sob controle'}
          </span>
        </div>

        <h1 className="cf-greeting-title">Dívidas e parcelamentos</h1>
        <p className="cf-greeting-subtitle">
          Acompanhe suas obrigações financeiras, simule o impacto de compras parceladas e amortize parcelas ativas.
        </p>

        {/* 4-Column Metric Strip */}
        <div className="cf-hero-metrics-strip">
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Dívida total monitorada</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              {formatCurrency(displayTotalDebt)}
            </span>
            <span className="cf-metric-subtext">Passivo acumulado ativo</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Faturas do mês</span>
            <span className="cf-metric-value cf-val-blue mono-number">
              {formatCurrency(displayMonthly)}
            </span>
            <span className="cf-metric-subtext">Comprometimento mensal</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Total amortizado</span>
            <span className="cf-metric-value cf-val-green mono-number">
              {formatCurrency(totalPaid)}
            </span>
            <span className="cf-metric-subtext">Valores quitados</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Faturas ativas</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              {activeDebts.length}
            </span>
            <span className="cf-metric-subtext">Compromissos monitorados</span>
          </div>
        </div>
      </section>

      {/* 2-Column Grid */}
      <div className="cf-dashboard-two-col">
        {/* Left Column: Simulador de Impacto Financeiro */}
        <div className="cf-card">
          <div className="cf-card-header-row">
            <span className="cf-card-category-tag">Simulador de parcelas</span>
            <span className="cf-pill-stable-badge">Impacto mensal</span>
          </div>

          <h2 className="cf-card-main-title" style={{ marginBottom: '1.25rem' }}>Simulação de compras parceladas</h2>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Valor da compra (R$)</span>
                <span className="mono-number" style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatCurrency(simPrincipal)}
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="15000"
                step="50"
                value={simPrincipal}
                onChange={(e) => setSimPrincipal(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                aria-label="Simular valor total da compra parcelada"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quantidade de parcelas</span>
                <strong className="mono-number" style={{ color: 'var(--text-main)' }}>{simInstallments}x</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 6, 10, 12, 18, 24].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`btn btn-sm ${simInstallments === n ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSimInstallments(n)}
                    style={{ minWidth: '40px', padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px' }}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            {/* Impact Result Card */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderLeft: '3px solid var(--color-primary)', borderRadius: '0 10px 10px 0', padding: '1rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.03em' }}>
                Comprometimento mensal estimado
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.2rem 0' }}>
                <span className="mono-number" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-accent-blue)' }}>
                  {formatCurrency(simMonthlyInstallment)}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/mês</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Ocupará <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(simMonthlyInstallment)}</strong> do seu orçamento mensal durante {simInstallments} meses.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Faturas e Parcelamentos Monitorados */}
        <div className="cf-card">
          <div className="cf-card-header-row">
            <div>
              <span className="cf-card-category-tag">Suas obrigações</span>
              <h2 className="cf-card-main-title" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
                Faturas e parcelamentos
              </h2>
            </div>

            <button 
              className="cf-btn-primary-blue"
              onClick={() => setShowAddModal(true)}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              <Plus size={14} />
              <span>Nova fatura</span>
            </button>
          </div>

        {debts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma compra parcelada cadastrada.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {debts.map((debt) => {
              const details = getInstallmentDetails(debt);

              return (
                <div key={debt.id} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                        {getCategoryLabel(debt.category)}
                      </span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>{debt.title}</h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span className={`badge ${details.isPaid ? 'badge-ren' : 'badge-warning'}`}>
                        {details.isPaid ? 'Quitado' : `Parcela ${details.currentInstallment} de ${details.totalInstallments}`}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDebtToDelete(debt)}
                        title="Excluir compra parcelada"
                        style={{ padding: '0.25rem 0.4rem', color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Installment values box */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--bg-surface)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Saldo Restante</span>
                      <div className="mono-number" style={{ fontWeight: 700, fontSize: '1.1rem', color: details.isPaid ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {formatCurrency(details.remainingAmount)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Valor da Parcela</span>
                      <div className="mono-number" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                        {formatCurrency(details.installmentValue)}/mês
                      </div>
                    </div>
                  </div>

                  {/* Installment progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      <span>Progresso: {details.paidInstallments} de {details.totalInstallments} parcelas pagas</span>
                      <span className="mono-number">{details.progressPercent}%</span>
                    </div>
                    <div className="clean-track" style={{ height: '6px' }}>
                      <div
                        className="clean-bar"
                        style={{
                          width: `${details.progressPercent}%`,
                          background: details.isPaid ? 'var(--color-success)' : 'var(--color-primary)',
                        }}
                      ></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                      <span>Início: {details.startMonthLabel}</span>
                      <span>Término: {details.endMonthLabel}</span>
                    </div>
                  </div>

                  {!details.isPaid ? (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          onPayDebt(debt.id, details.installmentValue);
                          audioManager.playRenCoin();
                        }}
                        style={{ flex: 1 }}
                        title="Pagar a parcela do mês atual"
                      >
                        Pagar Parcela ({formatCurrency(details.installmentValue)})
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          onPayOffDebt(debt.id);
                          audioManager.playFanfare();
                          confetti({
                            particleCount: 50,
                            spread: 50,
                            origin: { y: 0.6 },
                          });
                        }}
                        title="Quitar todas as parcelas restantes"
                      >
                        Quitar Tudo
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600, marginTop: 'auto' }}>
                      <CheckCircle2 size={16} />
                      <span>Todas as parcelas foram quitadas!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* Add Debt Modal */}
      {showAddModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-debt-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-add-debt-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Cadastrar Compra Parcelada</h3>
              <button 
                className="btn-close" 
                onClick={() => setShowAddModal(false)} 
                title="Fechar modal"
                aria-label="Fechar modal de cadastro de compra parcelada"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="form-group">
                <label htmlFor="new-debt-title">Descrição da Compra</label>
                <input
                  id="new-debt-title"
                  type="text"
                  placeholder="Ex: Smartphone, Notebook, Pneu do Carro..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="cf-input"
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="new-debt-principal">Valor Total da Compra (R$)</label>
                  <input
                    id="new-debt-principal"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newPrincipal}
                    onChange={(e) => setNewPrincipal(e.target.value)}
                    required
                    className="cf-input mono-number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-debt-installments">Nº de Parcelas</label>
                  <input
                    id="new-debt-installments"
                    type="number"
                    min="1"
                    max="72"
                    step="1"
                    value={newInstallments}
                    onChange={(e) => setNewInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="cf-input mono-number"
                  />
                </div>
              </div>

              {/* Data / Mês da Compra Selector */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} color="var(--color-primary)" />
                  <span>Quando a compra foi realizada?</span>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${isCurrentMonth ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setIsCurrentMonth(true)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Este Mês (Atual)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${!isCurrentMonth ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setIsCurrentMonth(false)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Em Mês Anterior
                  </button>
                </div>

                {!isCurrentMonth && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                      Selecione o mês em que a compra foi feita:
                    </label>
                    <input
                      type="month"
                      max={currentMonthStr}
                      value={selectedPastMonth}
                      onChange={(e) => setSelectedPastMonth(e.target.value)}
                      className="cf-input"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Live Calculation Card */}
              {principalNum > 0 && (
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Valor de cada parcela:</span>
                    <strong className="mono-number" style={{ color: 'var(--color-primary)' }}>
                      {newInstallments}x de {formatCurrency(installmentVal)}
                    </strong>
                  </div>

                  {isCurrentMonth ? (
                    <div style={{ color: 'var(--color-success)', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <CheckCircle size={13} />
                      <span>A 1ª parcela começará a ser cobrada na fatura deste mês.</span>
                    </div>
                  ) : (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span>Parcelas já pagas ({elapsedPreview} meses):</span>
                        <strong className="mono-number">{paidCountPreview} de {newInstallments}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span>Parcela atual deste mês:</span>
                        <strong className="mono-number" style={{ color: 'var(--color-warning)' }}>
                          Parcela {currentInstallmentPreview} de {newInstallments}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>Restam a pagar:</span>
                        <strong className="mono-number">{remainingCountPreview} parcelas ({formatCurrency(remainingAmountPreview)})</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="new-debt-category">Tipo de Crédito</label>
                <select
                  id="new-debt-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as DebtCategory)}
                  className="cf-select"
                >
                  <option value="cartao_credito">Cartão de Crédito Parcelado</option>
                  <option value="financiamento">Financiamento</option>
                  <option value="emprestimo">Empréstimo Parcelado</option>
                  <option value="outro">Outro Parcelamento</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="new-debt-notes">Observações (Opcional)</label>
                <input
                  id="new-debt-notes"
                  type="text"
                  placeholder="Lembrete ou detalhes da compra..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="cf-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={15} aria-hidden="true" />
                  Salvar Compra Parcelada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Debt In-App Confirmation Modal */}
      {debtToDelete && (
        <div 
          className="modal-overlay" 
          onClick={() => setDebtToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-debt-modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <Trash2 size={18} aria-hidden="true" />
                <h3 id="delete-debt-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Excluir Compra Parcelada</h3>
              </div>
              <button 
                className="btn-close" 
                onClick={() => setDebtToDelete(null)} 
                title="Fechar modal"
                aria-label="Fechar modal de exclusão"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tem certeza de que deseja excluir a compra <strong>"{debtToDelete.title}"</strong>? Esta ação removerá o registro e todas as parcelas restantes do acompanhamento.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setDebtToDelete(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    onDeleteDebt(debtToDelete.id);
                    audioManager.playKoExpense();
                    setDebtToDelete(null);
                  }}
                >
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
