import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garante carregamento do .env tanto na raiz quanto em server/ independente de process.cwd()
const rootDir = path.resolve(__dirname, '../../../');
const serverDir = path.resolve(__dirname, '../../');

dotenv.config({ path: path.resolve(rootDir, '.env') });
dotenv.config({ path: path.resolve(serverDir, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // PostgreSQL Connection
  DATABASE_URL: z.string().default('postgres://catfish_user:catfish_secure_password@localhost:5432/catfish_db'),

  // Security - Master Encryption Key for AES-256-GCM (32 bytes / 64 hex chars or base64)
  // For dev only: 32 bytes sample key if not provided, production requires env
  APP_MASTER_ENCRYPTION_KEY: z.string().min(16).default('catfish_master_dev_secret_key_32bytes!'),

  // Open Finance - Pluggy / Belvo Credentials
  PLUGGY_CLIENT_ID: z.string().default(''),
  PLUGGY_CLIENT_SECRET: z.string().default(''),
  PLUGGY_WEBHOOK_SECRET: z.string().default('catfish_webhook_secret_key'),
  PLUGGY_BASE_URL: z.string().default('https://api.pluggy.ai'),

  // Google Gemini API Key
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),

  // JWT Secret
  JWT_SECRET: z.string().min(16).default('catfish_super_jwt_secret_dev_key_2026!'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
