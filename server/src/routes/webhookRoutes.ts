import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyWebhookSignature } from '../security/hmac.js';
import { OpenFinanceService } from '../services/openFinance.js';

interface PluggyWebhookPayload {
  event: 'item/created' | 'item/updated' | 'item/error' | 'item/deleted' | 'transactions/created' | string;
  eventId?: string;
  itemId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export async function webhookRoutes(app: FastifyInstance) {
  /**
   * Pluggy Webhook Receiver Handler
   * Responds HTTP 200 in < 5 seconds and processes sync asynchronously (AppSec Best Practice)
   */
  const handlePluggyWebhook = async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = (req.headers['x-signature'] || req.headers['x-pluggy-signature']) as string;
    const rawBody = JSON.stringify(req.body);

    // 1. Verify HMAC SHA-256 signature if configured
    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Webhook Pluggy] Assinatura HMAC inválida recebida.');
      return reply.status(401).send({ error: 'Assinatura HMAC inválida.' });
    }

    const payload = req.body as PluggyWebhookPayload;
    const eventType = payload?.event || 'UNKNOWN';
    const itemId = payload?.itemId;

    console.log(`[Webhook Pluggy] Evento recebido: ${eventType} | ItemId: ${itemId || 'N/A'}`);

    // 2. Process asynchronous heavy work (guarantees < 5s response)
    setImmediate(async () => {
      try {
        switch (eventType) {
          case 'item/created':
            console.log(`[Webhook Pluggy] Nova conexão criada para o itemId: ${itemId}`);
            await OpenFinanceService.syncAllActiveConnections();
            break;

          case 'item/updated':
          case 'transactions/created':
            console.log(`[Webhook Pluggy] Dados bancários atualizados para o itemId: ${itemId}. Sincronizando contas e lançamentos...`);
            await OpenFinanceService.syncAllActiveConnections();
            break;

          case 'item/error':
            console.error(`[Webhook Pluggy] Erro de autenticação/banco no itemId: ${itemId}`, payload.error);
            break;

          default:
            console.log(`[Webhook Pluggy] Evento secundário recebido: ${eventType}`);
            break;
        }
      } catch (err) {
        console.error('[Webhook Pluggy] Erro durante o processamento assíncrono:', err);
      }
    });

    // 3. Return 200 within 5 seconds as required by Pluggy
    return reply.status(200).send({ received: true });
  };

  // Route aliases: /api/webhooks/pluggy and /api/webhooks/open-finance
  app.post('/pluggy', handlePluggyWebhook);
  app.post('/open-finance', handlePluggyWebhook);
}
