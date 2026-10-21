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
      // Allow localhost dev servers or configured domain
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
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

  // 4. Health Check
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // 5. Register Routes
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
