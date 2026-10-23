import React, { useState } from 'react';
import type { ConsolidatedBalances, FinancialAccount } from '../types';
import { RefreshCw, Landmark, ExternalLink, X, CheckCircle2, CreditCard, Wallet, ShieldCheck, TrendingUp, Settings } from 'lucide-react';

interface BalanceBreakdownPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  balances: ConsolidatedBalances;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onOpenManageBanks: () => void;
  accounts?: FinancialAccount[];
  onOpenContabilizar?: () => void;
}

export const BalanceBreakdownPopover: React.FC<BalanceBreakdownPopoverProps> = ({
  isOpen,
  onClose,
  balances,
  onSync,
  isSyncing,
  onOpenManageBanks,
  accounts,
  onOpenContabilizar,
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

  const getAccountIcon = (type?: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard size={16} />;
      case 'wallet':
        return <Wallet size={16} />;
      case 'emergency_fund':
        return <ShieldCheck size={16} />;
      case 'investment':
        return <TrendingUp size={16} />;
      default:
        return <Landmark size={16} />;
    }
  };

  const displayAccounts: FinancialAccount[] = accounts && accounts.length > 0 
    ? accounts 
    : balances.accounts.map(a => ({
        id: a.accountId,
        name: a.accountName,
        institutionName: a.institutionName,
        type: (a.type as any) || 'checking',
        balance: a.balance,
        hasCreditCard: false,
        color: a.color,
        notes: undefined,
        creditLimit: undefined,
      }));

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
            <span className="cf-popover-badge">CatFish Finance</span>
            <span className="cf-popover-title">Saldos & Limites das Contas</span>
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
            Por Conta ({displayAccounts.length})
          </button>
        </div>

        {/* Content */}
        {viewMode === 'consolidated' ? (
          <div className="cf-popover-consolidated-box">
            <span className="cf-popover-caption">Saldo Total Disponível</span>
            <div className="cf-popover-huge-amount mono-number">
              {formatCurrency(balances.consolidatedTotal)}
            </div>
            <div className="cf-popover-sub-status">
              <CheckCircle2 size={14} className="cf-text-emerald" />
              <span>Soma de {displayAccounts.filter(a => a.type !== 'credit_card').length} contas com liquidez ativa</span>
            </div>
          </div>
        ) : (
          <div className="cf-popover-accounts-list" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {displayAccounts.map((acc) => {
              const bColor = acc.color || '#10b981';
              const isCard = acc.type === 'credit_card';

              return (
                <div key={acc.id} className="cf-popover-account-row">
                  <div 
                    className="cf-popover-acc-icon" 
                    style={{ backgroundColor: `${bColor}20`, color: bColor }}
                  >
                    {getAccountIcon(acc.type)}
                  </div>
                  <div className="cf-popover-acc-info">
                    <span className="cf-popover-acc-inst">{acc.institutionName}</span>
                    <span className="cf-popover-acc-name">
                      {acc.name}
                      {acc.hasCreditCard && (
                        <span style={{ fontSize: '0.68rem', color: '#820ad1', marginLeft: '4px', fontWeight: 600 }}>
                          (💳 Cartão)
                        </span>
                      )}
                      {isCard && <span style={{ fontSize: '0.68rem', color: '#820ad1', marginLeft: '4px' }}>(Cartão)</span>}
                    </span>
                    {acc.notes && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                        {acc.notes}
                      </span>
                    )}
                  </div>
                  <div className="cf-popover-acc-balance mono-number">
                    {isCard ? (
                      <span style={{ color: '#820ad1', fontSize: '0.84rem' }}>
                        Lim. {formatCurrency(acc.creditLimit || 0)}
                      </span>
                    ) : (
                      <div>
                        <div>{formatCurrency(acc.balance || 0)}</div>
                        {acc.hasCreditCard && acc.creditLimit && acc.creditLimit > 0 ? (
                          <div style={{ fontSize: '0.7rem', color: '#820ad1', fontWeight: 600 }}>
                            Lim. {formatCurrency(acc.creditLimit)}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="cf-popover-footer">
          <div className="cf-popover-sync-info">
            <span className="cf-popover-sync-time">Sincronizado às {formattedLastSync}</span>
          </div>

          <div className="cf-popover-actions-row">
            {onOpenContabilizar && (
              <button
                className="cf-popover-sync-btn"
                onClick={() => {
                  onClose();
                  onOpenContabilizar();
                }}
                title="Editar contas e limites na aba Contabilizar"
              >
                <Settings size={13} />
                <span>Contabilizar</span>
              </button>
            )}

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
              <span>Open Finance</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
