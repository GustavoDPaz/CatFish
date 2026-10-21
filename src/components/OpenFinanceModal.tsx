import React, { useState } from 'react';
import type { BankConnection } from '../types';
import { api } from '../services/api';
import { Landmark, Plus, CheckCircle2, AlertCircle, X, ShieldCheck, RefreshCw } from 'lucide-react';

interface OpenFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: BankConnection[];
  onRefreshConnections: () => void;
}

const AVAILABLE_BANKS = [
  { id: 'itau', name: 'Itaú Unibanco', color: '#EC7000' },
  { id: 'nubank', name: 'Nubank S.A.', color: '#820AD1' },
  { id: 'bradesco', name: 'Banco Bradesco', color: '#CC092F' },
  { id: 'bb', name: 'Banco do Brasil', color: '#FAF000' },
  { id: 'inter', name: 'Banco Inter', color: '#FF7A00' },
  { id: 'c6', name: 'C6 Bank', color: '#242424' },
];

export const OpenFinanceModal: React.FC<OpenFinanceModalProps> = ({
  isOpen,
  onClose,
  connections,
  onRefreshConnections,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnectBank = async (bank: typeof AVAILABLE_BANKS[0]) => {
    setIsConnecting(true);
    setSelectedBank(bank.id);

    try {
      // 1. Get connect token from API
      await api.getConnectToken();

      // 2. Simulate widget completion or connect directly via API
      const mockItemId = `item-${bank.id}-${Date.now()}`;
      await api.saveConnection(mockItemId, bank.name, bank.id);

      onRefreshConnections();
    } catch (err) {
      console.error('Falha ao conectar banco via Open Finance:', err);
    } finally {
      setIsConnecting(false);
      setSelectedBank(null);
    }
  };

  return (
    <div className="cf-modal-backdrop" onClick={onClose}>
      <div 
        className="cf-modal-box cf-of-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Gerenciamento de Contas Open Finance"
      >
        {/* Header */}
        <div className="cf-modal-header">
          <div className="cf-modal-header-icon-box">
            <Landmark size={20} className="cf-text-emerald" />
          </div>
          <div>
            <h2 className="cf-modal-title">Contas Conectadas (Open Finance)</h2>
            <p className="cf-modal-subtitle">
              Sincronização regulamentada pelo Banco Central do Brasil com criptografia ponta a ponta.
            </p>
          </div>
          <button className="cf-modal-close-btn" onClick={onClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        {/* Security Alert Badge */}
        <div className="cf-of-security-callout">
          <ShieldCheck size={18} className="cf-text-emerald" />
          <span>
            Seus dados são protegidos por criptografia simétrica <strong>AES-256-GCM</strong>. O CatFish possui acesso somente leitura e jamais armazena suas senhas bancárias.
          </span>
        </div>

        {/* Active Connections List */}
        <div className="cf-of-section">
          <h3 className="cf-of-section-title">Suas Conexões Ativas ({connections.length})</h3>
          {connections.length === 0 ? (
            <div className="cf-of-empty-box">
              <AlertCircle size={22} className="cf-text-muted" />
              <span>Nenhum banco conectado ainda. Conecte sua primeira instituição abaixo.</span>
            </div>
          ) : (
            <div className="cf-of-conn-list">
              {connections.map((conn) => (
                <div key={conn.id} className="cf-of-conn-card">
                  <div className="cf-of-conn-icon-box">
                    <Landmark size={18} />
                  </div>
                  <div className="cf-of-conn-info">
                    <span className="cf-of-conn-name">{conn.institutionName}</span>
                    <span className="cf-of-conn-sub">
                      Status: <strong className="cf-text-emerald">Ativo</strong> • Sincronização horária habilitada
                    </span>
                  </div>
                  <div className="cf-of-conn-badge">
                    <CheckCircle2 size={13} className="cf-text-emerald" />
                    <span>Conectado</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Connection Section */}
        <div className="cf-of-section">
          <h3 className="cf-of-section-title">Conectar Nova Instituição Financeira</h3>
          <p className="cf-of-section-desc">
            Selecione seu banco para autorizar a sincronização automática de conta corrente e cartões de crédito:
          </p>
          <div className="cf-of-bank-grid">
            {AVAILABLE_BANKS.map((bank) => {
              const isAlreadyConnected = connections.some(
                (c) => c.institutionId === bank.id || c.institutionName.toLowerCase().includes(bank.id)
              );
              const isLoading = isConnecting && selectedBank === bank.id;

              return (
                <button
                  key={bank.id}
                  className={`cf-of-bank-btn ${isAlreadyConnected ? 'connected' : ''}`}
                  onClick={() => !isAlreadyConnected && handleConnectBank(bank)}
                  disabled={isAlreadyConnected || isConnecting}
                >
                  <div className="cf-of-bank-dot" style={{ backgroundColor: bank.color }} />
                  <span className="cf-of-bank-label">{bank.name}</span>
                  {isLoading ? (
                    <RefreshCw size={14} className="cf-spin" />
                  ) : isAlreadyConnected ? (
                    <span className="cf-of-bank-status-text">Conectado</span>
                  ) : (
                    <Plus size={14} className="cf-of-bank-plus" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="cf-modal-footer">
          <button className="cf-btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
