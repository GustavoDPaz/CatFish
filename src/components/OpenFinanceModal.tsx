import React, { useState } from 'react';
import type { BankConnection } from '../types';
import { api } from '../services/api';
import { Landmark, Plus, CheckCircle2, AlertCircle, X, ShieldCheck, RefreshCw, Trash2, ExternalLink, FileSpreadsheet } from 'lucide-react';

interface OpenFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: BankConnection[];
  onRefreshConnections: () => void;
  onOpenOfxModal?: () => void;
}

export const OpenFinanceModal: React.FC<OpenFinanceModalProps> = ({
  isOpen,
  onClose,
  connections,
  onRefreshConnections,
  onOpenOfxModal,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Manual bank input for testing / direct addition without fixed presets
  const [showCustomBankInput, setShowCustomBankInput] = useState(false);
  const [customBankName, setCustomBankName] = useState('');

  if (!isOpen) return null;

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

  /**
   * Force on-demand sync
   */
  const handleSyncAll = async () => {
    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      const res = await api.syncOpenFinance();
      if (res.success) {
        onRefreshConnections();
        setFeedbackMsg({ type: 'success', text: 'Contas e faturas sincronizadas com sucesso!' });
      } else {
        setFeedbackMsg({ type: 'info', text: res.message || 'Sincronização concluída.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Falha ao sincronizar contas.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="cf-of-backdrop" onClick={onClose}>
      <div 
        className="cf-of-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Gerenciamento de Contas Open Finance"
      >
        {/* Header */}
        <div className="cf-of-header">
          <div className="cf-of-header-left">
            <div className="cf-of-header-badge">
              <Landmark size={20} className="cf-text-emerald" />
            </div>
            <div>
              <h2 className="cf-of-title">Contas Conectadas (Open Finance)</h2>
              <p className="cf-of-subtitle">
                Sincronização oficial regulamentada pelo Banco Central do Brasil com criptografia ponta a ponta.
              </p>
            </div>
          </div>
          <button className="cf-of-close-btn" onClick={onClose} aria-label="Fechar modal" title="Fechar">
            <X size={20} />
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
            <strong>Proteção Nível Bancário:</strong> Seus dados são protegidos por criptografia <strong>AES-256-GCM</strong>. O CatFish possui acesso estritamente somente leitura e jamais armazena suas senhas de banco.
          </div>
        </div>

        {/* Active Connections List */}
        <div className="cf-of-card-section">
          <div className="cf-of-section-header">
            <h3 className="cf-of-section-title">
              Suas Conexões Ativas ({connections.length})
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
                <Landmark size={28} />
              </div>
              <h4>Nenhum banco conectado</h4>
              <p>Conecte sua conta corrente ou cartão para importar automaticamente seus saldos, faturas e lançamentos.</p>
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
                        <span className="cf-of-item-name">{conn.institutionName}</span>
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
                        onClick={() => handleDeleteConnection(conn.id, conn.institutionName)}
                        disabled={isDeleting}
                        title="Desconectar este banco"
                        aria-label={`Desconectar ${conn.institutionName}`}
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

          {/* Optional Direct Bank Name Input (Freedom to add any bank) */}
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
