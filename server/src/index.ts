import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { initDb } from './db.js';
import { startBackgroundSyncWorker, stopBackgroundSyncWorker } from './services/syncWorker.js';
import { openFinanceRoutes } from './routes/openFinanceRoutes.js';
import { aiRoutes } from './routes/aiRoutes.js';
import { webhookRoutes } from './routes/webhookRoutes.js';
import { userDataRoutes } from './routes/userDataRoutes.js';
import { authRoutes } from './routes/authRoutes.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          // Zero Data Leakage: strip headers that might carry auth tokens or cookies
          remoteAddress: req.ip,
        };
      },
    },
  },
});

async function main() {
  // 1. CORS Setup
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost dev servers or configured domain or Tailscale Funnel domain
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('ts.net')) {
        cb(null, true);
        return;
      }
      cb(null, origin === env.CORS_ORIGIN);
    },
    credentials: true,
  });

  // 2. Cookie Support (HttpOnly, Secure)
  await app.register(cookie, {
    secret: env.JWT_SECRET,
    parseOptions: {},
  });

  // 3. Global Rate Limiter
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  // 3.1. Security Headers (Defense-in-Depth)
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  });

  // 3.2. Centralized Error Handler (Zero Stack Trace Leakage)
  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    reply.status(statusCode).send({
      statusCode,
      error: statusCode === 500 ? 'Internal Server Error' : (error.name || 'Bad Request'),
      message: statusCode === 500 ? 'Ocorreu um erro interno no servidor.' : error.message,
    });
  });

  // 4. Health Check
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // 5. Register Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userDataRoutes, { prefix: '/api/user-data' });
  await app.register(openFinanceRoutes, { prefix: '/api/open-finance' });
  await app.register(aiRoutes, { prefix: '/api/ai' });
  await app.register(webhookRoutes, { prefix: '/api/webhooks' });
  await app.register(webhookRoutes, { prefix: '/webhooks' });

  // 6. Connect Database & Start Workers
  await initDb();
  startBackgroundSyncWorker();

  // 7. Start Listening
  try {
    const address = await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`[CatFish Server] Servidor backend ativo em ${address}`);
    const hasGeminiKey = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '' && !env.GEMINI_API_KEY.includes('your_gemini'));
    console.log(`[CatFish Server] Status da IA (Gemini): ${hasGeminiKey ? '✅ Ativo (Chave configurada)' : '⚠️ Desativado (GEMINI_API_KEY ausente ou placeholder)'}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[CatFish Server] Recebido SIGTERM, encerrando com segurança...');
  stopBackgroundSyncWorker();
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[CatFish Server] Recebido SIGINT, encerrando com segurança...');
  stopBackgroundSyncWorker();
  await app.close();
  process.exit(0);
});

main();
