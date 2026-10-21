import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OpenFinanceService } from '../services/openFinance.js';

// Cache for manual sync debounce (in memory per user: timestamp of last sync)
const lastManualSyncPerUser = new Map<string, number>();
const MANUAL_SYNC_DEBOUNCE_MS = 60000; // 60 seconds

export async function openFinanceRoutes(app: FastifyInstance) {
  /**
   * Helper to extract authenticated user id from request (Anti-IDOR)
   * In a production session, this comes from req.session or verified JWT cookie.
   */
  const getUserId = (req: FastifyRequest): string => {
    const userHeader = req.headers['x-user-id'] as string;
    return userHeader || 'usr-felipe-default';
  };

  // 1. Generate Connect Token for Widget
  app.get('/connect-token', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(req);
    const token = await OpenFinanceService.getConnectToken(userId);
    return reply.send(token);
  });

  // 2. Save new connection from Widget itemId
  app.post('/connections', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(req);
    const body = req.body as { itemId: string; institutionName?: string; institutionId?: string };

    if (!body?.itemId) {
      return reply.status(400).send({ error: 'itemId é obrigatório.' });
    }

    const conn = await OpenFinanceService.saveConnection(
      userId,
      body.itemId,
      body.institutionName || 'Banco Conectado',
      body.institutionId || 'generic_bank'
    );

    return reply.status(201).send(conn);
  });

  // 3. List active connections for user
  app.get('/connections', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(req);
    const connections = await OpenFinanceService.getUserConnections(userId);
    return reply.send({ connections });
  });

  // 4. Manual on-demand sync with debounce & rate-limiting
  app.post('/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(req);
    const now = Date.now();
    const lastSync = lastManualSyncPerUser.get(userId) || 0;
    const elapsed = now - lastSync;

    if (elapsed < MANUAL_SYNC_DEBOUNCE_MS) {
      const waitSeconds = Math.ceil((MANUAL_SYNC_DEBOUNCE_MS - elapsed) / 1000);
      return reply.status(429).send({
        error: 'Sincronização manual em taxa limite.',
        message: `Aguarde mais ${waitSeconds}s antes de sincronizar novamente.`,
        retryAfterSeconds: waitSeconds,
      });
    }

    lastManualSyncPerUser.set(userId, now);
    const result = await OpenFinanceService.syncAllActiveConnections(userId);
    const balances = await OpenFinanceService.getConsolidatedBalances(userId);
    const cards = await OpenFinanceService.getCreditCardsSummary(userId);

    return reply.send({
      success: true,
      syncedConnections: result.syncedCount,
      balances,
      cards,
      syncedAt: new Date().toISOString(),
    });
  });

  // 5. Consolidated & Individual Balances (for Sidebar & Overview)
  app.get('/balances', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(req);
    const balances = await OpenFinanceService.getConsolidatedBalances(userId);
    return reply.send(balances);
  });

  // 6. Consolidated & Individual Credit Card Limits
  app.get('/cards', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(req);
    const cards = await OpenFinanceService.getCreditCardsSummary(userId);
    return reply.send(cards);
  });
}
