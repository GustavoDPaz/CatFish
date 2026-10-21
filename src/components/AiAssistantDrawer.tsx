import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { api } from '../services/api';
import { Bot, Send, Sparkles, X, Wrench, RefreshCw, ChevronRight } from 'lucide-react';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
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

      const assistantMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        toolsExecuted: response.toolsExecuted,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Erro na resposta do chat de IA:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, ocorreu uma instabilidade ao conectar com o serviço de IA. Por favor, tente novamente.',
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
              <div className="cf-ai-msg-bubble">
                {/* Tools executed pill */}
                {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                  <div className="cf-ai-tools-pill">
                    <Wrench size={11} />
                    <span>Dados obtidos via Open Finance Tool</span>
                  </div>
                )}
                <div className="cf-ai-msg-text">
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i}>
                      {line.startsWith('• ') ? (
                        <span className="cf-bullet-point">{line}</span>
                      ) : (
                        line
                      )}
                    </p>
                  ))}
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
