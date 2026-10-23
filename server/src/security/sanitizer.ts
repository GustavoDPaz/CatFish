/**
 * Sanitizes financial and personal data before sending to LLM or logs.
 * Zero Data Leakage principle: No sensitive tokens, CPFs or raw account credentials.
 */

export function maskCpf(cpf: string): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.***-${digits.slice(9)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [user, domain] = email.split('@');
  const visible = user.length > 2 ? `${user.slice(0, 2)}***` : `${user.slice(0, 1)}***`;
  return `${visible}@${domain}`;
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return '••••';
  const cleaned = accountNumber.trim();
  if (cleaned.length <= 4) return `••••${cleaned}`;
  return `••••${cleaned.slice(-4)}`;
}

/**
 * Sanitizes arbitrary objects for safe logging or AI consumption.
 * Recursively removes blacklisted keys like 'password', 'token', 'secret', etc.
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }

  const sensitiveKeys = new Set([
    'password',
    'password_hash',
    'passwordhash',
    'token',
    'access_token',
    'encrypted_access_token',
    'secret',
    'apikey',
    'api_key',
    'authorization',
  ]);

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Sanitizes and trims user prompt inputs to mitigate Prompt Injection attacks and excessive context lengths.
 */
export function sanitizePromptInput(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';
  // Strip null bytes and non-printable control characters
  let cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Normalize excessive whitespaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // Enforce maximum length limit
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}

export interface GuardrailCheckResult {
  allowed: boolean;
  refusalMessage?: string;
  sanitizedMessage?: string;
}

/**
 * Validação prévia de segurança em backend com CUSTO ZERO de tokens:
 * 1. Limite estrito de 500 caracteres (rejeição / truncamento)
 * 2. Filtro DLP Básico (Número de cartão de crédito de 16 dígitos ou CPF + palavras de senha/CVV)
 * 3. Filtro Anti-Injection / Jailbreak via Regex
 */
export function validatePromptGuardrails(rawInput: string): GuardrailCheckResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      allowed: false,
      refusalMessage: 'Mensagem inválida ou ausente.',
    };
  }

  // 1. Limite de Caracteres de Entrada (Max 500 caracteres)
  let trimmed = rawInput.trim();
  if (trimmed.length > 500) {
    trimmed = trimmed.slice(0, 500);
  }

  const sanitized = sanitizePromptInput(trimmed, 500);
  if (!sanitized) {
    return {
      allowed: false,
      refusalMessage: 'Mensagem não pode ser vazia ou conter apenas caracteres de controle.',
    };
  }

  // 2. Filtro de Dados Sensíveis (DLP Básico via Regex)
  // Detecção de Cartão de Crédito (16 dígitos contínuos ou grupos de 4 dígitos)
  const creditCardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/;
  // Detecção de CPF (11 dígitos formatados ou contínuos)
  const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
  // Palavras indicativas de segredos ou autenticação
  const sensitiveWordsRegex = /\b(senha|password|cvv|cvc|c[oó]digo\s+de\s+seguran[cç]a|pin|chave\s+de\s+seguran[cç]a|token\s+secreto)\b/i;

  const hasCreditCard = creditCardRegex.test(sanitized);
  const hasCpf = cpfRegex.test(sanitized);
  const hasSensitiveWord = sensitiveWordsRegex.test(sanitized);

  if (hasCreditCard || (hasCpf && hasSensitiveWord) || (hasSensitiveWord && /\b\d{3,6}\b/.test(sanitized))) {
    return {
      allowed: false,
      refusalMessage: 'Por segurança, nunca solicitamos senhas, códigos ou dados de cartão pelo chat. Não compartilhe essas informações.',
    };
  }

  // 3. Filtro Regex Local (Anti-Prompt Injection / Jailbreak Básico)
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous\s+)?instructions/i,
    /ignore\s+(as\s+)?instru[çc][õo]es(\s+anteriores)?/i,
    /desconsidere\s+(as\s+)?instru[çc][õo]es(\s+anteriores)?/i,
    /system\s+prompt/i,
    /prompt\s+do\s+sistema/i,
    /modo\s+desenvolvedor/i,
    /developer\s+mode/i,
    /\bjailbreak\b/i,
    /\baja\s+como\b/i,
    /\bact\s+as\b/i,
    /\bsimule\s+(que\s+)?voc[êe]\b/i,
    /\bimagine\s+(que\s+)?voc[êe]\s+[ée]\b/i,
    /esque[çc]a\s+(as\s+)?(suas\s+)?regras/i,
    /forget\s+(all\s+)?(your\s+)?rules/i,
    /\bdan\s+mode\b/i,
    /bypass\s+rules/i,
    /revele\s+(o\s+)?(seu\s+)?prompt/i,
    /reveal\s+(your\s+)?prompt/i,
    /qual\s+[ée]\s+(o\s+)?seu\s+system\s+prompt/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      return {
        allowed: false,
        refusalMessage: 'Sou o assistente exclusivo do CatFish e só posso ajudar com dúvidas relacionadas à nossa plataforma financeira.',
      };
    }
  }

  return {
    allowed: true,
    sanitizedMessage: sanitized,
  };
}

