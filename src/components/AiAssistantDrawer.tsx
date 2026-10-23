import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Transaction } from '../types';
import { api } from '../services/api';
import { Bot, Send, Sparkles, X, Wrench, RefreshCw, ChevronRight } from 'lucide-react';

const parseInline = (text: string): React.ReactNode => {
  const tokenRegex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={idx} className="cf-ai-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <strong key={idx} className="cf-ai-bold">
          <em className="cf-ai-italic">{parseInline(part.slice(3, -3))}</em>
        </strong>
      );
    }
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={idx} className="cf-ai-bold">
          {parseInline(part.slice(2, -2))}
        </strong>
      );
    }
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <em key={idx} className="cf-ai-italic">
          {parseInline(part.slice(1, -1))}
        </em>
      );
    }
    return part;
  });
};

export const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushList = () => {
    if (!currentList) return;
    const ListTag = currentList.type;
    const listClass = currentList.type === 'ul' ? 'cf-ai-ul' : 'cf-ai-ol';
    elements.push(
      <ListTag key={`list-${elements.length}`} className={listClass}>
        {currentList.items.map((item, idx) => (
          <li key={idx} className="cf-ai-li">
            {parseInline(item)}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  const flushCode = () => {
    if (codeBuffer.length === 0) return;
    elements.push(
      <pre key={`code-${elements.length}`} className="cf-ai-pre">
        <code className="cf-ai-code-block">{codeBuffer.join('\n')}</code>
      </pre>
    );
    codeBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    const ulMatch = trimmed.match(/^([•\-*])\s+(.*)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[2]);
      continue;
    }

    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="cf-ai-p">
        {parseInline(rawLine)}
      </p>
    );
  }

  flushList();
  if (inCodeBlock) flushCode();

  return <div className="cf-ai-rendered-markdown">{elements}</div>;
};

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onTransactionCreated?: (transaction: Transaction) => void;
}

const QUICK_PROMPTS = [
  'Qual o meu saldo consolidado?',
  'Qual a situação das minhas faturas de cartão?',
  'Onde gastei mais neste mês?',
  'Como estão minhas metas financeiras?',
];

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  userName = 'Gustavo',
  onTransactionCreated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Olá, **${userName}**! Sou o **CatFish AI**, seu assistente financeiro integrado ao **Open Finance** e ao **Google Gemini**.\n\nPosso consultar seus saldos consolidados, limites de cartões e histórico de transações em tempo real. O que gostaria de analisar agora?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentToolExecuting, setCurrentToolExecuting] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentToolExecuting]);

  if (!isOpen) return null;

  const getToolLabel = (toolName: string) => {
    switch (toolName) {
      case 'get_consolidated_and_individual_balances':
        return 'Consultando saldos e contas bancárias...';
      case 'get_credit_cards_limits_summary':
        return 'Verificando limites e faturas dos cartões...';
      case 'get_transactions_by_period':
        return 'Analisando lançamentos e extrato do período...';
      case 'get_spending_limits_and_goals':
        return 'Conferindo tetos de gastos e metas...';
      case 'create_transaction':
        return 'Registrando novo lançamento na conta...';
      default:
        return 'Acessando dados financeiros seguros...';
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setCurrentToolExecuting('Analisando intenção...');

    try {
      const response = await api.sendChatMessage(text, messages);

      if (response.toolsExecuted && response.toolsExecuted.length > 0) {
        setCurrentToolExecuting(getToolLabel(response.toolsExecuted[0]));
        await new Promise((r) => setTimeout(r, 450));
      }

      if (response.createdTransaction && onTransactionCreated) {
        onTransactionCreated(response.createdTransaction);
      }

      const assistantMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        toolsExecuted: response.toolsExecuted,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Erro na resposta do chat de IA:', err);
      const errMsg = err?.message || 'Falha ao conectar com o serviço de IA.';
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: `❌ **Não foi possível obter resposta da IA:**\n${errMsg}\n\nVerifique se o backend está ativo e sua chave do Gemini configurada.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setCurrentToolExecuting(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="cf-ai-drawer-backdrop" onClick={onClose}>
      <aside 
        className="cf-ai-drawer" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Assistente Financeiro IA CatFish"
      >
        {/* Drawer Header */}
        <div className="cf-ai-drawer-header">
          <div className="cf-ai-header-left">
            <div className="cf-ai-bot-avatar">
              <Bot size={20} className="cf-text-emerald" />
              <span className="cf-ai-online-dot" />
            </div>
            <div>
              <div className="cf-ai-title-row">
                <span className="cf-ai-title">Assistente IA</span>
                <span className="cf-ai-model-tag">Gemini Flash</span>
              </div>
              <span className="cf-ai-status-caption">Conectado via Open Finance (Somente leitura)</span>
            </div>
          </div>
          <button 
            className="cf-ai-close-btn" 
            onClick={onClose}
            aria-label="Fechar assistente de IA"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Container */}
        <div className="cf-ai-messages-container">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`cf-ai-message-row ${msg.role === 'user' ? 'cf-ai-msg-user' : 'cf-ai-msg-assistant'}`}
            >
              {msg.role === 'assistant' && (
                <div className="cf-ai-msg-avatar">
                  <Sparkles size={14} className="cf-text-emerald" />
                </div>
              )}
              <div className={`cf-ai-msg-bubble ${msg.content.startsWith('❌') ? 'cf-ai-bubble-error' : ''}`}>
                {/* Tools executed pill */}
                {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                  <div className="cf-ai-tools-pill">
                    <Wrench size={11} />
                    <span>Dados obtidos via Open Finance Tool</span>
                  </div>
                )}
                <div className="cf-ai-msg-text">
                  <MarkdownMessage content={msg.content} />
                </div>
                <span className="cf-ai-msg-time">{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {/* Tool Execution Live Indicator */}
          {isLoading && currentToolExecuting && (
            <div className="cf-ai-message-row cf-ai-msg-assistant">
              <div className="cf-ai-msg-avatar">
                <RefreshCw size={14} className="cf-spin cf-text-emerald" />
              </div>
              <div className="cf-ai-msg-bubble cf-ai-loading-bubble">
                <div className="cf-ai-executing-tool-box">
                  <Wrench size={13} className="cf-spin" />
                  <span>{currentToolExecuting}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Chips */}
        <div className="cf-ai-quick-prompts-bar">
          <span className="cf-ai-quick-caption">Perguntas Rápidas:</span>
          <div className="cf-ai-chips-list">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                className="cf-ai-chip-btn"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
              >
                <span>{prompt}</span>
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="cf-ai-input-bar">
          <input
            ref={inputRef}
            type="text"
            maxLength={500}
            className="cf-ai-input"
            placeholder="Pergunte sobre saldo, cartões, extrato..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className="cf-ai-send-btn"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Enviar mensagem ao assistente"
          >
            <Send size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
};
