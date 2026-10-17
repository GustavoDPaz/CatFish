import React from 'react';
import { X, ShieldAlert, AlertTriangle, CheckSquare } from 'lucide-react';

interface DebtAlertModalProps {
  onClose: () => void;
}

export const DebtAlertModal: React.FC<DebtAlertModalProps> = ({ onClose }) => {
  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="debt-alert-modal-title"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="var(--color-danger)" aria-hidden="true" />
            <h3 id="debt-alert-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-danger)' }}>
              Alerta de Limite de Endividamento
            </h3>
          </div>
          <button 
            className="btn-close" 
            onClick={onClose} 
            title="Fechar modal"
            aria-label="Fechar modal de alerta de endividamento"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Financial Risk Alert Callout */}
          <div style={{ display: 'flex', gap: '0.85rem', background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-sm)', padding: '0.9rem', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ffffff' }}>
              <AlertTriangle size={24} aria-hidden="true" />
            </div>
            <div>
              <h4 style={{ fontSize: '0.92rem', color: 'var(--color-danger)', fontWeight: 700, marginBottom: '0.2rem' }}>
                Endividamento Acima do Teto Seguro
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                O total de compras parceladas e pendências ativas atingiu um nível elevado. Recomendamos priorizar a amortização antes de realizar novas despesas parceladas.
              </p>
            </div>
          </div>

          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Plano de Ação Recomendado
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <CheckSquare size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong style={{ display: 'block' }}>Reduzir Gastos Supérfluos:</strong>
                <span style={{ color: 'var(--text-muted)' }}>Evite compras por impulso e novos parcelamentos nos próximos 30 dias.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <CheckSquare size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong style={{ display: 'block' }}>Priorizar Amortização:</strong>
                <span style={{ color: 'var(--text-muted)' }}>Destine receitas adicionais para abater as dívidas de juros mais altos.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <CheckSquare size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <strong style={{ display: 'block' }}>Preservar a Reserva de Emergência:</strong>
                <span style={{ color: 'var(--text-muted)' }}>Mantenha o saldo de segurança intacto para cobrir despesas essenciais.</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={onClose}>
              Entendido! Focar em Equilíbrio Financeiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ZetsuAlertModal = DebtAlertModal;
