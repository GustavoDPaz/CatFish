import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { X, ShieldCheck, Save, Landmark, Wallet, CreditCard, TrendingUp, User, Volume2, HelpCircle } from 'lucide-react';

interface ProfileModalProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onClose: () => void;
  initialTab?: 'financial' | 'profile';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  onSave,
  onClose,
  initialTab = 'financial',
}) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'profile'>(initialTab);

  // Profile data
  const [name, setName] = useState(profile.name || '');
  const [title, setTitle] = useState(profile.title || '');
  const [affinity, setAffinity] = useState(profile.financialProfile || profile.nenAffinity || 'Planejador');
  const [soundEnabled, setSoundEnabled] = useState(profile.soundEnabled ?? true);

  // Financial data
  const [bankName, setBankName] = useState(profile.bankName || 'Banco Principal');
  const [bankBalance, setBankBalance] = useState<number | string>(profile.bankBalance ?? 4200);
  const [walletBalance, setWalletBalance] = useState<number | string>(profile.walletBalance ?? 1450);
  const [emergencyFundBalance, setEmergencyFundBalance] = useState<number | string>(profile.emergencyFundBalance ?? 1500);
  const [creditCardLimit, setCreditCardLimit] = useState<number | string>(profile.creditCardLimit ?? 5000);
  const [overdraftLimit, setOverdraftLimit] = useState<number | string>(profile.overdraftLimit ?? 1000);
  const [maxDebt, setMaxDebt] = useState<number | string>(profile.maxDebtCapacity ?? profile.maxAuraCapacity ?? 12000);
  const [monthlyIncome, setMonthlyIncome] = useState<number | string>(profile.monthlyIncome ?? 7500);

  const numBank = Number(bankBalance) || 0;
  const numWallet = Number(walletBalance) || 0;
  const numEmergency = Number(emergencyFundBalance) || 0;
  const numCreditCard = Number(creditCardLimit) || 0;
  const numOverdraft = Number(overdraftLimit) || 0;
  const numMaxDebt = Number(maxDebt) || 0;
  const numIncome = Number(monthlyIncome) || 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...profile,
      name: name.trim() || 'Usuário',
      title: title.trim() || 'Planejamento Pessoal',
      financialProfile: affinity,
      nenAffinity: affinity,
      soundEnabled,
      bankName: bankName.trim() || 'Banco Principal',
      bankBalance: numBank,
      walletBalance: numWallet,
      emergencyFundBalance: numEmergency,
      creditCardLimit: numCreditCard,
      overdraftLimit: numOverdraft,
      maxDebtCapacity: numMaxDebt,
      maxAuraCapacity: numMaxDebt,
      monthlyIncome: numIncome,
    });
    onClose();
  };

  const accountId = profile.accountId || profile.hunterId || 'CF-2026-1920';

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div 
        className="modal-content profile-edit-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="var(--color-primary)" aria-hidden="true" />
            <h3 id="profile-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Editar Perfil & Finanças</h3>
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
                  <span className="chip-val">{formatCurrency(numBank)}</span>
                </div>
                <div className="license-chip">
                  <span className="chip-label">Lim. Cartão:</span>
                  <span className="chip-val">{formatCurrency(numCreditCard)}</span>
                </div>
                <div className="license-chip">
                  <span className="chip-label">Reserva:</span>
                  <span className="chip-val">{formatCurrency(numEmergency)}</span>
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
            <span>Dados Financeiros & Limites</span>
            <span className="tab-pill-badge">Contabilizar</span>
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
        <form onSubmit={handleSubmit} style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* TAB 1: FINANCIAL DATA & LIMITS */}
          {activeTab === 'financial' && (
            <div className="tab-section-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="helper-banner">
                <HelpCircle size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span>
                  Modifique seus saldos atuais e limites para iniciar a contabilização real do seu patrimônio e fluxo de caixa.
                </span>
              </div>

              {/* Group 1: Saldos em Contas */}
              <div className="form-section-group">
                <div className="form-section-title">
                  <Landmark size={15} color="var(--color-primary)" />
                  <span>Saldos Iniciais / Atuais em Contas</span>
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label>
                      <span>Saldo Atual no Banco (Conta Corrente)</span>
                    </label>
                    <div className="input-currency-wrapper">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={bankBalance}
                        onChange={(e) => setBankBalance(e.target.value)}
                        required
                        className="cf-input hunter-input mono-number input-with-prefix"
                      />
                    </div>
                    <span className="input-field-hint">Saldo inicial disponível para movimentação</span>
                  </div>

                  <div className="form-group">
                    <label>
                      <span>Nome do Banco Principal</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Nubank, Itaú, Banco do Brasil..."
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="cf-input hunter-input"
                    />
                    <span className="input-field-hint">Instituição bancária padrão</span>
                  </div>
                </div>

                <div className="form-grid-2col" style={{ marginTop: '0.65rem' }}>
                  <div className="form-group">
                    <label>
                      <span>Saldo na Carteira (Dinheiro em Mãos)</span>
                    </label>
                    <div className="input-currency-wrapper">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={walletBalance}
                        onChange={(e) => setWalletBalance(e.target.value)}
                        required
                        className="cf-input hunter-input mono-number input-with-prefix"
                      />
                    </div>
                    <span className="input-field-hint">Dinheiro físico ou troco disponível</span>
                  </div>

                  <div className="form-group">
                    <label>
                      <span>Saldo da Reserva de Emergência</span>
                    </label>
                    <div className="input-currency-wrapper">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={emergencyFundBalance}
                        onChange={(e) => setEmergencyFundBalance(e.target.value)}
                        required
                        className="cf-input hunter-input mono-number input-with-prefix"
                      />
                    </div>
                    <span className="input-field-hint">Guardado em poupança, CDB ou fundo seguro</span>
                  </div>
                </div>
              </div>

              {/* Group 2: Limites de Crédito & Endividamento */}
              <div className="form-section-group">
                <div className="form-section-title">
                  <CreditCard size={15} color="var(--color-danger)" />
                  <span>Limites de Crédito & Dívidas</span>
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label>
                      <span>Limite do Cartão de Crédito</span>
                    </label>
                    <div className="input-currency-wrapper">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        placeholder="Ex: 5000"
                        value={creditCardLimit}
                        onChange={(e) => setCreditCardLimit(e.target.value)}
                        required
                        className="cf-input hunter-input mono-number input-with-prefix"
                      />
                    </div>
                    <span className="input-field-hint">Limite total concedido pelo cartão</span>
                  </div>

                  <div className="form-group">
                    <label>
                      <span>Limite de Cheque Especial</span>
                    </label>
                    <div className="input-currency-wrapper">
                      <span className="currency-prefix">R$</span>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        placeholder="Ex: 1000"
                        value={overdraftLimit}
                        onChange={(e) => setOverdraftLimit(e.target.value)}
                        className="cf-input hunter-input mono-number input-with-prefix"
                      />
                    </div>
                    <span className="input-field-hint">Crédito rotativo ou emergencial bancário</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.65rem' }}>
                  <label>
                    <span>Teto Seguro de Dívidas (Capacidade Máxima)</span>
                  </label>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={maxDebt}
                      onChange={(e) => setMaxDebt(e.target.value)}
                      required
                      className="cf-input hunter-input mono-number input-with-prefix"
                    />
                  </div>
                  <span className="input-field-hint">Limite máximo seguro de endividamento antes do alerta de risco</span>
                </div>
              </div>

              {/* Group 3: Renda & Planejamento */}
              <div className="form-section-group">
                <div className="form-section-title">
                  <TrendingUp size={15} color="var(--color-success)" />
                  <span>Renda Mensal Estimada</span>
                </div>

                <div className="form-group">
                  <label>
                    <span>Renda Mensal Prevista / Salário Líquido Base</span>
                  </label>
                  <div className="input-currency-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      placeholder="Ex: 7500"
                      value={monthlyIncome}
                      onChange={(e) => setMonthlyIncome(e.target.value)}
                      className="cf-input hunter-input mono-number input-with-prefix"
                    />
                  </div>
                  <span className="input-field-hint">Utilizado para referências de metas e previsões mensais</span>
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
