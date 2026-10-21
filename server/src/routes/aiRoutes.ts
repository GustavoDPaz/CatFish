import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GeminiAgentService, ChatMessage } from '../services/geminiAgent.js';

export async function aiRoutes(app: FastifyInstance) {
  const getUserId = (req: FastifyRequest): string => {
    const userHeader = req.headers['x-user-id'] as string;
    return userHeader || 'usr-felipe-default';
  };

  app.post('/chat', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(req);
    const body = req.body as { message: string; history?: ChatMessage[] };

    if (!body?.message || typeof body.message !== 'string') {
      return reply.status(400).send({ error: 'Mensagem inválida ou ausente.' });
    }

    try {
      const response = await GeminiAgentService.handleChat(userId, body.message, body.history || []);
      return reply.send({
        reply: response.text,
        toolsExecuted: response.toolsExecuted,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[AiRoutes] Erro ao processar mensagem do chat:', err);
      return reply.status(500).send({
        error: 'Falha interna ao processar requisição com assistente de IA.',
      });
    }
  });
}
