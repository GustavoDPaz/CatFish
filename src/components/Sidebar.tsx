import React from 'react';
import type { UserProfile } from '../types';
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  BarChart2,
  Target,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Menu,
  LogOut,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Plus,
  Bot,
  Landmark,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: 'dashboard' | 'apr' | 'transactions' | 'en' | 'greed_island';
  onSelectTab: (tab: 'dashboard' | 'apr' | 'transactions' | 'en' | 'greed_island') => void;
  profile: UserProfile;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenLicense: () => void;
  onToggleSound: () => void;
  onOpenNewTransaction: () => void;
  onLogout?: () => void;
  totalBalance?: number;
  totalAura?: number;
  totalDebt: number;
  isRiskMode?: boolean;
  onOpenAiAssistant?: () => void;
  isAiOpen?: boolean;
  onOpenBalanceBreakdown?: () => void;
  onOpenOpenFinance?: () => void;
  isSyncingBalance?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onSelectTab,
  profile,
  theme,
  onToggleTheme,
  onOpenLicense,
  onToggleSound,
  onOpenNewTransaction,
  onLogout,
  totalBalance,
  totalAura,
  totalDebt: _totalDebt,
  isRiskMode: _isRiskMode = false,
  onOpenAiAssistant,
  isAiOpen = false,
  onOpenBalanceBreakdown,
  onOpenOpenFinance,
  isSyncingBalance = false,
}) => {
  const currentTotal = totalBalance ?? totalAura ?? 0;
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const userInitial = profile.name ? profile.name.trim().charAt(0).toUpperCase() : 'G';

  return (
    <aside className={`cf-sidebar ${isOpen ? 'cf-sidebar-open' : 'cf-sidebar-closed'}`}>
      {/* Sidebar Header */}
      {isOpen ? (
        <div className="cf-sidebar-header">
          <div className="cf-brand-row">
            <div className="cf-logo-box" title="CatFish Finanças">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#10B981" />
                <path d="M8 11C8.82843 11 9.5 10.3284 9.5 9.5C9.5 8.67157 8.82843 8 8 8C7.17157 8 6.5 8.67157 6.5 9.5C6.5 10.3284 7.17157 11 8 11Z" fill="#064E3B" />
                <path d="M16 11C16.8284 11 17.5 10.3284 17.5 9.5C17.5 8.67157 16.8284 8 16 8C15.1716 8 14.5 8.67157 14.5 9.5C14.5 10.3284 15.1716 11 16 11Z" fill="#064E3B" />
                <path d="M8.5 14.5C9.5 16 14.5 16 15.5 14.5" stroke="#064E3B" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M3 13C4.5 13.5 6 12.5 6 12.5" stroke="#064E3B" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M21 13C19.5 13.5 18 12.5 18 12.5" stroke="#064E3B" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            <div className="cf-brand-text">
              <span className="cf-brand-title">CatFish</span>
              <span className="cf-brand-subtitle">Finanças pessoais</span>
            </div>
          </div>

          <button 
            className="cf-sidebar-toggle-btn"
            onClick={onToggleOpen}
            title="Recolher menu lateral"
            aria-label="Recolher menu lateral"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="cf-sidebar-collapsed-header">
          <button 
            className="cf-sidebar-toggle-btn cf-sidebar-open-btn"
            onClick={onToggleOpen}
            title="Expandir menu lateral"
            aria-label="Expandir menu lateral"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Primary Action Button: Novo Lançamento */}
      <div className={`cf-sidebar-action-wrap ${isOpen ? 'open' : 'collapsed'}`}>
        {isOpen ? (
          <button
            className="cf-sidebar-primary-btn"
            onClick={onOpenNewTransaction}
            title="Criar novo lançamento financeiro"
            aria-label="Criar novo lançamento financeiro"
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>Novo lançamento</span>
          </button>
        ) : (
          <button
            className="cf-sidebar-primary-btn-collapsed"
            onClick={onOpenNewTransaction}
            title="Novo lançamento financeiro"
            aria-label="Novo lançamento financeiro"
          >
            <Plus size={19} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main Navigation Section */}
      <div className="cf-sidebar-nav-container">
        {isOpen && (
          <div className="cf-nav-section-label">
            MENU PRINCIPAL
          </div>
        )}

        <nav className="cf-nav-list">
          {/* Visão geral */}
          <button
            className={`cf-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onSelectTab('dashboard')}
            title="Visão geral"
          >
            <div className="cf-nav-icon">
              <LayoutDashboard size={19} />
            </div>
            {isOpen && <span className="cf-nav-label">Visão geral</span>}
          </button>

          {/* Assistente IA (Google Gemini) */}
          <button
            className={`cf-nav-item ${isAiOpen ? 'active cf-nav-item-ai' : ''}`}
            onClick={onOpenAiAssistant}
            title="Assistente de IA Financeiro (Google Gemini)"
          >
            <div className="cf-nav-icon">
              <Bot size={19} className="cf-icon-gemini" />
            </div>
            {isOpen && <span className="cf-nav-label">Assistente IA</span>}
          </button>

          {/* Open Finance */}
          <button
            className="cf-nav-item"
            onClick={onOpenOpenFinance}
            title="Contas Conectadas (Open Finance BACEN)"
          >
            <div className="cf-nav-icon">
              <Landmark size={19} />
            </div>
            {isOpen && <span className="cf-nav-label">Open Finance</span>}
          </button>

          {/* Dívidas */}
          <button
            className={`cf-nav-item ${activeTab === 'apr' ? 'active' : ''}`}
            onClick={() => onSelectTab('apr')}
            title="Dívidas"
          >
            <div className="cf-nav-icon">
              <CreditCard size={19} />
            </div>
            {isOpen && <span className="cf-nav-label">Dívidas</span>}
          </button>

          {/* Lançamentos */}
          <button
            className={`cf-nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => onSelectTab('transactions')}
            title="Lançamentos"
          >
            <div className="cf-nav-icon">
              <ArrowLeftRight size={19} />
            </div>
            {isOpen && <span className="cf-nav-label">Lançamentos</span>}
          </button>

          {/* Limite de gastos */}
          <button
            className={`cf-nav-item ${activeTab === 'en' ? 'active' : ''}`}
            onClick={() => onSelectTab('en')}
            title="Limite de gastos"
          >
            <div className="cf-nav-icon">
              <BarChart2 size={19} />
            </div>
            {isOpen && <span className="cf-nav-label">Limite de gastos</span>}
          </button>

          {/* Metas financeiras */}
          <button
            className={`cf-nav-item ${activeTab === 'greed_island' ? 'active' : ''}`}
            onClick={() => onSelectTab('greed_island')}
            title="Metas financeiras"
          >
            <div className="cf-nav-icon">
              <Target size={19} />
            </div>
            {isOpen && <span className="cf-nav-label">Metas financeiras</span>}
          </button>
        </nav>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom User & Balance Info */}
      <div className="cf-sidebar-footer">
        {isOpen ? (
          <div 
            className="cf-balance-pill cf-balance-interactive"
            onClick={onOpenBalanceBreakdown}
            role="button"
            tabIndex={0}
            title="Clique para ver detalhamento de saldos consolidados e individuais"
            aria-label="Abrir detalhamento de saldo Open Finance"
          >
            <div className="cf-balance-caption-row">
              <span className="cf-balance-caption">Saldo disponível</span>
              <span className="cf-balance-expand-hint">
                Multi-bancos <ChevronDown size={11} />
              </span>
            </div>
            <div className="cf-balance-amount-row">
              <span className="cf-balance-amount mono-number">
                {formatCurrency(currentTotal)}
              </span>
              {isSyncingBalance && (
                <RefreshCw size={13} className="cf-spin cf-text-emerald" />
              )}
            </div>
          </div>
        ) : (
          <button
            className="cf-sidebar-collapsed-balance-btn"
            onClick={onOpenBalanceBreakdown}
            title={`Saldo disponível consolidado: ${formatCurrency(currentTotal)} (Clique para detalhar)`}
            aria-label="Abrir detalhamento de saldo Open Finance"
          >
            <Landmark size={17} />
          </button>
        )}

        {/* User Profile Card */}
        <div 
          className="cf-user-profile-row" 
          onClick={onOpenLicense}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenLicense();
            }
          }}
          title="Abrir Meu Perfil & Contas"
          aria-label="Abrir Meu Perfil e Contas"
        >
          <div className="cf-user-avatar">
            {userInitial}
          </div>
          {isOpen && (
            <div className="cf-user-info">
              <span className="cf-user-name">{profile.name || 'Gustavo'}</span>
              <span className="cf-user-role">{profile.title || 'Perfil planejador'}</span>
            </div>
          )}
          {isOpen && (
            <ChevronRight size={16} className="cf-user-chevron" aria-hidden="true" />
          )}
        </div>

        {/* Bottom Actions Row */}
        {isOpen ? (
          <div className="cf-sidebar-bottom-actions">
            <button 
              className="cf-logout-btn"
              onClick={onLogout || onOpenLicense}
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
            >
              <LogOut size={15} aria-hidden="true" />
              <span>Sair</span>
            </button>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                className="cf-sidebar-toggle-btn"
                onClick={onToggleTheme}
                title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                aria-label="Alternar tema claro/escuro"
              >
                {theme === 'light' ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
              </button>
              <button
                className="cf-sidebar-toggle-btn"
                onClick={onToggleSound}
                title={profile.soundEnabled ? 'Silenciar Sons' : 'Ativar Sons'}
                aria-label="Alternar som do sistema"
              >
                {profile.soundEnabled ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
            <button
              className="cf-sidebar-toggle-btn"
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
              aria-label="Alternar tema"
            >
              {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            </button>
            <button
              className="cf-sidebar-toggle-btn"
              onClick={onToggleSound}
              title={profile.soundEnabled ? 'Silenciar Sons' : 'Ativar Sons'}
              aria-label="Alternar som"
            >
              {profile.soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
            </button>
            <button
              className="cf-sidebar-toggle-btn"
              onClick={onLogout || onOpenLicense}
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
