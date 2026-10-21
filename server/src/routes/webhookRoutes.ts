import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyWebhookSignature } from '../security/hmac.js';
import { OpenFinanceService } from '../services/openFinance.js';

export async function webhookRoutes(app: FastifyInstance) {
  // Pluggy / Open Finance Webhook Receiver
  app.post('/open-finance', async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = (req.headers['x-signature'] || req.headers['x-pluggy-signature']) as string;
    const rawBody = JSON.stringify(req.body);

    // Verify HMAC signature in production or if signature is present
    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Webhook] Assinatura HMAC inválida no webhook do Open Finance.');
      return reply.status(401).send({ error: 'Assinatura HMAC inválida.' });
    }

    const payload = req.body as { event?: string; itemId?: string };
    console.log(`[Webhook] Evento Open Finance recebido: ${payload?.event || 'UNKNOWN'} para itemId: ${payload?.itemId || 'N/A'}`);

    // Asynchronously dispatch sync job without blocking webhook response
    setImmediate(async () => {
      try {
        await OpenFinanceService.syncAllActiveConnections();
      } catch (err) {
        console.error('[Webhook] Falha ao sincronizar após evento de webhook:', err);
      }
    });

    return reply.status(200).send({ received: true });
  });
}
