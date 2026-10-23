import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GeminiAgentService, ChatMessage } from '../services/geminiAgent.js';
import { validatePromptGuardrails } from '../security/sanitizer.js';

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

      // 1. Pré-Validação e Guardrails Locais no Backend (Custo Zero de Tokens)
      // Bloqueia Prompt Injections, Jailbreak, dados de cartão/senhas e limita a 500 chars
      const guardResult = validatePromptGuardrails(body?.message);
      if (!guardResult.allowed) {
        return reply.send({
          reply: guardResult.refusalMessage,
          toolsExecuted: [],
          timestamp: new Date().toISOString(),
        });
      }

      const cleanMessage = guardResult.sanitizedMessage!;

      try {
        const response = await GeminiAgentService.handleChat(userId, cleanMessage, body.history || []);
        return reply.send({
          reply: response.text,
          toolsExecuted: response.toolsExecuted,
          createdTransaction: response.createdTransaction,
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
