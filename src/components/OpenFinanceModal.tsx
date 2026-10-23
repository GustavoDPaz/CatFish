import React, { useState } from 'react';
import type { BankConnection, FinancialAccount } from '../types';
import { api } from '../services/api';
import { 
  Landmark, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  FileSpreadsheet,
  Wallet,
  CreditCard,
  TrendingUp,
  Settings,
  Info
} from 'lucide-react';

interface OpenFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: BankConnection[];
  onRefreshConnections: () => void;
  onOpenOfxModal?: () => void;
  accounts?: FinancialAccount[];
  onOpenContabilizar?: () => void;
}

export const OpenFinanceModal: React.FC<OpenFinanceModalProps> = ({
  isOpen,
  onClose,
  connections,
  onRefreshConnections,
  onOpenOfxModal,
  accounts = [],
  onOpenContabilizar,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Manual bank input for testing / direct addition without fixed presets
  const [showCustomBankInput, setShowCustomBankInput] = useState(false);
  const [customBankName, setCustomBankName] = useState('');

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getAccountIcon = (type?: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard size={17} />;
      case 'wallet':
        return <Wallet size={17} />;
      case 'emergency_fund':
        return <ShieldCheck size={17} />;
      case 'investment':
        return <TrendingUp size={17} />;
      default:
        return <Landmark size={17} />;
    }
  };

  /**
   * Opens the official Pluggy Connect Widget (supports all 50+ Brazilian banks)
   */
  const handleOpenPluggyConnect = async () => {
    setIsConnecting(true);
    setFeedbackMsg(null);

    try {
      // 1. Get connect token from backend
      const tokenResult = await api.getConnectToken();

      if (!tokenResult.connectToken) {
        setShowCustomBankInput(true);
        setFeedbackMsg({
          type: 'error',
          text: tokenResult.error || 'Credenciais da Pluggy não configuradas no server/.env. Para abrir o catálogo oficial, adicione seu PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET. Você também pode conectar qualquer banco livremente pelo formulário abaixo!',
        });
        setIsConnecting(false);
        return;
      }

      // 2. Ensure Pluggy Connect SDK is loaded in window
      let PluggyConnectClass = (window as any).PluggyConnect;
      if (typeof PluggyConnectClass !== 'function') {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.5.0/pluggy-connect.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Falha ao carregar script do Pluggy Connect via CDN.'));
          document.head.appendChild(script);
        });
        PluggyConnectClass = (window as any).PluggyConnect;
      }

      if (typeof PluggyConnectClass === 'function') {
        const pluggyConnect = new PluggyConnectClass({
          connectToken: tokenResult.connectToken,
          includeSandbox: true,
          onSuccess: async (data: any) => {
            try {
              const item = data.item || data;
              const itemId = item.id || `item-pluggy-${Date.now()}`;
              const institutionName = item.connector?.name || 'Banco Conectado';
              const institutionId = String(item.connector?.id || 'generic_bank');

              await api.saveConnection(itemId, institutionName, institutionId);
              await api.syncOpenFinance();
              onRefreshConnections();
              setFeedbackMsg({ type: 'success', text: `Banco ${institutionName} conectado com sucesso!` });
            } catch (saveErr) {
              console.error('Erro ao salvar conexão bancária:', saveErr);
            }
          },
          onError: (error: any) => {
            console.error('[PluggyConnect] Erro no widget:', error);
            setFeedbackMsg({ type: 'error', text: 'Não foi possível concluir a autenticação com o banco na Pluggy.' });
          },
          onClose: () => {
            setIsConnecting(false);
          },
        });

        pluggyConnect.init();
      } else {
        setShowCustomBankInput(true);
        setFeedbackMsg({
          type: 'error',
          text: 'Não foi possível inicializar o widget da Pluggy. Você pode conectar qualquer banco pelo formulário abaixo.',
        });
      }
    } catch (err) {
      console.error('Falha ao abrir Open Finance:', err);
      setShowCustomBankInput(true);
      setFeedbackMsg({ type: 'error', text: 'Erro ao gerar token de conexão. Você pode adicionar manualmente abaixo.' });
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Connect any custom bank dynamically by name
   */
  const handleAddCustomBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBankName.trim()) return;

    setIsConnecting(true);
    setFeedbackMsg(null);

    try {
      const bankName = customBankName.trim();
      const institutionId = bankName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const itemId = `item-${institutionId}-${Date.now()}`;

      await api.saveConnection(itemId, bankName, institutionId);
      await api.syncOpenFinance();
      onRefreshConnections();

      setCustomBankName('');
      setShowCustomBankInput(false);
      setFeedbackMsg({ type: 'success', text: `${bankName} conectado com sucesso!` });
    } catch (err) {
      console.error('Erro ao registrar instituição:', err);
      setFeedbackMsg({ type: 'error', text: 'Erro ao registrar instituição financeira.' });
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Disconnect and remove a bank connection
   */
  const handleDeleteConnection = async (connId: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja desconectar o banco ${name}?`)) return;

    setDeletingId(connId);
    try {
      await api.deleteConnection(connId);
      onRefreshConnections();
      setFeedbackMsg({ type: 'info', text: `${name} foi desconectado com sucesso.` });
    } catch (err) {
      console.error('Erro ao desconectar banco:', err);
      setFeedbackMsg({ type: 'error', text: 'Não foi possível remover a conexão.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      await api.syncOpenFinance();
      onRefreshConnections();
      setFeedbackMsg({ type: 'success', text: 'Saldos e faturas sincronizados com sucesso!' });
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setFeedbackMsg({ type: 'error', text: 'Erro ao atualizar dados do Open Finance.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-finance-title"
    >
      <div 
        className="modal-content cf-of-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        {/* Header */}
        <div className="cf-of-header">
          <div className="cf-of-header-left">
            <div className="cf-of-logo-badge">
              <Landmark size={20} />
            </div>
            <div>
              <div className="cf-of-tag-row">
                <span className="cf-of-tag">BACEN Open Finance</span>
                <span className="cf-of-tag-sandbox">Modo Integrado</span>
              </div>
              <h2 id="open-finance-title" className="cf-of-title">
                Contas Bancárias & Conexões
              </h2>
            </div>
          </div>
          <button 
            className="btn-close" 
            onClick={onClose}
            title="Fechar modal de Open Finance"
            aria-label="Fechar modal de conexões bancárias"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className={`cf-of-alert cf-of-alert-${feedbackMsg.type}`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : feedbackMsg.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Security Callout */}
        <div className="cf-of-callout">
          <ShieldCheck size={18} className="cf-of-callout-icon" />
          <div className="cf-of-callout-content">
            <strong>Segurança CatFish:</strong> Suas contas manuais e conexões são centralizadas de forma segura. O CatFish garante rastreabilidade total de saldos, limites e lançamentos.
          </div>
        </div>

        {/* SECTION 1: Manual Accounts Registered in Contabilizar */}
        <div className="cf-of-card-section">
          <div className="cf-of-section-header">
            <div>
              <h3 className="cf-of-section-title">
                Contas Cadastradas no Painel ({accounts.length})
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Contas e cartões ativos para lançamentos com limites explicados
              </p>
            </div>
            {onOpenContabilizar && (
              <button
                type="button"
                className="cf-btn-secondary"
                onClick={() => {
                  onClose();
                  onOpenContabilizar();
                }}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                <Settings size={13} />
                <span>Gerenciar no Contabilizar</span>
              </button>
            )}
          </div>

          <div className="cf-of-list">
            {accounts.map((acc) => {
              const bColor = acc.color || '#10b981';
              const isCard = acc.type === 'credit_card';

              return (
                <div key={acc.id} className="cf-of-item" style={{ alignItems: 'flex-start' }}>
                  <div className="cf-of-item-left" style={{ flex: 1 }}>
                    <div 
                      className="cf-of-item-icon" 
                      style={{ backgroundColor: `${bColor}18`, color: bColor }}
                    >
                      {getAccountIcon(acc.type)}
                    </div>
                    <div className="cf-of-item-details" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className="cf-of-item-name">{acc.name}</span>
                        <span 
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: `${bColor}15`,
                            color: bColor,
                            border: `1px solid ${bColor}30`,
                          }}
                        >
                          {acc.institutionName}
                        </span>
                      </div>
                      
                      <div className="cf-of-item-meta" style={{ marginTop: '0.2rem' }}>
                        <span className="cf-of-status-pill">
                          <span className="cf-of-status-dot" />
                          {isCard ? 'Cartão de Crédito' : acc.hasCreditCard ? 'Conta com Cartão Integrado' : 'Disponível p/ Lançamentos'}
                        </span>
                        {isCard ? (
                          <span className="cf-of-sync-text" style={{ color: '#820ad1', fontWeight: 600 }}>
                            Limite: {formatCurrency(acc.creditLimit || 0)}
                            {acc.closingDay && ` • Fech. dia ${acc.closingDay}`}
                          </span>
                        ) : (
                          <span className="cf-of-sync-text" style={{ color: '#10b981', fontWeight: 600 }}>
                            Saldo: {formatCurrency(acc.balance || 0)}
                            {acc.hasCreditCard && acc.creditLimit && acc.creditLimit > 0 ? (
                              <span style={{ color: '#820ad1', marginLeft: '6px' }}>
                                • 💳 Limite Cartão: {formatCurrency(acc.creditLimit)}
                              </span>
                            ) : null}
                          </span>
                        )}
                      </div>

                      {/* Explanation of Limit / Account Notes */}
                      {acc.notes && (
                        <div style={{
                          marginTop: '0.35rem',
                          fontSize: '0.73rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                          padding: '0.3rem 0.5rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}>
                          <Info size={12} color={bColor} style={{ flexShrink: 0 }} />
                          <span>{acc.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Automated Open Finance Connections */}
        <div className="cf-of-card-section">
          <div className="cf-of-section-header">
            <h3 className="cf-of-section-title">
              Conexões Automáticas Open Finance ({connections.length})
            </h3>
            {connections.length > 0 && (
              <button 
                className="cf-of-sync-btn"
                onClick={handleSyncAll}
                disabled={isSyncing}
                title="Sincronizar saldos e faturas agora"
              >
                <RefreshCw size={13} className={isSyncing ? 'cf-spin' : ''} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo'}</span>
              </button>
            )}
          </div>

          {connections.length === 0 ? (
            <div className="cf-of-empty-state">
              <div className="cf-of-empty-icon-box">
                <Landmark size={24} />
              </div>
              <h4 style={{ fontSize: '0.92rem' }}>Nenhum agregador automático conectado</h4>
              <p style={{ fontSize: '0.78rem' }}>Você pode conectar diretamente via Pluggy Connect ou manter suas contas manuais criadas no Contabilizar.</p>
            </div>
          ) : (
            <div className="cf-of-list">
              {connections.map((conn) => {
                const isDeleting = deletingId === conn.id;
                return (
                  <div key={conn.id} className="cf-of-item">
                    <div className="cf-of-item-left">
                      <div className="cf-of-item-icon">
                        <Landmark size={18} />
                      </div>
                      <div className="cf-of-item-details">
                        <span className="cf-of-item-name">{conn.institutionName || (conn as any).institution_name || 'Instituição Conectada'}</span>
                        <div className="cf-of-item-meta">
                          <span className="cf-of-status-pill">
                            <span className="cf-of-status-dot" />
                            Ativo
                          </span>
                          <span className="cf-of-sync-text">Sincronização a cada 30 min</span>
                        </div>
                      </div>
                    </div>

                    <div className="cf-of-item-actions">
                      <button 
                        className="cf-of-del-btn" 
                        onClick={() => handleDeleteConnection(conn.id, conn.institutionName || (conn as any).institution_name || 'este banco')}
                        disabled={isDeleting}
                        title="Desconectar este banco"
                        aria-label={`Desconectar ${conn.institutionName || 'este banco'}`}
                      >
                        {isDeleting ? <RefreshCw size={15} className="cf-spin" /> : <Trash2 size={15} />}
                        <span>Desconectar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Connect New Bank Section */}
        <div className="cf-of-card-section">
          <h3 className="cf-of-section-title">Conectar Nova Instituição Financeira</h3>
          <p className="cf-of-section-desc">
            Abra o catálogo oficial do Open Finance para conectar qualquer banco, cooperativa ou fintech brasileira:
          </p>

          <div className="cf-of-action-row">
            <button
              className="cf-of-primary-connect-btn"
              onClick={handleOpenPluggyConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={18} className="cf-spin" />
                  <span>Conectando ao Open Finance...</span>
                </>
              ) : (
                <>
                  <ExternalLink size={18} />
                  <span>Abrir Catálogo de Bancos (Pluggy Connect)</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="cf-of-secondary-btn"
              onClick={() => setShowCustomBankInput(!showCustomBankInput)}
            >
              <Plus size={16} />
              <span>{showCustomBankInput ? 'Ocultar Adição Direta' : 'Adicionar Banco Livre'}</span>
            </button>

            {onOpenOfxModal && (
              <button
                type="button"
                className="cf-of-secondary-btn"
                onClick={() => {
                  onClose();
                  onOpenOfxModal();
                }}
                title="Importar extrato .ofx do seu banco"
              >
                <FileSpreadsheet size={16} />
                <span>Importar Extrato OFX</span>
              </button>
            )}
          </div>

          {/* Optional Direct Bank Name Input */}
          {showCustomBankInput && (
            <form onSubmit={handleAddCustomBank} className="cf-of-custom-form">
              <div className="cf-of-custom-input-group">
                <input
                  type="text"
                  className="cf-of-input"
                  placeholder="Ex: BTG Pactual, Banco Safra, Sicredi, XP, C6..."
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  disabled={isConnecting}
                  autoFocus
                />
                <button
                  type="submit"
                  className="cf-of-submit-btn"
                  disabled={isConnecting || !customBankName.trim()}
                >
                  <Plus size={16} />
                  <span>Conectar Instituição</span>
                </button>
              </div>
              <small className="cf-of-help-text">
                Digite o nome de qualquer instituição financeira para cadastrá-la no seu painel.
              </small>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="cf-of-footer">
          <button className="cf-of-close-action" onClick={onClose}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
