import React, { useState } from 'react';
import type { Transaction, Debt, UserProfile, CreditCardsSummary, FinancialAccount } from '../types';
import {
  Landmark,
  CreditCard,
  Wallet,
  Shield,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Sparkles,
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
  creditCardsSummary?: CreditCardsSummary;
  onOpenOpenFinance?: () => void;
  onOpenAiAssistant?: () => void;
  accounts?: FinancialAccount[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  debts,
  profile,
  onNavigateToDebts,
  onOpenFinancials,
  isRiskMode,
  creditCardsSummary,
  onOpenOpenFinance,
  onOpenAiAssistant,
  accounts,
}) => {
  const [isCardsExpanded, setIsCardsExpanded] = useState(false);
  // Financial Accounting
  const totalIncome = transactions
    .filter((t) => t.type === 'receita' || t.type === 'ren')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'despesa' || t.type === 'ko')
    .reduce((sum, t) => sum + t.amount, 0);

  const getAccountLiveBalance = (acc: FinancialAccount) => {
    const net = transactions
      .filter((t) => {
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
    return (acc.balance || 0) + net;
  };

  const manualChecking = accounts?.filter((a) => a.type === 'checking') || [];
  const manualWallet = accounts?.filter((a) => a.type === 'wallet') || [];
  const manualReserve = accounts?.filter((a) => a.type === 'emergency_fund') || [];

  const netBankTx = transactions
    .filter((t) => t.account === 'Conta Corrente')
    .reduce((sum, t) => (t.type === 'receita' || t.type === 'ren') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const netWalletTx = transactions
    .filter((t) => t.account === 'Carteira')
    .reduce((sum, t) => (t.type === 'receita' || t.type === 'ren') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const netReserveTx = transactions
    .filter((t) => t.type === 'reserva' || t.type === 'ten' || t.account === 'Reserva de Emergência')
    .reduce((sum, t) => (t.type === 'receita' || t.type === 'ren' || t.type === 'reserva' || t.type === 'ten') ? sum + t.amount : (t.type === 'despesa' || t.type === 'ko') ? sum - t.amount : sum, 0);

  const currentBank = manualChecking.length > 0
    ? manualChecking.reduce((s, a) => s + getAccountLiveBalance(a), 0)
    : (profile.bankBalance ?? 4200) + netBankTx;

  const currentWallet = manualWallet.length > 0
    ? manualWallet.reduce((s, a) => s + getAccountLiveBalance(a), 0)
    : (profile.walletBalance ?? 0) + netWalletTx;

  const currentReserve = manualReserve.length > 0
    ? manualReserve.reduce((s, a) => s + getAccountLiveBalance(a), 0)
    : (profile.emergencyFundBalance ?? 0) + netReserveTx;

  const cardExpenses = transactions
    .filter((t) => t.account === 'Cartão de Crédito' && (t.type === 'despesa' || t.type === 'ko'))
    .reduce((sum, t) => sum + t.amount, 0);

  const cardDebts = debts
    .filter((d) => d.category === 'cartao_credito' && d.status === 'active')
    .reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0);

  const totalCardInvoice = cardExpenses + cardDebts;
  const creditLimit = profile.creditCardLimit ?? 5000;
  const creditUsagePct = creditLimit > 0 ? Math.min(100, Math.round((totalCardInvoice / creditLimit) * 100)) : 0;

  // Resolve list of active cards (either from Open Finance if present, or fallback card from profile + local invoice)
  const hasOpenFinanceCards = Boolean(creditCardsSummary?.cards && creditCardsSummary.cards.length > 0);

  const fallbackCard = {
    accountId: 'card-default',
    institutionName: profile.bankName || 'Banco Principal',
    cardName: 'Cartão Principal',
    totalLimit: creditLimit,
    usedLimit: totalCardInvoice,
    availableLimit: Math.max(0, creditLimit - totalCardInvoice),
    usagePercent: creditUsagePct,
    closingDay: 15,
    dueDay: 22,
    color: '#10b981',
  };

  const cardsList = hasOpenFinanceCards ? creditCardsSummary!.cards : [fallbackCard];

  // Consolidated Credit Card Metrics (all cards limits and debts summed)
  const totalCardsLimit = cardsList.reduce((sum, c) => sum + (Number(c.totalLimit) || 0), 0);
  const totalCardsUsed = cardsList.reduce((sum, c) => sum + (Number(c.usedLimit) || 0), 0);
  const totalCardsAvailable = Math.max(0, totalCardsLimit - totalCardsUsed);
  const consolidatedCardUsagePct = totalCardsLimit > 0 ? Math.min(100, Math.round((totalCardsUsed / totalCardsLimit) * 100)) : 0;

  // Active non-credit-card debts (loans, personal financing, installment obligations)
  const activeDebtsExcludingCards = debts
    .filter((d) => d.status === 'active' && d.category !== 'cartao_credito')
    .reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0);

  // Total debt calculation: all non-card debts + all credit cards used amounts
  const totalDebt = activeDebtsExcludingCards + totalCardsUsed;

  // Total debt capacity / ceiling:
  // Must accommodate the user's total approved credit limits + any safe capacity
  const safeCapacity = profile.maxDebtCapacity || profile.maxAuraCapacity || 0;
  const debtCap = Math.max(safeCapacity, totalCardsLimit, totalDebt > 0 ? totalDebt : 5000);
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {onOpenAiAssistant && (
              <button 
                className="cf-pill-ia" 
                onClick={onOpenAiAssistant}
                title="Abrir Assistente Financeiro IA"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '3px 8px' }}
              >
                <Sparkles size={11} />
                <span>Análise com IA</span>
              </button>
            )}
            <span className={`cf-risk-mode-pill ${isRiskMode ? 'cf-risk-mode-pill-danger' : ''}`}>
              <span className="cf-status-dot-active" />
              {isRiskMode ? 'Modo de risco ativo' : 'Finanças estáveis'}
            </span>
          </div>
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
                  {isRiskMode ? 'Priorize o pagamento de parcelas para reduzir os juros acumulados.' : 'Mantenha os pagamentos em dia para evitar juros.'}
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

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {onOpenOpenFinance && (
                <button
                  className="cf-pill-open-finance"
                  onClick={onOpenOpenFinance}
                  title="Gerenciar Contas Conectadas Open Finance"
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  <Landmark size={12} />
                  <span>Open Finance</span>
                </button>
              )}
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
          </div>

          <div className="cf-accounts-list">
            {/* Account 1: Checking Accounts */}
            {manualChecking.length > 0 ? (
              manualChecking.map((acc) => {
                const liveBal = getAccountLiveBalance(acc);
                const bColor = acc.color || '#10b981';
                return (
                  <div
                    key={acc.id}
                    className="cf-account-item"
                    onClick={onOpenFinancials}
                    role="button"
                    tabIndex={0}
                    title="Clique para ajustar dados no Contabilizar"
                    aria-label={`Conta bancária: ${acc.institutionName} - ${acc.name}, saldo: ${formatCurrency(liveBal)}`}
                  >
                    <div className="cf-acc-icon-box" style={{ backgroundColor: `${bColor}18`, color: bColor }}>
                      <Landmark size={20} aria-hidden="true" />
                    </div>
                    <div className="cf-acc-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span className="cf-acc-name">{acc.name}</span>
                        <span className="cf-acc-badge-pill" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', backgroundColor: `${bColor}15`, color: bColor }}>
                          {acc.institutionName}
                        </span>
                      </div>
                      <span className="cf-acc-sub">{acc.notes || 'Conta corrente'}</span>
                    </div>
                    <div className="cf-acc-right">
                      <span className="cf-acc-val mono-number">
                        {formatCurrency(liveBal)}
                      </span>
                      <ChevronRight size={16} className="cf-acc-chevron" aria-hidden="true" />
                    </div>
                  </div>
                );
              })
            ) : (
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
                aria-label={`Conta bancária: ${profile.bankName || 'Banco Principal'}, saldo: ${formatCurrency(currentBank)}`}
              >
                <div className="cf-acc-icon-box cf-icon-picpay">
                  <Landmark size={20} aria-hidden="true" />
                </div>
                <div className="cf-acc-info">
                  <span className="cf-acc-name">{profile.bankName || 'Banco Principal'}</span>
                  <span className="cf-acc-sub">Banco principal</span>
                </div>
                <div className="cf-acc-right">
                  <span className="cf-acc-val mono-number">
                    {formatCurrency(currentBank)}
                  </span>
                  <ChevronRight size={16} className="cf-acc-chevron" aria-hidden="true" />
                </div>
              </div>
            )}

            {/* Account 2: Carteira */}
            {manualWallet.length > 0 ? (
              manualWallet.map((acc) => {
                const liveBal = getAccountLiveBalance(acc);
                return (
                  <div 
                    key={acc.id}
                    className="cf-account-item"
                    onClick={onOpenFinancials}
                    role="button"
                    tabIndex={0}
                    title="Clique para ajustar dados no Contabilizar"
                  >
                    <div className="cf-acc-icon-box cf-icon-wallet">
                      <Wallet size={20} aria-hidden="true" />
                    </div>
                    <div className="cf-acc-info">
                      <span className="cf-acc-name">{acc.name}</span>
                      <span className="cf-acc-sub">{acc.notes || 'Dinheiro em mãos'}</span>
                    </div>
                    <div className="cf-acc-right">
                      <span className="cf-acc-val mono-number">
                        {formatCurrency(liveBal)}
                      </span>
                      <ChevronRight size={16} className="cf-acc-chevron" aria-hidden="true" />
                    </div>
                  </div>
                );
              })
            ) : (
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
            )}

            {/* Account 3: Cartão de Crédito (Consolidado + Drill-down) */}
            <div className="cf-card-drilldown-wrapper">
              <div 
                className="cf-account-item"
                onClick={() => setIsCardsExpanded((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsCardsExpanded((prev) => !prev);
                  }
                }}
                title={`Clique para alternar entre limites consolidados e individuais. Disponível total: ${formatCurrency(totalCardsAvailable)}`}
                aria-label={`Cartões de crédito consolidados: limite total ${formatCurrency(totalCardsLimit)}, usado ${formatCurrency(totalCardsUsed)}`}
              >
                <div className="cf-acc-icon-box cf-icon-card">
                  <CreditCard size={20} aria-hidden="true" />
                </div>
                <div className="cf-acc-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="cf-acc-name">Cartões de crédito</span>
                    {cardsList.length > 1 && (
                      <span className="cf-card-count-badge">
                        {cardsList.length} cartões
                      </span>
                    )}
                  </div>
                  <span className="cf-acc-sub">
                    {totalCardsLimit > 0
                      ? `Limite usado em ${consolidatedCardUsagePct}% de ${formatCurrency(totalCardsLimit)}`
                      : `Limite usado em ${consolidatedCardUsagePct}%`
                    }
                  </span>
                </div>
                <div className="cf-acc-right">
                  <span className="cf-acc-val mono-number">
                    -{formatCurrency(totalCardsUsed)}
                  </span>
                  {isCardsExpanded ? (
                    <ChevronUp size={16} className="cf-acc-chevron" aria-hidden="true" />
                  ) : (
                    <ChevronDown size={16} className="cf-acc-chevron" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/* Expandable Drill-down Sub-cards */}
              {isCardsExpanded && (
                <div className="cf-cards-drilldown-list">
                  {cardsList.map((card) => (
                    <div key={card.accountId} className="cf-subcard-item">
                      <div className="cf-subcard-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="cf-subcard-dot" style={{ backgroundColor: card.color || '#6366f1' }} />
                          <div>
                            <span className="cf-subcard-title">{card.cardName}</span>
                            <span className="cf-subcard-inst">{card.institutionName}</span>
                          </div>
                        </div>
                        <span className="cf-subcard-val mono-number">
                          -{formatCurrency(card.usedLimit)}
                        </span>
                      </div>

                      {/* Usage bar */}
                      <div className="cf-subcard-track">
                        <div 
                          className="cf-subcard-fill" 
                          style={{ width: `${Math.min(100, card.usagePercent)}%` }} 
                        />
                      </div>

                      <div className="cf-subcard-footer">
                        <span>Disponível: <strong className="mono-number">{formatCurrency(card.availableLimit)}</strong> de {formatCurrency(card.totalLimit)}</span>
                        <span className="cf-subcard-dates">
                          <Calendar size={11} /> Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
