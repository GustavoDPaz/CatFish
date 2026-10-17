import React, { useState } from 'react';
import type { AuthUser } from '../types';
import { storage } from '../utils/storage';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register fields
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = storage.loginUser(loginEmail, loginPassword);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Falha ao autenticar.');
      }
    }, 250);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (registerPassword !== registerConfirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = storage.registerUser(registerName, registerEmail, registerPassword);
      setIsLoading(false);
      if (res.success && res.user) {
        setSuccessMsg('Conta criada com sucesso! Redirecionando...');
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 350);
      } else {
        setError(res.error || 'Falha ao cadastrar usuário.');
      }
    }, 300);
  };

  const handleQuickDemo = () => {
    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      const res = storage.loginUser('felipe@catfish.finance', '123');
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        // Fallback demo user
        const demo = storage.getUsers()[0];
        if (demo) {
          storage.setActiveUser(demo);
          onLoginSuccess(demo);
        }
      }
    }, 200);
  };

  return (
    <div className="cf-auth-fullscreen">
      {/* Background Ambience Elements */}
      <div className="cf-auth-glow-bg" />
      <div className="cf-auth-grid-overlay" />

      <div className="cf-auth-container">
        {/* Brand Header */}
        <div className="cf-auth-brand-wrap">
          <div className="cf-auth-logo-box">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" 
                fill="#10B981" 
              />
              <path 
                d="M8 11C8.82843 11 9.5 10.3284 9.5 9.5C9.5 8.67157 8.82843 8 8 8C7.17157 8 6.5 8.67157 6.5 9.5C6.5 10.3284 7.17157 11 8 11Z" 
                fill="#064E3B" 
              />
              <path 
                d="M16 11C16.8284 11 17.5 10.3284 17.5 9.5C17.5 8.67157 16.8284 8 16 8C15.1716 8 14.5 8.67157 14.5 9.5C14.5 10.3284 15.1716 11 16 11Z" 
                fill="#064E3B" 
              />
              <path 
                d="M8.5 14.5C9.5 16 14.5 16 15.5 14.5" 
                stroke="#064E3B" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
              />
              <path 
                d="M3 13C4.5 13.5 6 12.5 6 12.5" 
                stroke="#064E3B" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
              />
              <path 
                d="M21 13C19.5 13.5 18 12.5 18 12.5" 
                stroke="#064E3B" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
              />
            </svg>
          </div>
          <h1 className="cf-auth-brand-name">CatFish</h1>
          <p className="cf-auth-brand-tagline">
            Gestão financeira inteligente com dados isolados por usuário
          </p>
        </div>

        {/* Auth Main Card */}
        <div className="cf-auth-card">
          {/* Mode Switch Tabs */}
          <div className="cf-auth-tabs">
            <button
              type="button"
              className={`cf-auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
            >
              Entrar na conta
            </button>
            <button
              type="button"
              className={`cf-auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
            >
              Criar nova conta
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="cf-auth-alert cf-auth-alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="cf-auth-alert cf-auth-alert-success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="cf-auth-form">
              <div className="cf-auth-field-group">
                <label htmlFor="login-email" className="cf-auth-label">Email cadastrado</label>
                <div className="cf-auth-input-wrap">
                  <Mail size={17} className="cf-auth-input-icon" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="cf-auth-input"
                    placeholder="seu.email@exemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="cf-auth-field-group">
                <div className="cf-auth-label-row">
                  <label htmlFor="login-password" className="cf-auth-label">Sua senha</label>
                </div>
                <div className="cf-auth-input-wrap">
                  <Lock size={17} className="cf-auth-input-icon" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="cf-auth-input"
                    placeholder="Digite sua senha"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="cf-auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="cf-auth-options-row">
                <label className="cf-auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Permanecer conectado</span>
                </label>
              </div>

              <button
                type="submit"
                className="cf-auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>Autenticando...</span>
                ) : (
                  <>
                    <span>Acessar painel</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="cf-auth-divider">
                <span>ou</span>
              </div>

              <button
                type="button"
                className="cf-auth-demo-btn"
                onClick={handleQuickDemo}
                disabled={isLoading}
              >
                <Sparkles size={16} className="cf-auth-demo-sparkle" />
                <span>Acessar demonstração com 1 clique (Felipe)</span>
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="cf-auth-form">
              <div className="cf-auth-field-group">
                <label htmlFor="reg-name" className="cf-auth-label">Nome completo</label>
                <div className="cf-auth-input-wrap">
                  <User size={17} className="cf-auth-input-icon" />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    className="cf-auth-input"
                    placeholder="Ex: Gustavo Silva"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="cf-auth-field-group">
                <label htmlFor="reg-email" className="cf-auth-label">Email de acesso</label>
                <div className="cf-auth-input-wrap">
                  <Mail size={17} className="cf-auth-input-icon" />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="cf-auth-input"
                    placeholder="seu.email@empresa.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="cf-auth-field-group">
                <label htmlFor="reg-password" className="cf-auth-label">Criar senha</label>
                <div className="cf-auth-input-wrap">
                  <Lock size={17} className="cf-auth-input-icon" />
                  <input
                    id="reg-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="cf-auth-input"
                    placeholder="Mínimo 3 caracteres"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={3}
                  />
                  <button
                    type="button"
                    className="cf-auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="cf-auth-field-group">
                <label htmlFor="reg-confirm" className="cf-auth-label">Confirmar senha</label>
                <div className="cf-auth-input-wrap">
                  <Lock size={17} className="cf-auth-input-icon" />
                  <input
                    id="reg-confirm"
                    name="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="cf-auth-input"
                    placeholder="Repita sua senha"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="cf-auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>Criando conta...</span>
                ) : (
                  <>
                    <span>Criar conta e iniciar</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security & Multi-tenant Badge */}
          <div className="cf-auth-footer-note">
            <ShieldCheck size={16} className="cf-auth-shield-icon" />
            <span>
              Ambiente em nuvem com isolamento multi-inquilino de dados financeiros.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
