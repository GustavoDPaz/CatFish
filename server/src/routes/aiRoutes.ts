import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GeminiAgentService, ChatMessage } from '../services/geminiAgent.js';
import { sanitizePromptInput } from '../security/sanitizer.js';

export async function aiRoutes(app: FastifyInstance) {
  const getUserId = (req: FastifyRequest): string => {
    const userHeader = req.headers['x-user-id'] as string;
    return userHeader || 'usr-felipe-default';
  };

  app.post(
    '/chat',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(req);
      const body = req.body as { message: string; history?: ChatMessage[] };

      if (!body?.message || typeof body.message !== 'string') {
        return reply.status(400).send({ error: 'Mensagem inválida ou ausente.' });
      }

      if (body.message.length > 1000) {
        return reply.status(400).send({
          error: 'Mensagem excede o limite máximo permitido de 1000 caracteres.',
        });
      }

      const cleanMessage = sanitizePromptInput(body.message, 800);
      if (!cleanMessage) {
        return reply.status(400).send({ error: 'Mensagem não pode ser vazia ou conter apenas caracteres de controle.' });
      }

      try {
        const response = await GeminiAgentService.handleChat(userId, cleanMessage, body.history || []);
        return reply.send({
          reply: response.text,
          toolsExecuted: response.toolsExecuted,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        req.log.error(err);
        return reply.status(500).send({
          error: 'Falha interna ao processar requisição com assistente de IA.',
        });
      }
    }
  );
}
