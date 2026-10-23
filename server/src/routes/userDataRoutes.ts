import { FastifyPluginAsync } from 'fastify';
import { query } from '../db.js';

interface StorageRow {
  data_key: string;
  payload: any;
}

interface UserDataBody {
  key?: string;
  payload?: any;
  data?: Record<string, any>;
  [key: string]: any;
}

export const userDataRoutes: FastifyPluginAsync = async (app) => {
  // GET all user data for a specific user ID
  app.get<{ Params: { userId: string } }>('/:userId', async (request, reply) => {
    const { userId } = request.params;
    if (!userId || typeof userId !== 'string') {
      return reply.status(400).send({ error: 'ID de usuário inválido' });
    }

    try {
      const rows = await query<StorageRow>(
        'SELECT data_key, payload FROM user_app_storage WHERE user_id = $1',
        [userId]
      );

      const result: Record<string, any> = {};
      for (const row of rows) {
        result[row.data_key] = row.payload;
      }

      return reply.send({ success: true, userId, data: result });
    } catch (err: unknown) {
      request.log.error(err, '[UserDataRoutes] Erro ao carregar dados do usuário');
      return reply.status(500).send({ error: 'Erro ao carregar dados do banco de dados' });
    }
  });

  // POST to persist specific key or full snapshot
  app.post<{ Params: { userId: string }; Body: UserDataBody }>('/:userId', async (request, reply) => {
    const { userId } = request.params;
    const body: UserDataBody = (request.body as UserDataBody) || {};

    if (!userId || typeof userId !== 'string') {
      return reply.status(400).send({ error: 'ID de usuário inválido' });
    }

    try {
      const updatedKeys: string[] = [];

      // Case 1: single key-payload object { key: 'accounts', payload: [...] }
      if (typeof body.key === 'string' && body.payload !== undefined) {
        await query(
          `INSERT INTO user_app_storage (user_id, data_key, payload, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (user_id, data_key)
           DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
          [userId, body.key, JSON.stringify(body.payload)]
        );
        updatedKeys.push(body.key);
      } else {
        // Case 2: snapshot or dict of keys { accounts: [...], transactions: [...], ... }
        const entries = body.data && typeof body.data === 'object' ? Object.entries(body.data) : Object.entries(body);
        for (const [key, val] of entries) {
          if (val === undefined || key === 'key' || key === 'userId') continue;
          await query(
            `INSERT INTO user_app_storage (user_id, data_key, payload, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id, data_key)
             DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
            [userId, key, JSON.stringify(val)]
          );
          updatedKeys.push(key);
        }
      }

      return reply.send({ success: true, userId, updatedKeys });
    } catch (err: unknown) {
      request.log.error(err, '[UserDataRoutes] Erro ao salvar dados do usuário');
      return reply.status(500).send({ error: 'Erro ao salvar dados no banco de dados' });
    }
  });
};
