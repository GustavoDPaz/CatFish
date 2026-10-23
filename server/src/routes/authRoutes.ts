import { FastifyPluginAsync } from 'fastify';
import { query } from '../db.js';

interface DbUser {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar_url?: string;
  created_at: string;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  // GET all users (list)
  app.get('/users', async (_request, reply) => {
    try {
      const rows = await query<DbUser>(
        'SELECT id, name, email, avatar_url, created_at FROM app_users ORDER BY created_at ASC'
      );
      return reply.send({ success: true, users: rows });
    } catch (err: unknown) {
      return reply.status(500).send({ error: 'Erro ao buscar usuários' });
    }
  });

  // POST register
  app.post<{ Body: { name?: string; email?: string; password?: string } }>('/register', async (request, reply) => {
    const { name, email, password } = request.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanName) {
      return reply.status(400).send({ error: 'Nome é obrigatório' });
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return reply.status(400).send({ error: 'Email inválido' });
    }
    if (!cleanPassword || cleanPassword.length < 3) {
      return reply.status(400).send({ error: 'A senha deve ter pelo menos 3 caracteres' });
    }

    try {
      const existing = await query<DbUser>('SELECT id FROM app_users WHERE email = $1', [cleanEmail]);
      if (existing.length > 0) {
        return reply.status(409).send({ error: 'Este email já está cadastrado' });
      }

      const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await query(
        `INSERT INTO app_users (id, name, email, password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [newId, cleanName, cleanEmail, cleanPassword]
      );

      const user = {
        id: newId,
        name: cleanName,
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      };

      return reply.send({ success: true, user });
    } catch (err: unknown) {
      request.log.error(err, '[AuthRoutes] Erro no registro');
      return reply.status(500).send({ error: 'Erro ao registrar usuário' });
    }
  });

  // POST login
  app.post<{ Body: { email?: string; password?: string } }>('/login', async (request, reply) => {
    const { email, password } = request.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return reply.status(400).send({ error: 'Email e senha são obrigatórios' });
    }

    try {
      const rows = await query<DbUser>(
        'SELECT id, name, email, password, avatar_url, created_at FROM app_users WHERE email = $1',
        [cleanEmail]
      );

      if (rows.length === 0) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      const user = rows[0];
      if (user.password !== cleanPassword) {
        return reply.status(401).send({ error: 'Senha incorreta' });
      }

      return reply.send({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
        },
      });
    } catch (err: unknown) {
      request.log.error(err, '[AuthRoutes] Erro no login');
      return reply.status(500).send({ error: 'Erro ao autenticar usuário' });
    }
  });
};
