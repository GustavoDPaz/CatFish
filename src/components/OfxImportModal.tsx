import React, { useState, useRef } from 'react';
import type { Transaction } from '../types';
import { parseOfx, type ParsedOfxResult } from '../utils/ofxParser';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Landmark,
  Check,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface OfxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTransactions: Transaction[];
  onImport: (
    accountName: string,
    transactions: Omit<Transaction, 'id'>[],
    newBalance?: number
  ) => void;
}

const CATEGORIES_LIST = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Salário',
  'Compras',
  'Serviços',
  'Tarifas Bancárias',
  'Outros',
];

export const OfxImportModal: React.FC<OfxImportModalProps> = ({
  isOpen,
  onClose,
  existingTransactions,
  onImport,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedOfxResult | null>(null);
  const [targetAccount, setTargetAccount] = useState<string>('');
  const [updateBalance, setUpdateBalance] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [editedCategories, setEditedCategories] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleFile = (file: File) => {
    setErrorMsg(null);
    if (!file.name.toLowerCase().endsWith('.ofx') && !file.name.toLowerCase().endsWith('.qfx')) {
      setErrorMsg('Por favor, selecione um arquivo no formato .OFX ou .QFX.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseOfx(text);

        if (!result.transactions || result.transactions.length === 0) {
          setErrorMsg('Nenhuma movimentação bancária foi encontrada dentro do arquivo OFX.');
          setParsedData(null);
          return;
        }

        setParsedData(result);
        setTargetAccount(result.bankName || 'Conta Corrente');
        setUpdateBalance(result.balance !== undefined);

        // Detect potential duplicates against existing transactions in CatFish
        const duplicates = new Set<string>();
        const toSelect = new Set<string>();

        result.transactions.forEach((tx) => {
          const isDup = existingTransactions.some((existing) => {
            const sameDate = existing.date === tx.date;
            const sameAmount = Math.abs(existing.amount - tx.amount) < 0.01;
            const sameType = (existing.type === 'receita' || existing.type === 'ren') === (tx.type === 'receita');
            return sameDate && sameAmount && sameType;
          });

          if (isDup) {
            duplicates.add(tx.fitId);
          } else {
            toSelect.add(tx.fitId);
          }
        });

        setDuplicateIds(duplicates);
        setSelectedIds(toSelect);
      } catch (err: any) {
        console.error('Erro ao ler OFX:', err);
        setErrorMsg(err.message || 'Falha ao processar o arquivo OFX.');
        setParsedData(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Erro de leitura do arquivo no navegador.');
    };
    reader.readAsText(file, 'ISO-8859-1'); // Common encoding for Brazilian banking OFX
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectAll = () => {
    if (!parsedData) return;
    if (selectedIds.size === parsedData.transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedData.transactions.map((t) => t.fitId)));
    }
  };

  const toggleSelectTx = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCategoryChange = (fitId: string, cat: string) => {
    setEditedCategories((prev) => ({ ...prev, [fitId]: cat }));
  };

  const handleReset = () => {
    setParsedData(null);
    setFileName(null);
    setErrorMsg(null);
    setSelectedIds(new Set());
    setDuplicateIds(new Set());
    setEditedCategories({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (!parsedData || !targetAccount.trim()) return;

    const chosenTxs: Omit<Transaction, 'id'>[] = parsedData.transactions
      .filter((t) => selectedIds.has(t.fitId))
      .map((t) => ({
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: editedCategories[t.fitId] || t.category,
        account: targetAccount.trim(),
        date: t.date,
        notes: `Importado via OFX (${fileName || 'extrato'})`,
      }));

    if (chosenTxs.length === 0) {
      setErrorMsg('Selecione pelo menos um lançamento para importar.');
      return;
    }

    const finalBalance = updateBalance ? parsedData.balance : undefined;
    onImport(targetAccount.trim(), chosenTxs, finalBalance);
    handleReset();
    onClose();
  };

  // Quick stats
  const totalIncome = parsedData?.transactions
    .filter((t) => t.type === 'receita')
    .reduce((s, t) => s + t.amount, 0) || 0;

  const totalExpense = parsedData?.transactions
    .filter((t) => t.type === 'despesa')
    .reduce((s, t) => s + t.amount, 0) || 0;

  return (
    <div className="cf-of-backdrop" onClick={onClose}>
      <div
        className="cf-of-dialog cf-of-dialog-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ofx-modal-title"
      >
        {/* Header */}
        <div className="cf-of-header">
          <div className="cf-of-header-left">
            <div className="cf-of-header-badge">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 id="ofx-modal-title" className="cf-of-title">
                Importar Extrato OFX
              </h2>
              <p className="cf-of-subtitle">
                Importe extratos bancários de qualquer banco brasileiro com categorização automática.
              </p>
            </div>
          </div>
          <button className="cf-of-close-btn" onClick={onClose} aria-label="Fechar" title="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="cf-of-alert cf-of-alert-error" style={{ margin: '1rem 1.5rem 0' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="cf-ofx-modal-body">
          {!parsedData ? (
            /* Upload Dropzone View */
            <div className="cf-ofx-upload-container">
              <div
                className={`cf-ofx-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx,.qfx"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="cf-ofx-drop-icon">
                  <UploadCloud size={44} />
                </div>
                <h3>Arraste seu arquivo .OFX aqui</h3>
                <p>ou clique para selecionar do seu computador</p>
                <div className="cf-ofx-file-types">
                  <span>Formatos suportados: .ofx, .qfx</span>
                  <span>•</span>
                  <span>100% privado e local</span>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="cf-of-callout" style={{ marginTop: '1.25rem' }}>
                <ShieldCheck size={18} className="cf-of-callout-icon" />
                <div className="cf-of-callout-content">
                  <strong>Como exportar no seu banco:</strong> Acesse o app ou Internet Banking (Nubank, Itaú, Inter, Bradesco, Santander, etc.), vá em <em>Extrato</em> e clique em <em>Exportar Extrato</em> &rarr; escolha o formato <strong>OFX</strong>.
                </div>
              </div>
            </div>
          ) : (
            /* Parsed Summary & Selection View */
            <div className="cf-ofx-parsed-container">
              {/* Top Summary Cards */}
              <div className="cf-ofx-summary-grid">
                <div className="cf-ofx-summary-card">
                  <span className="cf-ofx-card-label">Banco Detectado</span>
                  <div className="cf-ofx-card-val-row">
                    <Landmark size={18} className="cf-text-blue" />
                    <span className="cf-ofx-card-title">{parsedData.bankName}</span>
                  </div>
                  {parsedData.accountId && (
                    <span className="cf-ofx-card-sub">Conta: {parsedData.accountId}</span>
                  )}
                </div>

                <div className="cf-ofx-summary-card">
                  <span className="cf-ofx-card-label">Saldo do Extrato</span>
                  <div className="cf-ofx-card-val-row">
                    <span className="cf-ofx-card-amount mono-number">
                      {parsedData.balance !== undefined ? formatCurrency(parsedData.balance) : 'Não informado'}
                    </span>
                  </div>
                  {parsedData.balanceDate && (
                    <span className="cf-ofx-card-sub">Data: {new Date(parsedData.balanceDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  )}
                </div>

                <div className="cf-ofx-summary-card">
                  <span className="cf-ofx-card-label">Movimentações</span>
                  <div className="cf-ofx-card-val-row">
                    <span className="cf-ofx-card-title">{parsedData.transactions.length} registros</span>
                  </div>
                  <div className="cf-ofx-mini-totals">
                    <span className="cf-val-green">+{formatCurrency(totalIncome)}</span>
                    <span>•</span>
                    <span className="cf-val-red">-{formatCurrency(totalExpense)}</span>
                  </div>
                </div>
              </div>

              {/* Account Destination Selection */}
              <div className="cf-ofx-account-bar">
                <div className="cf-ofx-account-input-group">
                  <label htmlFor="ofx-target-account">Salvar lançamentos na conta:</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      id="ofx-target-account"
                      type="text"
                      maxLength={50}
                      className="clean-search-input"
                      style={{ paddingLeft: '0.85rem', width: '220px' }}
                      value={targetAccount}
                      onChange={(e) => setTargetAccount(e.target.value)}
                      placeholder="Ex: Nubank, Itaú..."
                    />
                    {/* Quick suggestion pills */}
                    {['Nubank', 'Itaú', 'Banco Inter', 'Conta Corrente'].map((acc) => (
                      <button
                        key={acc}
                        type="button"
                        className={`cf-ofx-pill ${targetAccount === acc ? 'active' : ''}`}
                        onClick={() => setTargetAccount(acc)}
                      >
                        {acc}
                      </button>
                    ))}
                  </div>
                </div>

                {parsedData.balance !== undefined && (
                  <label className="cf-ofx-checkbox-label">
                    <input
                      type="checkbox"
                      checked={updateBalance}
                      onChange={(e) => setUpdateBalance(e.target.checked)}
                    />
                    <span>
                      Atualizar saldo da conta no CatFish para{' '}
                      <strong>{formatCurrency(parsedData.balance)}</strong>
                    </span>
                  </label>
                )}
              </div>

              {/* Transactions Header & Toolbar */}
              <div className="cf-ofx-tx-toolbar">
                <div className="cf-ofx-tx-count">
                  <span>
                    <strong>{selectedIds.size}</strong> de {parsedData.transactions.length} selecionados
                  </span>
                  {duplicateIds.size > 0 && (
                    <span className="cf-ofx-dup-warning">
                      ({duplicateIds.size} possíveis duplicatas desmarcadas)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="cf-ofx-btn-text" onClick={handleSelectAll}>
                    {selectedIds.size === parsedData.transactions.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>
              </div>

              {/* Transactions Preview Table */}
              <div className="cf-ofx-table-wrapper">
                <table className="cf-ofx-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === parsedData.transactions.length && parsedData.transactions.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.transactions.map((tx) => {
                      const isSelected = selectedIds.has(tx.fitId);
                      const isDup = duplicateIds.has(tx.fitId);
                      const currentCategory = editedCategories[tx.fitId] || tx.category;

                      return (
                        <tr key={tx.fitId} className={`cf-ofx-tr ${isSelected ? 'selected' : ''} ${isDup ? 'duplicate' : ''}`}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectTx(tx.fitId)}
                            />
                          </td>
                          <td className="cf-ofx-td-date">
                            {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="cf-ofx-td-desc">
                            <div className="cf-ofx-desc-content">
                              <span className="cf-ofx-desc-text">{tx.description}</span>
                              {isDup && (
                                <span className="cf-ofx-badge-dup" title="Transação idêntica já existe no seu extrato">
                                  Possível duplicado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="cf-ofx-td-cat">
                            <select
                              value={currentCategory}
                              onChange={(e) => handleCategoryChange(tx.fitId, e.target.value)}
                              className="cf-ofx-category-select"
                            >
                              {CATEGORIES_LIST.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="cf-ofx-td-amount mono-number" style={{ textAlign: 'right' }}>
                            <span className={tx.type === 'receita' ? 'cf-val-green' : 'cf-val-red'}>
                              {tx.type === 'receita' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cf-of-footer">
          {parsedData ? (
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="cf-of-close-action" onClick={handleReset}>
                <RotateCcw size={14} style={{ marginRight: '0.4rem' }} />
                Trocar arquivo
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="cf-of-close-action" onClick={onClose}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="cf-btn-primary-blue"
                  onClick={handleConfirmImport}
                  disabled={selectedIds.size === 0 || !targetAccount.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem' }}
                >
                  <Check size={16} />
                  <span>Importar {selectedIds.size} lançamentos</span>
                </button>
              </div>
            </div>
          ) : (
            <button className="cf-of-close-action" onClick={onClose}>
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
