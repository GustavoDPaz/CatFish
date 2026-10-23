import React, { useState, useEffect, useCallback } from 'react';
import type { UserProfile, FinancialAccount, AccountType } from '../types';
import { audioManager } from '../utils/audio';
import { 
  X, 
  ShieldCheck, 
  Save, 
  Landmark, 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  User, 
  Volume2, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Info, 
  Calendar,
  Sparkles
} from 'lucide-react';

interface ProfileModalProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onClose: () => void;
  initialTab?: 'financial' | 'profile';
  accounts: FinancialAccount[];
  onUpdateAccounts: (accounts: FinancialAccount[]) => void;
}

const PRESET_BANK_COLORS = [
  '#820AD1', // Nubank
  '#FF7A00', // Inter
  '#EC7000', // Itaú
  '#CC092F', // Bradesco
  '#242424', // C6 Bank
  '#EA1D2C', // Santander
  '#003882', // BB
  '#0066B3', // Caixa
  '#10B981', // Verde / Carteira
];

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  credit_card: 'Cartão de Crédito',
  emergency_fund: 'Reserva de Emergência',
  wallet: 'Dinheiro em Mãos',
  investment: 'Investimentos',
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  onSave,
  onClose,
  initialTab = 'financial',
  accounts,
  onUpdateAccounts,
}) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'profile'>(initialTab);

  // Profile data
  const [name, setName] = useState(profile.name || '');
  const [title, setTitle] = useState(profile.title || '');
  const [affinity, setAffinity] = useState(profile.financialProfile || profile.nenAffinity || 'Planejador');
  const [soundEnabled, setSoundEnabled] = useState(profile.soundEnabled ?? true);

  // Global Financial Limits
  const [maxDebt, setMaxDebt] = useState<number | string>(profile.maxDebtCapacity ?? profile.maxAuraCapacity ?? 12000);
  const [monthlyIncome, setMonthlyIncome] = useState<number | string>(profile.monthlyIncome ?? 7500);

  // Local Accounts List
  const [accountsList, setAccountsList] = useState<FinancialAccount[]>(accounts || []);

  // Account Form State (for adding or editing)
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [formAccountName, setFormAccountName] = useState('');
  const [formInstitution, setFormInstitution] = useState('');
  const [formType, setFormType] = useState<AccountType>('checking');
  const [formHasCreditCard, setFormHasCreditCard] = useState(false);
  const [formBalance, setFormBalance] = useState<string>('0');
  const [formCreditLimit, setFormCreditLimit] = useState<string>('0');
  const [formClosingDay, setFormClosingDay] = useState<string>('10');
  const [formDueDay, setFormDueDay] = useState<string>('17');
  const [formColor, setFormColor] = useState('#820AD1');
  const [formNotes, setFormNotes] = useState('');

  const numMaxDebt = Number(maxDebt) || 0;
  const numIncome = Number(monthlyIncome) || 0;

  // Live totals derived from accounts list
  const totalCheckingBalance = accountsList
    .filter((a) => a.type === 'checking')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const totalCreditLimit = accountsList.reduce((sum, a) => {
    if ((a.type === 'checking' && a.hasCreditCard) || a.type === 'credit_card') {
      return sum + (Number(a.creditLimit) || 0);
    }
    return sum;
  }, 0);

  const totalReserveBalance = accountsList
    .filter((a) => a.type === 'emergency_fund')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const totalWalletBalance = accountsList
    .filter((a) => a.type === 'wallet')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const resetAccountForm = () => {
    setIsEditingAccount(false);
    setEditingAccountId(null);
    setFormAccountName('');
    setFormInstitution('');
    setFormType('checking');
    setFormHasCreditCard(false);
    setFormBalance('0');
    setFormCreditLimit('0');
    setFormClosingDay('10');
    setFormDueDay('17');
    setFormColor('#820AD1');
    setFormNotes('');
  };

  const handleOpenAddAccount = () => {
    resetAccountForm();
    setIsEditingAccount(true);
    setFormAccountName('Conta Corrente Principal');
    setFormInstitution('Nubank');
    setFormType('checking');
    setFormHasCreditCard(true);
    setFormBalance('1000');
    setFormCreditLimit('3500');
    setFormClosingDay('5');
    setFormDueDay('12');
    setFormColor('#820AD1');
    setFormNotes('Conta para movimentação com cartão de crédito integrado.');
  };

  const handleOpenEditAccount = (acc: FinancialAccount) => {
    setEditingAccountId(acc.id);
    setFormAccountName(acc.name);
    setFormInstitution(acc.institutionName);
    const resolvedType = acc.type === 'credit_card' ? 'checking' : acc.type;
    setFormType(resolvedType);
    setFormHasCreditCard(Boolean(acc.hasCreditCard || acc.type === 'credit_card' || (acc.type === 'checking' && (acc.creditLimit || 0) > 0)));
    setFormBalance(String(acc.balance ?? 0));
    setFormCreditLimit(String(acc.creditLimit ?? 3500));
    setFormClosingDay(String(acc.closingDay ?? 10));
    setFormDueDay(String(acc.dueDay ?? 17));
    setFormColor(acc.color || '#820AD1');
    setFormNotes(acc.notes || '');
    setIsEditingAccount(true);
  };

  const handleSaveAccountForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccountName.trim() || !formInstitution.trim()) return;

    const parsedBalance = parseFloat(formBalance) || 0;
    const parsedCreditLimit = parseFloat(formCreditLimit) || 0;
    const parsedClosing = parseInt(formClosingDay, 10) || 10;
    const parsedDue = parseInt(formDueDay, 10) || 17;

    const isChecking = formType === 'checking';
    const effectiveHasCard = isChecking ? formHasCreditCard : formType === 'credit_card';

    if (editingAccountId) {
      // Update existing account
      setAccountsList((prev) =>
        prev.map((acc) => {
          if (acc.id === editingAccountId) {
            return {
              ...acc,
              name: formAccountName.trim(),
              institutionName: formInstitution.trim(),
              type: formType,
              balance: parsedBalance,
              hasCreditCard: effectiveHasCard,
              creditLimit: effectiveHasCard ? parsedCreditLimit : 0,
              closingDay: effectiveHasCard ? parsedClosing : undefined,
              dueDay: effectiveHasCard ? parsedDue : undefined,
              color: formColor,
              notes: formNotes.trim(),
            };
          }
          return acc;
        })
      );
    } else {
      // Create new account
      const newAccount: FinancialAccount = {
        id: `acc-${Date.now()}`,
        name: formAccountName.trim(),
        institutionName: formInstitution.trim(),
        type: formType,
        balance: parsedBalance,
        hasCreditCard: effectiveHasCard,
        creditLimit: effectiveHasCard ? parsedCreditLimit : 0,
        closingDay: effectiveHasCard ? parsedClosing : undefined,
        dueDay: effectiveHasCard ? parsedDue : undefined,
        color: formColor,
        notes: formNotes.trim(),
      };
      setAccountsList((prev) => [...prev, newAccount]);
    }

    resetAccountForm();
  };

  const handleDeleteAccount = (accId: string, accName: string) => {
    if (accountsList.length <= 1) {
      alert('Você deve manter pelo menos uma conta cadastrada para contabilização.');
      return;
    }
    if (window.confirm(`Tem certeza de que deseja remover a conta "${accName}"?`)) {
      setAccountsList((prev) => prev.filter((a) => a.id !== accId));
      if (editingAccountId === accId) {
        resetAccountForm();
      }
    }
  };

  const handleSaveAll = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let currentAccounts = [...accountsList];
    if (isEditingAccount && formInstitution.trim() && formAccountName.trim()) {
      const numBal = Number(formBalance) || 0;
      const numCred = Number(formCreditLimit) || 0;
      const closing = Number(formClosingDay) || 10;
      const due = Number(formDueDay) || 17;

      if (editingAccountId) {
        currentAccounts = currentAccounts.map((a) =>
          a.id === editingAccountId
            ? {
                ...a,
                name: formAccountName.trim(),
                institutionName: formInstitution.trim(),
                type: formType,
                balance: numBal,
                hasCreditCard: formType === 'checking' ? formHasCreditCard : false,
                creditLimit:
                  (formType === 'checking' && formHasCreditCard) || formType === 'credit_card'
                    ? numCred
                    : undefined,
                color: formColor,
                closingDay:
                  (formType === 'checking' && formHasCreditCard) || formType === 'credit_card'
                    ? closing
                    : undefined,
                dueDay:
                  (formType === 'checking' && formHasCreditCard) || formType === 'credit_card'
                    ? due
                    : undefined,
                notes: formNotes.trim() || undefined,
              }
            : a
        );
      } else {
        const newAcc: FinancialAccount = {
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: formAccountName.trim(),
          institutionName: formInstitution.trim(),
          type: formType,
          balance: numBal,
          hasCreditCard: formType === 'checking' ? formHasCreditCard : false,
          creditLimit:
            (formType === 'checking' && formHasCreditCard) || formType === 'credit_card'
              ? numCred
              : undefined,
          color: formColor,
          closingDay:
            (formType === 'checking' && formHasCreditCard) || formType === 'credit_card'
              ? closing
              : undefined,
          dueDay:
            (formType === 'checking' && formHasCreditCard) || formType === 'credit_card'
              ? due
              : undefined,
          notes: formNotes.trim() || undefined,
        };
        currentAccounts = [...currentAccounts, newAcc];
      }
    }

    // Persist accounts
    onUpdateAccounts(currentAccounts);

    // Persist profile
    const primaryChecking = currentAccounts.find((a) => a.type === 'checking');
    const totChecking = currentAccounts
      .filter((a) => a.type === 'checking')
      .reduce((s, a) => s + (a.balance || 0), 0);
    const totWallet = currentAccounts
      .filter((a) => a.type === 'wallet')
      .reduce((s, a) => s + (a.balance || 0), 0);
    const totReserve = currentAccounts
      .filter((a) => a.type === 'emergency_fund')
      .reduce((s, a) => s + (a.balance || 0), 0);
    const totCredit = currentAccounts
      .filter((a) => (a.type === 'checking' && a.hasCreditCard) || a.type === 'credit_card')
      .reduce((s, a) => s + (a.creditLimit || 0), 0);

    onSave({
      ...profile,
      name: name.trim() || 'Usuário',
      title: title.trim() || 'Planejamento Pessoal',
      financialProfile: affinity,
      nenAffinity: affinity,
      soundEnabled,
      bankName: primaryChecking?.institutionName || profile.bankName || 'Banco Principal',
      bankBalance: totChecking,
      walletBalance: totWallet,
      emergencyFundBalance: totReserve,
      creditCardLimit: totCredit,
      maxDebtCapacity: numMaxDebt,
      maxAuraCapacity: numMaxDebt,
      monthlyIncome: numIncome,
    });

    audioManager.playSuccessChime();
    onClose();
  }, [
    accountsList,
    isEditingAccount,
    formInstitution,
    formAccountName,
    formBalance,
    formCreditLimit,
    formClosingDay,
    formDueDay,
    editingAccountId,
    formType,
    formHasCreditCard,
    formColor,
    formNotes,
    onUpdateAccounts,
    onSave,
    profile,
    name,
    title,
    affinity,
    soundEnabled,
    numMaxDebt,
    numIncome,
    onClose,
  ]);

  // Keyboard navigation: ESC closes modal, ENTER saves current state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'textarea') return;
        e.preventDefault();
        handleSaveAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSaveAll]);

  const accountId = profile.accountId || profile.hunterId || 'CF-2026-1920';

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'checking':
        return <Landmark size={18} />;
      case 'credit_card':
        return <CreditCard size={18} />;
      case 'emergency_fund':
        return <ShieldCheck size={18} />;
      case 'wallet':
        return <Wallet size={18} />;
      case 'investment':
        return <TrendingUp size={18} />;
      default:
        return <Landmark size={18} />;
    }
  };

  return (
    <div 
      className="modal-overlay" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div 
        className="modal-content profile-edit-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="var(--color-primary)" aria-hidden="true" />
            <h3 id="profile-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Contabilizar • Contas & Limites Manuais
            </h3>
          </div>
          <button 
            className="btn-close" 
            onClick={onClose} 
            title="Fechar modal"
            aria-label="Fechar modal de perfil e finanças"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Dynamic Physical Card Preview */}
        <div className="clean-license-card" style={{ margin: '1rem 1.25rem 0.75rem' }}>
          <div className="clean-license-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 700 }}>Cartão CatFish</span>
              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.2)' }}>
                {accountId}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
              Pessoal • Gestão Financeira
            </span>
          </div>

          <div className="clean-license-body">
            <div className="license-avatar-clean" style={{ background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff' }}>
              {(name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="license-info-clean" style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{name || 'Usuário'}</h3>
              <p style={{ margin: '0.15rem 0 0.5rem', opacity: 0.9 }}>
                {title || 'Planejamento Pessoal'} • Perfil: {affinity}
              </p>
              
              {/* Live Preview Chips */}
              <div className="license-chips-row">
                <div className="license-chip">
                  <span className="chip-label">Saldo Banco:</span>
                  <span className="chip-val">{formatCurrency(totalCheckingBalance)}</span>
                </div>
                <div className="license-chip">
                  <span className="chip-label">Lim. Cartões:</span>
                  <span className="chip-val">{formatCurrency(totalCreditLimit)}</span>
                </div>
                <div className="license-chip">
                  <span className="chip-label">Reserva:</span>
                  <span className="chip-val">{formatCurrency(totalReserveBalance)}</span>
                </div>
                <div className="license-chip">
                  <span className="chip-label">Carteira:</span>
                  <span className="chip-val">{formatCurrency(totalWalletBalance)}</span>
                </div>
                <div className="license-chip warning">
                  <span className="chip-label">Teto Dívida:</span>
                  <span className="chip-val">{formatCurrency(numMaxDebt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="modal-tab-header">
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => setActiveTab('financial')}
          >
            <Wallet size={15} />
            <span>Contabilizar Contas & Limites</span>
            <span className="tab-pill-badge">{accountsList.length} contas</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={15} />
            <span>Perfil & Identificação</span>
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSaveAll} style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* TAB 1: FINANCIAL DATA & MANUAL ACCOUNTS */}
          {activeTab === 'financial' && (
            <div className="tab-section-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="helper-banner">
                <HelpCircle size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span>
                  Cadastre e gerencie suas contas manuais, saldos e limites de crédito. Cada conta inserida aqui fica imediatamente disponível para lançamentos, Open Finance e painéis de saldo.
                </span>
              </div>

              {/* Contas Cadastradas Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="form-section-title" style={{ margin: 0 }}>
                  <Landmark size={16} color="var(--color-primary)" />
                  <span>Contas Manuais para Lançamentos ({accountsList.length})</span>
                </div>
                {!isEditingAccount && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleOpenAddAccount}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={14} />
                    <span>Nova Conta</span>
                  </button>
                )}
              </div>

              {/* Account Form Modal / Inline Editor */}
              {isEditingAccount && (
                <div className="cf-account-inline-card">
                  <div className="cf-account-inline-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Sparkles size={16} color="var(--color-primary)" />
                      <strong style={{ fontSize: '0.92rem' }}>
                        {editingAccountId ? 'Editar Conta Manual' : 'Adicionar Nova Conta Manual'}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={resetAccountForm}
                      title="Cancelar edição de conta"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="form-grid-2col" style={{ marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label>Nome da Conta</label>
                      <input
                        type="text"
                        placeholder="Ex: Conta Corrente Itaú, Cartão Nubank..."
                        value={formAccountName}
                        onChange={(e) => setFormAccountName(e.target.value)}
                        required
                        maxLength={50}
                        className="cf-input"
                        autoFocus
                      />
                    </div>

                    <div className="form-group">
                      <label>Instituição / Banco</label>
                      <input
                        type="text"
                        placeholder="Ex: Nubank, Itaú, Banco Inter, Carteira..."
                        value={formInstitution}
                        onChange={(e) => setFormInstitution(e.target.value)}
                        required
                        maxLength={50}
                        className="cf-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2col" style={{ marginTop: '0.65rem' }}>
                    <div className="form-group">
                      <label>Tipo de Conta</label>
                      <select
                        value={formType}
                        onChange={(e) => {
                          const newType = e.target.value as AccountType;
                          setFormType(newType);
                          if (newType !== 'checking') {
                            setFormHasCreditCard(false);
                          }
                        }}
                        className="cf-select"
                      >
                        <option value="checking">Conta Corrente (com ou sem Cartão)</option>
                        <option value="wallet">Dinheiro em Mãos (Carteira)</option>
                        <option value="emergency_fund">Reserva de Emergência</option>
                        <option value="investment">Investimentos</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        Saldo Atual Disponível (R$)
                      </label>
                      <div className="input-currency-wrapper">
                        <span className="currency-prefix">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          max="999999999"
                          min="-999999999"
                          placeholder="0,00"
                          value={formBalance}
                          onChange={(e) => setFormBalance(e.target.value)}
                          required
                          className="cf-input mono-number input-with-prefix"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checking Account: Coupled Credit Card Option */}
                  {formType === 'checking' && (
                    <div style={{ marginTop: '0.85rem' }}>
                      <div
                        onClick={() => setFormHasCreditCard(!formHasCreditCard)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          background: formHasCreditCard ? 'rgba(130, 10, 209, 0.08)' : 'rgba(0,0,0,0.02)',
                          border: formHasCreditCard ? '1px solid #820ad1' : '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <CreditCard size={18} color={formHasCreditCard ? '#820ad1' : 'var(--text-muted)'} />
                          <div>
                            <strong style={{ fontSize: '0.85rem', color: formHasCreditCard ? '#820ad1' : 'var(--text-main)', display: 'block' }}>
                              Possui Cartão de Crédito nesta conta?
                            </strong>
                            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                              Acopla limite, fatura, data de fechamento e vencimento na mesma conta
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formHasCreditCard}
                          onChange={(e) => {
                            e.stopPropagation();
                            setFormHasCreditCard(e.target.checked);
                          }}
                          style={{ width: '18px', height: '18px', accentColor: '#820ad1', cursor: 'pointer' }}
                        />
                      </div>

                      {formHasCreditCard && (
                        <div className="form-grid-3col" style={{ marginTop: '0.65rem', padding: '0.75rem', background: 'rgba(130, 10, 209, 0.03)', borderRadius: '8px', border: '1px dashed rgba(130, 10, 209, 0.25)' }}>
                          <div className="form-group">
                            <label style={{ color: '#820ad1', fontWeight: 600 }}>Limite do Cartão (R$)</label>
                            <div className="input-currency-wrapper">
                              <span className="currency-prefix">R$</span>
                              <input
                                type="number"
                                step="100"
                                min="0"
                                max="999999999"
                                placeholder="3500"
                                value={formCreditLimit}
                                onChange={(e) => setFormCreditLimit(e.target.value)}
                                required
                                className="cf-input mono-number input-with-prefix"
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label>Dia Fechamento</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={formClosingDay}
                              onChange={(e) => setFormClosingDay(e.target.value)}
                              className="cf-input mono-number"
                            />
                          </div>

                          <div className="form-group">
                            <label>Dia Vencimento</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={formDueDay}
                              onChange={(e) => setFormDueDay(e.target.value)}
                              className="cf-input mono-number"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation / Notes of Limit and Account Rules */}
                  <div className="form-group" style={{ marginTop: '0.65rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Info size={14} color="var(--color-primary)" />
                      <span>Explicação do Limite Atual & Regras desta Conta</span>
                    </label>
                    <textarea
                      rows={2}
                      maxLength={250}
                      placeholder="Descreva detalhes do limite concedido, regras de uso, taxas ou objetivo desta conta (ex: Limite rotativo de R$ 3.500 para despesas diárias, vencimento dia 12)..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="cf-input"
                      style={{ resize: 'vertical', fontSize: '0.82rem', minHeight: '52px' }}
                    />
                    <span className="input-field-hint">
                      Esta explicação é exibida ao selecionar esta conta em novos lançamentos e nos detalhes de limite.
                    </span>
                  </div>

                  {/* Color Picker */}
                  <div className="form-group" style={{ marginTop: '0.65rem' }}>
                    <label>Cor Identificadora da Instituição</label>
                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {PRESET_BANK_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormColor(c)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: c,
                            border: formColor === c ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.1)',
                            outline: formColor === c ? '2px solid var(--color-primary)' : 'none',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                      <input
                        type="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        style={{ width: '32px', height: '26px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        title="Escolher cor personalizada"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.85rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={resetAccountForm}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveAccountForm}
                    >
                      <CheckCircle2 size={14} />
                      <span>Salvar Conta</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Accounts List Cards */}
              <div className="cf-manual-accounts-list">
                {accountsList.map((acc) => {
                  const bColor = acc.color || '#10b981';
                  const isCard = acc.type === 'credit_card';

                  return (
                    <div key={acc.id} className="cf-manual-account-card">
                      <div className="cf-acc-card-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div 
                            className="cf-acc-icon-bubble"
                            style={{ backgroundColor: `${bColor}18`, color: bColor }}
                          >
                            {getAccountIcon(acc.type)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <strong style={{ fontSize: '0.95rem' }}>{acc.name}</strong>
                              <span 
                                className="cf-acc-badge-pill"
                                style={{
                                  backgroundColor: `${bColor}15`,
                                  color: bColor,
                                  border: `1px solid ${bColor}30`,
                                }}
                              >
                                {acc.institutionName}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {ACCOUNT_TYPE_LABELS[acc.type]}
                            </span>
                          </div>
                        </div>

                        <div className="cf-acc-card-actions">
                          <button
                            type="button"
                            className="cf-acc-btn-icon"
                            onClick={() => handleOpenEditAccount(acc)}
                            title="Editar detalhes e limites desta conta"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            className="cf-acc-btn-icon danger"
                            onClick={() => handleDeleteAccount(acc.id, acc.name)}
                            title="Excluir conta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Balances and Limits Row */}
                      <div className="cf-acc-card-metrics">
                        {isCard ? (
                          <div className="cf-metric-badge-box">
                            <span className="cf-metric-label">Limite Total do Cartão</span>
                            <span className="cf-metric-value mono-number text-purple">
                              {formatCurrency(acc.creditLimit || 0)}
                            </span>
                          </div>
                        ) : (
                          <div className="cf-metric-badge-box">
                            <span className="cf-metric-label">Saldo Atual Disponível</span>
                            <span className="cf-metric-value mono-number text-emerald">
                              {formatCurrency(acc.balance || 0)}
                            </span>
                          </div>
                        )}

                        {acc.type === 'checking' && acc.hasCreditCard && (
                          <div className="cf-metric-badge-box">
                            <span className="cf-metric-label">Cartão de Crédito Integrado</span>
                            <span className="cf-metric-value mono-number text-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CreditCard size={13} />
                              {formatCurrency(acc.creditLimit || 0)}
                            </span>
                          </div>
                        )}

                        {((acc.type === 'checking' && acc.hasCreditCard) || isCard) && (acc.closingDay || acc.dueDay) && (
                          <div className="cf-metric-badge-box">
                            <span className="cf-metric-label">Fatura: Fech. / Venc.</span>
                            <span className="cf-metric-value" style={{ fontSize: '0.82rem' }}>
                              <Calendar size={13} style={{ display: 'inline', marginRight: '3px' }} />
                              Dia {acc.closingDay || 10} / Dia {acc.dueDay || 17}
                            </span>
                          </div>
                        )}

                        {!isCard && !acc.hasCreditCard && acc.creditLimit && acc.creditLimit > 0 && (
                          <div className="cf-metric-badge-box">
                            <span className="cf-metric-label">Cheque Especial</span>
                            <span className="cf-metric-value mono-number">
                              {formatCurrency(acc.creditLimit)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Limit / Account Notes Explanation Box */}
                      {acc.notes && (
                        <div className="cf-acc-notes-box">
                          <Info size={13} style={{ flexShrink: 0, marginTop: '2px', color: bColor }} />
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)', display: 'block' }}>
                              {isCard ? 'Regras e Limite Atual:' : 'Detalhes da Conta:'}
                            </strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {acc.notes}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Group 2: Limites Globais de Dívida & Renda */}
              <div className="form-section-group" style={{ marginTop: '0.5rem' }}>
                <div className="form-section-title">
                  <TrendingUp size={15} color="var(--color-primary)" />
                  <span>Teto Geral de Segurança & Renda Mensal</span>
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label>
                      <span>Teto Seguro de Dívidas (Capacidade Máxima)</span>
                    </label>
                    <div className="input-currency-wrapper">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        max="999999999"
                        value={maxDebt}
                        onChange={(e) => setMaxDebt(e.target.value)}
                        required
                        className="cf-input hunter-input mono-number input-with-prefix"
                      />
                    </div>
                    <span className="input-field-hint">Limite total antes do alerta de risco de endividamento</span>
                  </div>

                  <div className="form-group">
                    <label>
                      <span>Renda Mensal Prevista / Salário Base</span>
                    </label>
                    <div className="input-currency-wrapper">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        max="999999999"
                        placeholder="Ex: 7500"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        className="cf-input hunter-input mono-number input-with-prefix"
                      />
                    </div>
                    <span className="input-field-hint">Utilizado para referências de metas e previsões</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE & IDENTITY */}
          {activeTab === 'profile' && (
            <div className="tab-section-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Nome Completo / Apelido</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={60}
                  placeholder="Seu nome ou apelido"
                  className="cf-input hunter-input"
                />
              </div>

              <div className="form-group">
                <label>Ocupação / Cargo</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="Ex: Desenvolvedor, Autônomo, Estudante..."
                  className="cf-input hunter-input"
                />
              </div>

              <div className="form-group">
                <label>Perfil Financeiro</label>
                <select
                  value={affinity}
                  onChange={(e) => setAffinity(e.target.value as UserProfile['financialProfile'])}
                  className="cf-select hunter-select"
                >
                  <option value="Conservador">Conservador (Prioriza Segurança & Reserva)</option>
                  <option value="Moderado">Moderado (Equilíbrio entre gastos e reservas)</option>
                  <option value="Arrojado">Arrojado (Foco em Rentabilidade & Investimentos)</option>
                  <option value="Planejador">Planejador (Estratégico & Metódico)</option>
                </select>
              </div>

              <div className="sound-toggle-box" style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Volume2 size={18} color="var(--color-primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Efeitos Sonoros do CatFish</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Reproduz sons ao registrar receitas, despesas e alertas
                    </div>
                  </div>
                </div>
                <label className="switch-clean">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                  <span className="slider-switch"></span>
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={15} />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Compatibility export
export const HunterLicenseModal = ProfileModal;
