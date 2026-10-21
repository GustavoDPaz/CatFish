import React, { useState } from 'react';
import type { ConsolidatedBalances } from '../types';
import { RefreshCw, Landmark, ExternalLink, X, CheckCircle2 } from 'lucide-react';

interface BalanceBreakdownPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  balances: ConsolidatedBalances;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onOpenManageBanks: () => void;
}

export const BalanceBreakdownPopover: React.FC<BalanceBreakdownPopoverProps> = ({
  isOpen,
  onClose,
  balances,
  onSync,
  isSyncing,
  onOpenManageBanks,
}) => {
  const [viewMode, setViewMode] = useState<'consolidated' | 'individual'>('consolidated');

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formattedLastSync = (() => {
    try {
      if (!balances.lastUpdated) return 'Agora';
      const d = new Date(balances.lastUpdated);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recentemente';
    }
  })();

  return (
    <div className="cf-popover-backdrop" onClick={onClose}>
      <div 
        className="cf-balance-popover" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhamento do Saldo Disponível"
      >
        {/* Header */}
        <div className="cf-popover-header">
          <div className="cf-popover-title-row">
            <span className="cf-popover-badge">Open Finance</span>
            <span className="cf-popover-title">Saldo Disponível</span>
          </div>
          <button 
            className="cf-popover-close-btn" 
            onClick={onClose}
            aria-label="Fechar detalhamento de saldo"
          >
            <X size={16} />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="cf-popover-toggle-group">
          <button
            className={`cf-popover-toggle-btn ${viewMode === 'consolidated' ? 'active' : ''}`}
            onClick={() => setViewMode('consolidated')}
          >
            Consolidado
          </button>
          <button
            className={`cf-popover-toggle-btn ${viewMode === 'individual' ? 'active' : ''}`}
            onClick={() => setViewMode('individual')}
          >
            Por Instituição ({balances.accounts.length})
          </button>
        </div>

        {/* Content */}
        {viewMode === 'consolidated' ? (
          <div className="cf-popover-consolidated-box">
            <span className="cf-popover-caption">Saldo Total Consolidado</span>
            <div className="cf-popover-huge-amount mono-number">
              {formatCurrency(balances.consolidatedTotal)}
            </div>
            <div className="cf-popover-sub-status">
              <CheckCircle2 size={14} className="cf-text-emerald" />
              <span>Soma de {balances.accounts.length} contas correntes ativas</span>
            </div>
          </div>
        ) : (
          <div className="cf-popover-accounts-list">
            {balances.accounts.map((acc) => (
              <div key={acc.accountId} className="cf-popover-account-row">
                <div 
                  className="cf-popover-acc-icon" 
                  style={{ backgroundColor: `${acc.color || '#10b981'}20`, color: acc.color || '#10b981' }}
                >
                  <Landmark size={16} />
                </div>
                <div className="cf-popover-acc-info">
                  <span className="cf-popover-acc-inst">{acc.institutionName}</span>
                  <span className="cf-popover-acc-name">{acc.accountName}</span>
                </div>
                <div className="cf-popover-acc-balance mono-number">
                  {formatCurrency(acc.balance)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="cf-popover-footer">
          <div className="cf-popover-sync-info">
            <span className="cf-popover-sync-time">Sincronizado às {formattedLastSync}</span>
          </div>

          <div className="cf-popover-actions-row">
            <button
              className="cf-popover-sync-btn"
              onClick={onSync}
              disabled={isSyncing}
              title="Sincronizar contas via Open Finance agora"
            >
              <RefreshCw size={13} className={isSyncing ? 'cf-spin' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Atualizar'}</span>
            </button>

            <button
              className="cf-popover-manage-btn"
              onClick={() => {
                onClose();
                onOpenManageBanks();
              }}
              title="Gerenciar conexões bancárias"
            >
              <span>Gerenciar Contas</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
