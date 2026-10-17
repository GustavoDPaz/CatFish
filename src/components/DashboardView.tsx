import React from 'react';
import type { Transaction, Debt, UserProfile } from '../types';
import {
  Landmark,
  CreditCard,
  Wallet,
  Shield,
  ChevronRight,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  transactions: Transaction[];
  debts: Debt[];
  profile: UserProfile;
  onOpenNewTransaction: () => void;
  onPayDebt: (debtId: string, amount: number) => void;
  onPayOffDebt: (debtId: string) => void;
  onNavigateToDebts: () => void;
  onNavigateToTransactions: () => void;
  onTriggerZetsuModal?: () => void;
  onTriggerRiskModal?: () => void;
  onDeleteTransaction?: (id: string) => void;
  onOpenFinancials?: () => void;
  isRiskMode?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  debts,
  profile,
  onNavigateToDebts,
  onOpenFinancials,
  isRiskMode,
}) => {
  // Financial Accounting
  const totalIncome = transactions
    .filter((t) => t.type === 'receita' || t.type === 'ren')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'despesa' || t.type === 'ko')
    .reduce((sum, t) => sum + t.amount, 0);

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
  const currentWallet = (profile.walletBalance ?? 0) + netWalletTx;
  const currentReserve = (profile.emergencyFundBalance ?? 0) + netReserveTx;

  const cardExpenses = transactions
    .filter((t) => t.account === 'Cartão de Crédito' && (t.type === 'despesa' || t.type === 'ko'))
    .reduce((sum, t) => sum + t.amount, 0);

  const cardDebts = debts
    .filter((d) => d.category === 'cartao_credito' && d.status === 'active')
    .reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0);

  const totalCardInvoice = cardExpenses + cardDebts;
  const creditLimit = profile.creditCardLimit ?? 5000;
  const creditUsagePct = creditLimit > 0 ? Math.min(100, Math.round((totalCardInvoice / creditLimit) * 100)) : 0;

  // Total debt calculation
  const calculatedDebt = debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0);
  const totalDebt = calculatedDebt;

  const safeCapacity = profile.maxDebtCapacity || profile.maxAuraCapacity || 0;
  const debtCap = safeCapacity > 0 ? safeCapacity : (totalDebt > 0 ? totalDebt : 5000);
  const debtUsagePct = debtCap > 0 ? Math.min(100, Math.round((totalDebt / debtCap) * 100)) : 0;

  // Consolidated Net Worth
  const totalNetWorth = currentBank + currentWallet + currentReserve;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Dynamic date in uppercase Portuguese (e.g., QUARTA-FEIRA, 04 DE OUTUBRO)
  const todayFormatted = (() => {
    try {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long' };
      return new Intl.DateTimeFormat('pt-BR', options).format(now).toUpperCase();
    } catch {
      return 'QUARTA-FEIRA, 04 DE OUTUBRO';
    }
  })();

  const incomeTxCount = transactions.filter((t) => t.type === 'receita' || t.type === 'ren').length;
  const expenseTxCount = transactions.filter((t) => t.type === 'despesa' || t.type === 'ko').length;

  return (
    <div className="cf-dashboard-layout">
      {/* Top Greeting & Hero KPI Card */}
      <section className="cf-greeting-hero">
        <div className="cf-greeting-top-row">
          <span className="cf-greeting-date">
            {todayFormatted}
          </span>
          <span className={`cf-risk-mode-pill ${isRiskMode ? 'cf-risk-mode-pill-danger' : ''}`}>
            <span className="cf-status-dot-active" />
            {isRiskMode ? 'Modo de risco ativo' : 'Finanças estáveis'}
          </span>
        </div>

        <h1 className="cf-greeting-title">
          Olá, {profile.name || 'Gustavo'}
        </h1>
        <p className="cf-greeting-subtitle">
          Um panorama direto para você tomar melhores decisões hoje.
        </p>

        {/* 4-Column Metric Strip */}
        <div className="cf-hero-metrics-strip">
          {/* Column 1: Patrimônio Atual */}
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Patrimônio atual</span>
            <span className="cf-metric-value cf-val-blue mono-number">
              {formatCurrency(totalNetWorth)}
            </span>
            <span className="cf-metric-subtext">
              Saldo consolidado entre suas contas
            </span>
          </div>

          {/* Column 2: Receita Mensal */}
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Receita mensal</span>
            <span className="cf-metric-value cf-val-green mono-number">
              +{formatCurrency(totalIncome)}
            </span>
            <span className="cf-metric-subtext">
              {incomeTxCount > 0 ? `${incomeTxCount} lançamentos registrados` : 'Sem entradas neste mês'}
            </span>
          </div>

          {/* Column 3: Despesas do Mês */}
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Despesas do mês</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              -{formatCurrency(totalExpenses)}
            </span>
            <span className="cf-metric-subtext">
              {expenseTxCount > 0 ? `${expenseTxCount} lançamento(s) registrado(s)` : 'Sem despesas registradas'}
            </span>
          </div>

          {/* Column 4: Reserva de Emergência */}
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Reserva de emergência</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              {formatCurrency(currentReserve)}
            </span>
            <span className="cf-metric-subtext">
              {currentReserve > 0 ? 'Fundo seguro ativo' : 'Meta ainda não iniciada'}
            </span>
          </div>
        </div>
      </section>

      {/* Lower 2-Column Section */}
      <div className="cf-dashboard-two-col">
        {/* Left Column: Alerta Financeiro (Dívida Total Monitorada) */}
        <div className="cf-card cf-debt-alert-card">
          <div className="cf-card-header-row">
            <span className="cf-card-category-tag">Monitor de dívidas</span>
            <span className={totalDebt === 0 ? 'cf-pill-stable-badge' : isRiskMode ? 'cf-pill-critical-badge' : 'cf-pill-stable-badge'}>
              {totalDebt === 0 ? 'Dívidas zeradas' : isRiskMode ? 'Nível crítico' : 'Sob controle'}
            </span>
          </div>

          <h2 className="cf-card-main-title">
            {totalDebt === 0 ? 'Finanças protegidas' : isRiskMode ? 'Sua dívida merece atenção' : 'Dívidas sob controle'}
          </h2>

          <div className="cf-debt-monitor-block">
            <span className="cf-debt-monitor-label">Dívida total monitorada</span>
            <div className="cf-debt-huge-amount mono-number">
              {formatCurrency(totalDebt)}
            </div>

            {/* Cyan to Emerald Gradient Progress Bar */}
            <div className="cf-debt-progress-container">
              <div className="cf-debt-pct-row">
                <span className="cf-debt-pct-bold mono-number">{debtUsagePct}%</span>
                <span className="cf-debt-pct-sub">do limite usado</span>
              </div>

              <div className="cf-debt-progress-track">
                <div 
                  className="cf-debt-progress-fill" 
                  style={{ width: `${Math.min(100, Math.max(totalDebt === 0 ? 0 : 5, debtUsagePct))}%` }}
                />
              </div>

              <div className="cf-debt-limits-row">
                <span>R$ 0</span>
                <span>Limite: {formatCurrency(debtCap)}</span>
              </div>
            </div>

            {/* Alert Callout Box */}
            {totalDebt > 0 ? (
              <div className="cf-alert-callout-box">
                <div className="cf-callout-icon-row">
                  <TrendingDown size={17} className="cf-callout-icon" />
                  <span className="cf-callout-title">{isRiskMode ? 'Você ultrapassou o teto seguro' : 'Parcelas sob monitoramento'}</span>
                </div>
                <p className="cf-callout-desc">
                  {isRiskMode ? 'Priorize a amortização para reduzir os juros acumulados.' : 'Mantenha os pagamentos em dia para evitar juros.'}
                </p>
              </div>
            ) : (
              <div className="cf-alert-callout-box" style={{ background: 'var(--color-success-subtle)', borderColor: 'var(--color-success-border)' }}>
                <div className="cf-callout-icon-row">
                  <CheckCircle2 size={17} style={{ color: 'var(--color-success)' }} />
                  <span className="cf-callout-title" style={{ color: 'var(--color-success)' }}>Nenhum débito pendente</span>
                </div>
                <p className="cf-callout-desc" style={{ color: 'var(--text-secondary)' }}>
                  Excelente! Você não possui faturas atrasadas ou compras parceladas ativas.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="cf-debt-actions-row">
              <button 
                className="cf-btn-primary-blue"
                onClick={onNavigateToDebts}
              >
                <span>Simular juros</span>
                <ArrowRight size={15} />
              </button>

              <button 
                className="cf-link-blue"
                onClick={onNavigateToDebts}
              >
                <span>Ver todas as dívidas</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Seu Dinheiro (Contas e Carteiras) */}
        <div className="cf-card cf-accounts-card">
          <div className="cf-card-header-row">
            <div>
              <span className="cf-card-category-tag">Seu dinheiro</span>
              <h2 className="cf-card-main-title" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
                Contas e carteiras
              </h2>
            </div>

            {onOpenFinancials && (
              <button 
                className="cf-link-blue cf-adjust-limits-btn"
                onClick={onOpenFinancials}
                title="Ajustar limites e saldos"
              >
                Ajustar limites
              </button>
            )}
          </div>

          <div className="cf-accounts-list">
            {/* Account 1: PicPay / Banco Principal */}
            <div 
              className="cf-account-item"
              onClick={onOpenFinancials}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenFinancials?.();
                }
              }}
              title="Clique para ajustar dados bancários"
              aria-label={`Conta bancária: ${profile.bankName || 'PicPay'}, saldo: ${formatCurrency(currentBank)}`}
            >
              <div className="cf-acc-icon-box cf-icon-picpay">
                <Landmark size={20} aria-hidden="true" />
              </div>
              <div className="cf-acc-info">
                <span className="cf-acc-name">{profile.bankName || 'PicPay'}</span>
                <span className="cf-acc-sub">Banco principal</span>
              </div>
              <div className="cf-acc-right">
                <span className="cf-acc-val mono-number">
                  {formatCurrency(currentBank)}
                </span>
                <ChevronRight size={16} className="cf-acc-chevron" aria-hidden="true" />
              </div>
            </div>

            {/* Account 2: Carteira */}
            <div 
              className="cf-account-item"
              onClick={onOpenFinancials}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenFinancials?.();
                }
              }}
              title="Clique para ajustar saldo da carteira"
              aria-label={`Carteira física, saldo: ${formatCurrency(currentWallet)}`}
            >
              <div className="cf-acc-icon-box cf-icon-wallet">
                <Wallet size={20} aria-hidden="true" />
              </div>
              <div className="cf-acc-info">
                <span className="cf-acc-name">Carteira</span>
                <span className="cf-acc-sub">Dinheiro em mãos</span>
              </div>
              <div className="cf-acc-right">
                <span className="cf-acc-val mono-number">
                  {formatCurrency(currentWallet)}
                </span>
                <ChevronRight size={16} className="cf-acc-chevron" aria-hidden="true" />
              </div>
            </div>

            {/* Account 3: Cartão de Crédito */}
            <div 
              className="cf-account-item"
              onClick={onOpenFinancials}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenFinancials?.();
                }
              }}
              title="Clique para ajustar limite e fatura do cartão"
              aria-label={`Cartão de crédito, fatura acumulada: ${formatCurrency(totalCardInvoice)}, limite usado em ${creditUsagePct}%`}
            >
              <div className="cf-acc-icon-box cf-icon-card">
                <CreditCard size={20} aria-hidden="true" />
              </div>
              <div className="cf-acc-info">
                <span className="cf-acc-name">Cartão de crédito</span>
                <span className="cf-acc-sub">Limite usado em {creditUsagePct}%</span>
              </div>
              <div className="cf-acc-right">
                <span className="cf-acc-val mono-number">
                  -{formatCurrency(totalCardInvoice)}
                </span>
                <ChevronRight size={16} className="cf-acc-chevron" aria-hidden="true" />
              </div>
            </div>

            {/* Account 4: Reserva de Emergência */}
            <div 
              className="cf-account-item"
              onClick={onOpenFinancials}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenFinancials?.();
                }
              }}
              title="Clique para ajustar reserva de emergência"
              aria-label={`Reserva de emergência, saldo guardado: ${formatCurrency(currentReserve)}`}
            >
              <div className="cf-acc-icon-box cf-icon-reserve">
                <Shield size={20} aria-hidden="true" />
              </div>
              <div className="cf-acc-info">
                <span className="cf-acc-name">Reserva de emergência</span>
                <span className="cf-acc-sub">Fundo seguro</span>
              </div>
              <div className="cf-acc-right">
                <span className="cf-acc-val mono-number">
                  {formatCurrency(currentReserve)}
                </span>
                <ChevronRight size={16} className="cf-acc-chevron" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
