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
