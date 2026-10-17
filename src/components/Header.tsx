import React from 'react';
import type { UserProfile } from '../types';
import { audioManager } from '../utils/audio';
import { Volume2, VolumeX, Shield, Sun, Moon, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  profile: UserProfile;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenLicense: () => void;
  onToggleSound: () => void;
  totalBalance?: number;
  totalAura?: number;
  totalDebt: number;
  isRiskMode?: boolean;
}
  
export const Header: React.FC<HeaderProps> = ({
  profile,
  theme,
  onToggleTheme,
  onOpenLicense,
  onToggleSound,
  totalBalance,
  totalAura,
  totalDebt,
  isRiskMode,
}) => {
  const currentTotal = totalBalance ?? totalAura ?? 0;
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <header className={`hunter-header cf-header ${isRiskMode ? 'header-risk-mode' : ''}`}>
      <div className="header-container">
        {/* Brand */}
        <div className="brand-group" onClick={onOpenLicense} role="button" tabIndex={0} aria-label="Abrir Perfil Financeiro">
          <div className={`brand-icon-wrapper ${isRiskMode ? 'brand-icon-risk-glow' : ''}`} title={isRiskMode ? "Alerta de Risco: Dívida Elevada" : "Ver Perfil Financeiro"}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path 
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" 
                fill={isRiskMode ? "#f43f5e" : "#10B981"} 
              />
              <path 
                d="M8 11C8.82843 11 9.5 10.3284 9.5 9.5C9.5 8.67157 8.82843 8 8 8C7.17157 8 6.5 8.67157 6.5 9.5C6.5 10.3284 7.17157 11 8 11Z" 
                fill="#ffffff" 
              />
              <path 
                d="M16 11C16.8284 11 17.5 10.3284 17.5 9.5C17.5 8.67157 16.8284 8 16 8C15.1716 8 14.5 8.67157 14.5 9.5C14.5 10.3284 15.1716 11 16 11Z" 
                fill="#ffffff" 
              />
              <path 
                d="M8.5 14.5C9.5 16 14.5 16 15.5 14.5" 
                stroke="#ffffff" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
              />
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">
              Cat<span className={isRiskMode ? "brand-accent-risk" : "brand-accent"}>Fish</span>
              {isRiskMode && (
                <span className="risk-header-mini-tag">RISCO</span>
              )}
            </h1>
            <p className="brand-subtitle">
              {isRiskMode ? (
                <span style={{ color: '#fb7185', fontWeight: 600 }}>Alerta de Endividamento • Modo de Risco Ativo</span>
              ) : (
                'Gestão Financeira & Controle de Gastos'
              )}
            </p>
          </div>
        </div>

        {/* Quick Metrics & Actions */}
        <div className="header-actions-group">
          {/* Quick Balance Pill */}
          <div className="header-stat-pill">
            <span className="pill-title">Saldo:</span>
            <span className="pill-amount positive mono-number">{formatCurrency(currentTotal)}</span>
          </div>

          {totalDebt > 0 && (
            <div className={`header-stat-pill ${isRiskMode ? 'header-debt-pill-risk' : ''}`}>
              <span className="pill-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {isRiskMode ? (
                  <>
                    <AlertTriangle size={14} aria-hidden="true" style={{ color: '#ef4444' }} />
                    Dívida Crítica:
                  </>
                ) : (
                  'Dívidas Ativas:'
                )}
              </span>
              <span className="pill-amount debt mono-number">{formatCurrency(totalDebt)}</span>
            </div>
          )}

          {/* Theme Toggle Button (Light / Dark) */}
          <button 
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Mudar para Tema Escuro' : 'Mudar para Tema Claro'}
            title={theme === 'light' ? 'Mudar para Tema Escuro' : 'Mudar para Tema Claro'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Sound Toggle Button */}
          <button 
            className="sound-toggle-btn"
            onClick={() => {
              onToggleSound();
              if (!profile.soundEnabled) {
                audioManager.playSuccessChime();
              }
            }}
            title={profile.soundEnabled ? 'Desativar Sons' : 'Ativar Sons'}
          >
            {profile.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* User Profile Button */}
          <button 
            className="btn btn-primary cf-profile-btn license-btn"
            onClick={onOpenLicense}
          >
            <Shield size={14} />
            <span>Meu Perfil</span>
          </button>
        </div>
      </div>
    </header>
  );
};
