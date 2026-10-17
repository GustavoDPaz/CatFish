import React, { useState, useEffect } from 'react';
import type { FinancialGoal } from '../types';
import { 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Download, 
  Upload, 
  RefreshCw, 
  Plus, 
  Minus,
  Edit2, 
  Trash2, 
  X, 
  Camera, 
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { storage } from '../utils/storage';
import { audioManager } from '../utils/audio';
import confetti from 'canvas-confetti';

interface GreedIslandViewProps {
  cards: FinancialGoal[];
  onAddCard: (card: Omit<FinancialGoal, 'id'>) => void;
  onUpdateCard: (card: FinancialGoal) => void;
  onDeleteCard: (id: string) => void;
  onReloadData: () => void;
}

const PRESET_IMAGES = [
  { label: 'Investimentos', url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&auto=format&fit=crop&q=80' },
  { label: 'Viagem / Férias', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80' },
  { label: 'Casa Própria', url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&auto=format&fit=crop&q=80' },
  { label: 'Carro / Veículo', url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&auto=format&fit=crop&q=80' },
  { label: 'Tecnologia / Setup', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=80' },
];

export const getCardDisplayImage = (card: FinancialGoal) => {
  if (card.imageUrl && !card.imageUrl.includes('potclean')) {
    return card.imageUrl;
  }
  if (card.cardNo === '002' || card.cardNo === '075') {
    return 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&auto=format&fit=crop&q=80';
  }
  if (card.cardNo === '003') {
    return 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&auto=format&fit=crop&q=80';
  }
  if (card.cardNo === '004' || card.cardNo === '084') {
    return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&auto=format&fit=crop&q=80';
  }
  return PRESET_IMAGES[0].url;
};

export const GreedIslandView: React.FC<GreedIslandViewProps> = ({
  cards,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onReloadData,
}) => {
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // In-app contribution modal (replaces browser prompt)
  const [contributionCard, setContributionCard] = useState<FinancialGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>('200');
  const [contributionMode, setContributionMode] = useState<'add' | 'withdraw'>('add');

  // In-app confirmation dialogs (replaces browser confirm)
  const [cardToDelete, setCardToDelete] = useState<FinancialGoal | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // In-app toast message (replaces browser alert)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCardNo, setFormCardNo] = useState('');
  const [formRank, setFormRank] = useState<FinancialGoal['rank']>('Alta');
  const [formDescription, setFormDescription] = useState('');
  const [formObjective, setFormObjective] = useState('');
  const [formRewardText, setFormRewardText] = useState('');
  const [formImageUrl, setFormImageUrl] = useState(PRESET_IMAGES[0].url);
  const [formTargetAmount, setFormTargetAmount] = useState<string>('');
  const [formCurrentAmount, setFormCurrentAmount] = useState<string>('');
  const [formUnlocked, setFormUnlocked] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleOpenAddModal = () => {
    setEditingCardId(null);
    setFormName('');
    const nextNo = String(cards.length + 1).padStart(3, '0');
    setFormCardNo(nextNo);
    setFormRank('Alta');
    setFormDescription('');
    setFormObjective('');
    setFormRewardText('');
    setFormImageUrl(PRESET_IMAGES[0].url);
    setFormTargetAmount('');
    setFormCurrentAmount('');
    setFormUnlocked(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (card: FinancialGoal) => {
    setEditingCardId(card.id);
    setFormName(card.name);
    setFormCardNo(card.cardNo);
    setFormRank(card.rank);
    setFormDescription(card.description);
    setFormObjective(card.objective);
    setFormRewardText(card.rewardText || '');
    setFormImageUrl(card.imageUrl || PRESET_IMAGES[0].url);
    setFormTargetAmount(card.targetAmount ? card.targetAmount.toString() : '');
    setFormCurrentAmount(card.currentAmount ? card.currentAmount.toString() : '');
    setFormUnlocked(card.unlocked);
    setShowModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const targetNum = Number(formTargetAmount) || 0;
    const currentNum = Number(formCurrentAmount) || 0;
    const isCompleted = formUnlocked || (targetNum > 0 && currentNum >= targetNum);

    if (editingCardId) {
      onUpdateCard({
        id: editingCardId,
        cardNo: formCardNo || '001',
        name: formName,
        rank: formRank,
        description: formDescription,
        objective: formObjective,
        rewardText: formRewardText,
        imageUrl: formImageUrl,
        targetAmount: targetNum > 0 ? targetNum : undefined,
        currentAmount: currentNum > 0 ? currentNum : undefined,
        unlocked: isCompleted,
      });
      audioManager.playIncomeSound();
      setToastMessage({ text: 'Meta atualizada com sucesso!', type: 'success' });
    } else {
      onAddCard({
        cardNo: formCardNo || String(cards.length + 1).padStart(3, '0'),
        name: formName,
        rank: formRank,
        description: formDescription,
        objective: formObjective,
        rewardText: formRewardText,
        imageUrl: formImageUrl,
        targetAmount: targetNum > 0 ? targetNum : undefined,
        currentAmount: currentNum > 0 ? currentNum : undefined,
        unlocked: isCompleted,
      });
      audioManager.playFanfare();
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });
      setToastMessage({ text: 'Nova meta criada com sucesso!', type: 'success' });
    }

    setShowModal(false);
  };

  const handleOpenContributionModal = (card: FinancialGoal, mode: 'add' | 'withdraw' = 'add') => {
    setContributionCard(card);
    setContributionMode(mode);
    if (mode === 'add') {
      if (card.targetAmount && card.targetAmount > (card.currentAmount || 0)) {
        const remaining = card.targetAmount - (card.currentAmount || 0);
        setContributionAmount(remaining < 200 ? remaining.toString() : '200');
      } else {
        setContributionAmount('200');
      }
    } else {
      const current = card.currentAmount || 0;
      setContributionAmount(current > 0 ? (current >= 100 ? '100' : current.toString()) : '50');
    }
  };

  const handleConfirmContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionCard) return;
    const amount = Number(contributionAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (contributionMode === 'withdraw') {
      const newCurrent = Math.max(0, (contributionCard.currentAmount || 0) - amount);
      onUpdateCard({
        ...contributionCard,
        currentAmount: newCurrent,
        unlocked: contributionCard.targetAmount ? newCurrent >= contributionCard.targetAmount : false,
      });
      audioManager.playExpenseSound();
      setToastMessage({ text: `Retirada de ${formatCurrency(amount)} realizada com sucesso!`, type: 'success' });
    } else {
      const newCurrent = (contributionCard.currentAmount || 0) + amount;
      const isCompleted = contributionCard.targetAmount ? newCurrent >= contributionCard.targetAmount : false;

      onUpdateCard({
        ...contributionCard,
        currentAmount: newCurrent,
        unlocked: isCompleted || contributionCard.unlocked,
      });

      audioManager.playIncomeSound();
      if (isCompleted && !contributionCard.unlocked) {
        audioManager.playFanfare();
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.5 },
        });
        setToastMessage({ text: `Parabéns! Você atingiu a meta "${contributionCard.name}"!`, type: 'success' });
      } else {
        setToastMessage({ text: `Aporte de ${formatCurrency(amount)} adicionado com sucesso!`, type: 'success' });
      }
    }

    setContributionCard(null);
  };

  const handleToggleUnlocked = (card: FinancialGoal) => {
    const nextUnlocked = !card.unlocked;
    onUpdateCard({
      ...card,
      unlocked: nextUnlocked,
      currentAmount: nextUnlocked && card.targetAmount ? card.targetAmount : card.currentAmount,
    });

    if (nextUnlocked) {
      audioManager.playFanfare();
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  const handleExport = () => {
    storage.exportBackup();
    audioManager.playAprChime();
    setToastMessage({ text: 'Backup exportado com sucesso!', type: 'success' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && storage.importBackup(content)) {
        audioManager.playFanfare();
        onReloadData();
        setToastMessage({ text: 'Backup importado com sucesso!', type: 'success' });
      } else {
        setToastMessage({ text: 'Falha ao processar arquivo de backup.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const totalSaved = cards.reduce((sum, c) => sum + (c.currentAmount || 0), 0);
  const totalTarget = cards.reduce((sum, c) => sum + (c.targetAmount || 0), 0);
  const completedCount = cards.filter(c => c.unlocked).length;
  const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <div className="cf-dashboard-layout">
      {/* In-app Toast Banner */}
      {toastMessage && (
        <div 
          style={{ 
            position: 'fixed', 
            top: '1.5rem', 
            right: '1.5rem', 
            zIndex: 9999,
            background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem', opacity: 0.8 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Greeting & Hero KPI Card */}
      <section className="cf-greeting-hero">
        <div className="cf-greeting-top-row">
          <span className="cf-greeting-date">Objetivos de longo prazo</span>
          <span className="cf-risk-mode-pill">
            <span className="cf-status-dot-active" />
            {completedCount > 0 ? `${completedCount} meta(s) conquistada(s)` : 'Metas em andamento'}
          </span>
        </div>

        <h1 className="cf-greeting-title">Metas financeiras e conquistas</h1>
        <p className="cf-greeting-subtitle">
          Economize com propósito, acompanhe a evolução de patrimônio e alcance suas realizações.
        </p>

        {/* 4-Column Metric Strip */}
        <div className="cf-hero-metrics-strip">
          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Total acumulado</span>
            <span className="cf-metric-value cf-val-green mono-number">
              {formatCurrency(totalSaved)}
            </span>
            <span className="cf-metric-subtext">Economizado para metas</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Meta global</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              {formatCurrency(totalTarget)}
            </span>
            <span className="cf-metric-subtext">Teto alvo total</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Progresso médio</span>
            <span className="cf-metric-value cf-val-blue mono-number">
              {overallPercent}%
            </span>
            <span className="cf-metric-subtext">Conclusão acumulada</span>
          </div>

          <div className="cf-hero-metric-col">
            <span className="cf-metric-label">Metas concluídas</span>
            <span className="cf-metric-value cf-val-dark mono-number">
              {completedCount} de {cards.length}
            </span>
            <span className="cf-metric-subtext">Objetivos realizados</span>
          </div>
        </div>
      </section>

      {/* Main Goals Card */}
      <div className="cf-card">
        <div className="cf-card-header-row" style={{ marginBottom: '1.25rem' }}>
          <div>
            <span className="cf-card-category-tag">Seus objetivos</span>
            <h2 className="cf-card-main-title" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
              Metas e sonhos
            </h2>
          </div>

          <button className="cf-btn-primary-blue" onClick={handleOpenAddModal}>
            <Plus size={15} />
            <span>Nova meta</span>
          </button>
        </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="clean-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Sparkles size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
          <h3>Nenhuma meta cadastrada</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Clique em "Nova Meta" para adicionar seu primeiro objetivo financeiro!</p>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal} style={{ marginTop: '1rem' }}>
            <Plus size={15} />
            Cadastrar Meta
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {cards.map((card) => {
            const hasAmounts = (card.targetAmount && card.targetAmount > 0);
            const current = card.currentAmount || 0;
            const target = card.targetAmount || 0;
            const percent = hasAmounts ? Math.min(100, Math.round((current / target) * 100)) : (card.unlocked ? 100 : 0);

            return (
              <div 
                key={card.id} 
                className="clean-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.85rem',
                  position: 'relative',
                  border: card.unlocked ? '1px solid var(--color-success-border)' : '1px solid var(--border-color)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Card Top Row: Number, Rank & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="mono-number" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Nº {card.cardNo}
                    </span>
                    <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.65rem' }}>
                      {card.rank}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => handleOpenEditModal(card)}
                      title="Editar meta e foto"
                      style={{ padding: '0.25rem 0.4rem' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => setCardToDelete(card)}
                      title="Excluir meta"
                      style={{ padding: '0.25rem 0.4rem', color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Photo / Image Container */}
                <div 
                  onClick={() => handleOpenEditModal(card)}
                  style={{ 
                    height: '130px', 
                    background: 'var(--bg-subtle)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-sm)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  title="Clique para editar ou alterar a foto"
                >
                  <img 
                    src={getCardDisplayImage(card)} 
                    alt={card.name} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      filter: card.unlocked ? 'none' : 'grayscale(30%)',
                      transition: 'transform 0.2s ease',
                    }} 
                  />

                  {/* Status Overlay Badge */}
                  <div style={{ position: 'absolute', bottom: '0.4rem', right: '0.4rem' }}>
                    {card.unlocked ? (
                      <span className="badge badge-success badge-receita" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem' }}>
                        <CheckCircle2 size={11} /> Conquistada
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem' }}>
                        {percent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-main)' }}>{card.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{card.description}</p>
                </div>

                {/* Financial Progress if Target Amount set */}
                {hasAmounts && (
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Acumulado:</span>
                      <strong className="mono-number" style={{ color: 'var(--color-primary)' }}>
                        {formatCurrency(current)} / {formatCurrency(target)}
                      </strong>
                    </div>

                    <div className="clean-track" style={{ height: '6px' }}>
                      <div 
                        className="clean-bar" 
                        style={{ 
                          width: `${percent}%`, 
                          background: card.unlocked ? 'var(--color-success)' : 'var(--color-primary)' 
                        }}
                      ></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{percent}% atingido</span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => handleOpenContributionModal(card, 'add')}
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                          title="Adicionar aporte à meta"
                        >
                          + Aporte
                        </button>
                        {(card.currentAmount || 0) > 0 && (
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => handleOpenContributionModal(card, 'withdraw')}
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: 'var(--color-danger)' }}
                            title="Retirar ou resgatar valor desta meta"
                          >
                            - Retirar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Objective Text */}
                <div style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', marginTop: 'auto' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-dim)', fontSize: '0.7rem', display: 'block' }}>
                    Objetivo:
                  </span>
                  <p style={{ color: 'var(--text-main)', fontWeight: 500, margin: '0.1rem 0' }}>{card.objective}</p>
                </div>

                {/* Toggle Status Footer */}
                <button
                  type="button"
                  onClick={() => handleToggleUnlocked(card)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-color)',
                    background: card.unlocked ? 'var(--color-success-subtle)' : 'var(--bg-subtle)',
                    color: card.unlocked ? 'var(--color-success)' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {card.unlocked ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Meta Conquistada (Clique para alterar)</span>
                    </>
                  ) : (
                    <>
                      <Lock size={13} />
                      <span>Em Progresso (Marcar como Conquistada)</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* IN-APP MODAL: Add Contribution (Aporte) */}
      {contributionCard && (
        <div className="modal-overlay" onClick={() => setContributionCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={18} color={contributionMode === 'add' ? 'var(--color-primary)' : 'var(--color-danger)'} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  {contributionMode === 'add' ? 'Adicionar Aporte Financeiro' : 'Retirar / Resgatar da Meta'}
                </h3>
              </div>
              <button className="btn-close" onClick={() => setContributionCard(null)} title="Fechar">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmContribution} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Add vs Withdraw mode switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${contributionMode === 'add' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setContributionMode('add')}
                  style={{ fontSize: '0.8rem' }}
                >
                  <Plus size={14} /> Adicionar Aporte
                </button>
                <button
                  type="button"
                  className={`btn ${contributionMode === 'withdraw' ? 'btn-danger' : 'btn-outline'}`}
                  onClick={() => setContributionMode('withdraw')}
                  style={{ fontSize: '0.8rem' }}
                >
                  <Minus size={14} /> Retirar Valor
                </button>
              </div>

              {/* Card Summary Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={contributionCard.imageUrl || PRESET_IMAGES[0].url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{contributionCard.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Acumulado: {formatCurrency(contributionCard.currentAmount || 0)}
                    {contributionCard.targetAmount ? ` de ${formatCurrency(contributionCard.targetAmount)}` : ''}
                  </span>
                </div>
              </div>

              {/* Amount input */}
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {contributionMode === 'add' ? 'Valor a Adicionar (R$)' : 'Valor a Retirar (R$)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={contributionMode === 'withdraw' ? (contributionCard.currentAmount || 0) : undefined}
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="0,00"
                  className="cf-input hunter-input mono-number"
                  style={{ fontSize: '1.35rem', fontWeight: 700, padding: '0.6rem 0.75rem' }}
                  autoFocus
                  required
                />
              </div>

              {/* Quick increment chips */}
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.35rem', display: 'block' }}>
                  Atalhos rápidos de valor:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[50, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setContributionAmount(val.toString())}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      {contributionMode === 'add' ? '+' : '-'} R$ {val}
                    </button>
                  ))}

                  {contributionMode === 'add' && contributionCard.targetAmount && contributionCard.targetAmount > (contributionCard.currentAmount || 0) && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setContributionAmount((contributionCard.targetAmount! - (contributionCard.currentAmount || 0)).toString())}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                    >
                      Completar Meta (R$ {(contributionCard.targetAmount - (contributionCard.currentAmount || 0)).toLocaleString('pt-BR')})
                    </button>
                  )}

                  {contributionMode === 'withdraw' && (contributionCard.currentAmount || 0) > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setContributionAmount((contributionCard.currentAmount || 0).toString())}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                    >
                      Zerar / Retirar Tudo (R$ {(contributionCard.currentAmount || 0).toLocaleString('pt-BR')})
                    </button>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              {Number(contributionAmount) > 0 && (
                <div style={{ 
                  background: contributionMode === 'add' ? 'var(--color-primary-subtle)' : 'var(--color-warning-subtle)', 
                  border: `1px solid ${contributionMode === 'add' ? 'var(--color-primary-border)' : 'var(--color-warning-border)'}`, 
                  borderRadius: 'var(--radius-xs)', 
                  padding: '0.65rem 0.75rem', 
                  fontSize: '0.8rem', 
                  color: contributionMode === 'add' ? 'var(--color-primary)' : 'var(--color-warning)' 
                }}>
                  Novo saldo acumulado: <strong>
                    {formatCurrency(
                      contributionMode === 'add'
                        ? (contributionCard.currentAmount || 0) + Number(contributionAmount)
                        : Math.max(0, (contributionCard.currentAmount || 0) - Number(contributionAmount))
                    )}
                  </strong>
                  {contributionCard.targetAmount ? ` (${Math.min(100, Math.round((
                    (contributionMode === 'add' 
                      ? (contributionCard.currentAmount || 0) + Number(contributionAmount) 
                      : Math.max(0, (contributionCard.currentAmount || 0) - Number(contributionAmount))) 
                    / contributionCard.targetAmount) * 100))}% da meta total)` : ''}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.4rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setContributionCard(null)}>
                  Cancelar
                </button>
                <button type="submit" className={`btn ${contributionMode === 'add' ? 'btn-primary' : 'btn-danger'}`}>
                  {contributionMode === 'add' ? <Plus size={15} /> : <Minus size={15} />}
                  {contributionMode === 'add' ? 'Confirmar Aporte' : 'Confirmar Retirada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP MODAL: Delete Confirmation */}
      {cardToDelete && (
        <div className="modal-overlay" onClick={() => setCardToDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <Trash2 size={18} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Excluir Meta</h3>
              </div>
              <button className="btn-close" onClick={() => setCardToDelete(null)} title="Fechar">
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tem certeza de que deseja excluir a meta <strong>"{cardToDelete.name}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button className="btn btn-outline" onClick={() => setCardToDelete(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    onDeleteCard(cardToDelete.id);
                    audioManager.playKoExpense();
                    setCardToDelete(null);
                    setToastMessage({ text: 'Meta excluída com sucesso.', type: 'success' });
                  }}
                >
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP MODAL: Reset Confirmation */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <RefreshCw size={18} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Restaurar Dados Padrão</h3>
              </div>
              <button className="btn-close" onClick={() => setShowResetConfirm(false)} title="Fechar">
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tem certeza de que deseja restaurar as metas e dados padrão? Todos os seus dados personalizados salvos no navegador serão redefinidos.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button className="btn btn-outline" onClick={() => setShowResetConfirm(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    storage.resetAll();
                    onReloadData();
                    setShowResetConfirm(false);
                    setToastMessage({ text: 'Dados restaurados para o padrão!', type: 'success' });
                  }}
                >
                  Restaurar Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {editingCardId ? 'Editar Meta Financeira' : 'Cadastrar Nova Meta'}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)} title="Fechar">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '80vh', overflowY: 'auto' }}>
              {/* Photo Preview & Customization */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <img 
                    src={formImageUrl || PRESET_IMAGES[0].url} 
                    alt="Preview da Foto" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Foto / Imagem da Meta:
                  </label>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', fontSize: '0.75rem' }}>
                      <Camera size={13} />
                      Enviar Foto
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    placeholder="Ou cole uma URL de imagem (https://...)"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="cf-input hunter-input"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  />
                </div>
              </div>

              {/* Preset Photos Bar */}
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.3rem', display: 'block' }}>
                  Ou escolha uma imagem pronta:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormImageUrl(preset.url)}
                      className={`btn btn-sm ${formImageUrl === preset.url ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', padding: '0.25rem 0.5rem' }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Nome / Título da Meta</label>
                  <input
                    type="text"
                    placeholder="Ex: Viagem, Carro Novo, Reserva..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="cf-input hunter-input"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Nº / Identificador</label>
                  <input
                    type="text"
                    placeholder="001"
                    value={formCardNo}
                    onChange={(e) => setFormCardNo(e.target.value)}
                    className="cf-input hunter-input mono-number"
                  />
                </div>
              </div>

              {/* Priority & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Prioridade</label>
                  <select
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value as FinancialGoal['rank'])}
                    className="cf-select hunter-select"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Normal">Normal</option>
                    <option value="SS">SS (Máxima)</option>
                    <option value="S">S (Muito Alta)</option>
                    <option value="A">A (Importante)</option>
                    <option value="B">B (Secundária)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status Atual</label>
                  <select
                    value={formUnlocked ? 'unlocked' : 'locked'}
                    onChange={(e) => setFormUnlocked(e.target.value === 'unlocked')}
                    className="cf-select hunter-select"
                  >
                    <option value="locked">Em Progresso</option>
                    <option value="unlocked">Conquistada</option>
                  </select>
                </div>
              </div>

              {/* Target & Current Values */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Valor Alvo (R$) - Opcional</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5000,00"
                    value={formTargetAmount}
                    onChange={(e) => setFormTargetAmount(e.target.value)}
                    className="cf-input hunter-input mono-number"
                  />
                </div>

                <div className="form-group">
                  <label>Valor Atual Acumulado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1200,00"
                    value={formCurrentAmount}
                    onChange={(e) => setFormCurrentAmount(e.target.value)}
                    className="cf-input hunter-input mono-number"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Criar uma reserva segura para emergências familiares..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="cf-input hunter-input"
                />
              </div>

              {/* Objective */}
              <div className="form-group">
                <label>Critério de Sucesso / Objetivo</label>
                <input
                  type="text"
                  placeholder="Ex: Juntar R$ 5.000 ou quitar todas as faturas até Dezembro"
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value)}
                  className="cf-input hunter-input"
                />
              </div>

              {/* Reward text */}
              <div className="form-group">
                <label>Recompensa / Sensação ao Atingir (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Segurança, tranquilidade financeira, comemoração..."
                  value={formRewardText}
                  onChange={(e) => setFormRewardText(e.target.value)}
                  className="cf-input hunter-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCardId ? 'Salvar Alterações' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup and Data Persistence Card */}
      <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Backup e Privacidade de Dados</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Seus dados e metas são salvos com total segurança diretamente no seu navegador. Você pode exportar uma cópia em JSON ou importar em outro computador.
        </p>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <button className="btn btn-primary btn-sm" onClick={handleExport}>
            <Download size={14} />
            Exportar Backup JSON
          </button>

          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            Importar Backup JSON
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              style={{ display: 'none' }} 
            />
          </label>

          <button 
            className="btn btn-danger btn-sm"
            onClick={() => setShowResetConfirm(true)}
          >
            <RefreshCw size={13} />
            Restaurar Dados Padrão
          </button>
        </div>
      </div>
    </div>
  );
};

export const FinancialGoalsView = GreedIslandView;
