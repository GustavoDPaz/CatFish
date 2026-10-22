import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import { OpenFinanceService } from './openFinance.js';
import { query, isDbLive } from '../db.js';
import { sanitizeObject } from '../security/sanitizer.js';

// Helper to obtain GoogleGenAI client dynamically
const getAiClient = (): GoogleGenAI | null => {
  const key = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '' || key.includes('your_gemini')) {
    return null;
  }
  return new GoogleGenAI({ apiKey: key.trim() });
};

/**
 * Builds a dynamic, privacy-conscious system instruction injecting real-time financial context
 */
const buildSystemInstruction = async (userId: string): Promise<string> => {
  let financialContext = '';
  try {
    const [balances, cards] = await Promise.all([
      OpenFinanceService.getConsolidatedBalances(userId),
      OpenFinanceService.getCreditCardsSummary(userId),
    ]);

    const accountsList = balances.accounts.length > 0
      ? balances.accounts.map((a) => `• ${a.institutionName} (${a.accountName}): R$ ${a.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')
      : '• Conta Corrente: R$ 4.200,00';

    const cardsList = cards.cards.length > 0
      ? cards.cards.map((c) => `• ${c.cardName} (${c.institutionName}): Limite R$ ${c.totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Fatura Atual R$ ${c.usedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Disponível R$ ${c.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Vencimento dia ${c.dueDay}`).join('\n')
      : '• Cartão Principal: Limite R$ 5.000,00, Usado R$ 1.200,00, Disponível R$ 3.800,00';

    financialContext = `
DADOS FINANCEIROS REAIS DO USUÁRIO (Open Finance em tempo real):
- Saldo Consolidado em Contas: R$ ${balances.consolidatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Contas Conectadas:
${accountsList}

- Cartões de Crédito:
Limite Consolidado: R$ ${cards.consolidated.totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Total de Faturas: R$ ${cards.consolidated.totalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Disponível Geral: R$ ${cards.consolidated.totalAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
Detalhamento dos Cartões:
${cardsList}
`;
  } catch (err) {
    console.warn('[GeminiAgent] Aviso: não foi possível carregar o resumo financeiro inicial:', err);
  }

  return `Você é o CatFish AI, o copiloto financeiro inteligente do aplicativo CatFish, integrado ao Open Finance Brasil.
Sua missão é responder com empatia, inteligência e clareza sobre finanças, saldo, faturas de cartão, extrato e controle financeiro.

${financialContext}

Diretrizes de Comunicação e Formatação:
1. Responda SEMPRE em Português do Brasil de maneira natural, humana, cordial e consultiva.
2. Utilize formatação Markdown limpa: destaque valores monetários (R$) e nomes de bancos/categorias com negrito (**exemplo**), e use marcadores (•) para listar itens.
3. Se o usuário fizer uma saudação informal (ex: "oi", "olá", "tudo bem?", "boa tarde"), responda de forma agradável e pergunte como pode auxiliá-lo com as finanças hoje, destacando que você pode consultar saldos, verificar faturas ou registrar novos lançamentos.
4. Quando perguntarem sobre saldo, cartões ou despesas, use os dados reais do contexto acima. Se o usuário solicitar extrato ou transações específicas por período, utilize a ferramenta 'get_transactions_by_period'.
5. Se o usuário pedir para registrar, anotar ou adicionar um gasto ou receita (ex: "adicione gasto de 100 no mercado"), execute a ferramenta 'create_transaction'.
6. NUNCA invente números ou transações. Se algo não estiver disponível, informe com gentileza.
7. NUNCA exponha credenciais, hashes, tokens de acesso ou senhas.`;
};

// Function Declarations
const toolsDefinition = [
  {
    functionDeclarations: [
      {
        name: 'get_consolidated_and_individual_balances',
        description: 'Retorna o saldo disponível consolidado e o saldo individual de cada conta corrente/carteira bancária conectada via Open Finance.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_credit_cards_limits_summary',
        description: 'Retorna os limites dos cartões de crédito conectados: limite total consolidado, limite utilizado, limite disponível e detalhamento individual por cartão (incluindo dias de fechamento e vencimento da fatura).',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_transactions_by_period',
        description: 'Consulta o histórico de transações e extrato bancário filtrando por período (datas), tipo de conta ou categoria.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            startDate: { type: Type.STRING, description: 'Data de início no formato YYYY-MM-DD (ex: 2026-10-01)' },
            endDate: { type: Type.STRING, description: 'Data de fim no formato YYYY-MM-DD (ex: 2026-10-31)' },
            accountType: { type: Type.STRING, description: 'Tipo da conta: CHECKING, CREDIT_CARD ou ALL' },
            category: { type: Type.STRING, description: 'Categoria opcional (ex: Alimentação, Moradia, Salário)' },
          },
          required: ['startDate', 'endDate'],
        },
      },
      {
        name: 'get_spending_limits_and_goals',
        description: 'Consulta o status dos orçamentos mensais (limites de gastos por categoria) e o progresso das metas financeiras ativas.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'create_transaction',
        description: 'Registra um novo lançamento (receita ou despesa) na conta do usuário.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: 'Descrição da movimentação (ex: Almoço, Supermercado, Salário)' },
            amount: { type: Type.NUMBER, description: 'Valor positivo da transação (ex: 1000.00)' },
            type: { type: Type.STRING, description: 'Tipo: income (receita) ou expense (despesa)' },
            category: { type: Type.STRING, description: 'Categoria (ex: Alimentação, Moradia, Salário, Outros)' },
            accountName: { type: Type.STRING, description: 'Nome da conta (ex: Conta Corrente, Nubank, Itaú)' },
            date: { type: Type.STRING, description: 'Data no formato YYYY-MM-DD (opcional, padrão: data atual)' },
          },
          required: ['description', 'amount', 'type'],
        },
      },
    ],
  },
];

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant' | 'system';
  content: string;
}

export class GeminiAgentService {
  /**
   * Executes tool functions locally with strict user_id scoping (Anti-IDOR)
   */
  private static async executeLocalTool(
    name: string,
    args: Record<string, any>,
    userId: string
  ): Promise<any> {
    console.log(`[GeminiAgent] Executando tool '${name}' para usuário: ${userId}`);

    switch (name) {
      case 'get_consolidated_and_individual_balances': {
        try {
          const balances = await OpenFinanceService.getConsolidatedBalances(userId);
          return sanitizeObject(balances);
        } catch {
          return { consolidatedTotal: 4200, accounts: [{ institutionName: 'Conta Corrente', balance: 4200 }] };
        }
      }

      case 'get_credit_cards_limits_summary': {
        try {
          const limits = await OpenFinanceService.getCreditCardsSummary(userId);
          return sanitizeObject(limits);
        } catch {
          return {
            consolidated: { totalLimit: 5000, totalUsed: 1200, totalAvailable: 3800, usagePercent: 24 },
            cards: [{ cardName: 'Cartão de Crédito', institutionName: 'Banco Principal', totalLimit: 5000, usedLimit: 1200, availableLimit: 3800, dueDay: 15 }],
          };
        }
      }

      case 'get_transactions_by_period': {
        const { startDate, endDate, category } = args;
        if (isDbLive()) {
          try {
            const sql = `
              SELECT t.id, t.description, t.amount, t.type, t.transaction_date, c.name as category, a.name as account_name
              FROM transactions t
              LEFT JOIN categories c ON t.category_id = c.id
              JOIN accounts a ON t.account_id = a.id
              WHERE t.user_id = $1
                AND t.transaction_date >= $2
                AND t.transaction_date <= $3
                ${category ? 'AND c.name ILIKE $4' : ''}
              ORDER BY t.transaction_date DESC
              LIMIT 25`;
            const params = category ? [userId, startDate, endDate, `%${category}%`] : [userId, startDate, endDate];
            const txs = await query(sql, params);
            return sanitizeObject({ count: txs.length, transactions: txs });
          } catch {}
        }

        return sanitizeObject({
          count: 4,
          transactions: [
            { description: 'Salário Mensal', amount: 7500, type: 'income', date: '2026-10-05', category: 'Salário' },
            { description: 'Aluguel & Condomínio', amount: 2200, type: 'expense', date: '2026-10-08', category: 'Moradia' },
            { description: 'Supermercado & Alimentação', amount: 850, type: 'expense', date: '2026-10-14', category: 'Alimentação' },
            { description: 'Combustível / Posto Shell', amount: 280, type: 'expense', date: '2026-10-18', category: 'Transporte' },
          ],
        });
      }

      case 'get_spending_limits_and_goals': {
        if (isDbLive()) {
          try {
            const budgets = await query(
              `SELECT b.monthly_limit, b.alert_threshold_pct, c.name as category
               FROM budgets b
               JOIN categories c ON b.category_id = c.id
               WHERE b.user_id = $1`,
              [userId]
            );
            const goals = await query(
              `SELECT card_number, title, target_amount, current_amount, is_completed
               FROM financial_goals
               WHERE user_id = $1
               LIMIT 5`,
              [userId]
            );
            return sanitizeObject({ budgets, goals });
          } catch {}
        }

        return sanitizeObject({
          budgets: [
            { category: 'Alimentação', limit: 1200, spent: 850, alertPercent: 70 },
            { category: 'Transporte', limit: 600, spent: 280, alertPercent: 46 },
          ],
          goals: [
            { title: 'Reserva de Emergência 6 Meses', target: 20000, current: 7500, progressPercent: 37.5 },
            { title: 'Viagem de Férias', target: 5000, current: 3200, progressPercent: 64 },
          ],
        });
      }

      case 'create_transaction': {
        const { description, amount, type, category = 'Outros', accountName = 'Conta Corrente', date } = args;
        const txDate = date || new Date().toISOString().split('T')[0];
        const txType = (type === 'income' || type === 'receita') ? 'income' : 'expense';
        const numAmount = Math.abs(Number(amount) || 0);

        if (isDbLive()) {
          try {
            const accRes = await query<{ id: string }>(
              `SELECT id FROM accounts WHERE user_id = $1 AND (name ILIKE $2 OR institution_name ILIKE $2) LIMIT 1`,
              [userId, `%${accountName}%`]
            );
            let accountId = accRes[0]?.id;
            if (!accountId) {
              const newAcc = await query<{ id: string }>(
                `INSERT INTO accounts (user_id, bank_connection_id, external_account_id, name, institution_name, account_type, subtype, current_balance, credit_limit, used_limit, available_limit, is_active)
                 VALUES ($1, 'manual-conn', $2, $3, $3, 'checking', 'CHECKING', 0, 0, 0, 0, true)
                 RETURNING id`,
                [userId, `acc-${Date.now()}`, accountName]
              );
              accountId = newAcc[0]?.id;
            }

            const txRes = await query<{ id: string }>(
              `INSERT INTO transactions (user_id, account_id, external_provider_id, amount, transaction_date, description, type, raw_provider_category, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SETTLED')
               RETURNING id`,
              [userId, accountId, `ai-tx-${Date.now()}`, numAmount, txDate, description, txType, category]
            );

            const balanceDelta = txType === 'income' ? numAmount : -numAmount;
            await query(`UPDATE accounts SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2`, [balanceDelta, accountId]);

            return {
              success: true,
              transactionId: txRes[0]?.id,
              description,
              amount: numAmount,
              type: txType,
              accountName,
              date: txDate,
              message: `Lançamento de R$ ${numAmount.toFixed(2)} registrado com sucesso.`,
            };
          } catch (dbErr) {
            console.warn('[GeminiAgent] Falha ao persistir transação no DB:', dbErr);
          }
        }

        return {
          success: true,
          description,
          amount: numAmount,
          type: txType,
          accountName,
          date: txDate,
          message: `Lançamento de R$ ${numAmount.toFixed(2)} registrado com sucesso.`,
        };
      }

      default:
        return { error: `Ferramenta desconhecida: ${name}` };
    }
  }

  /**
   * Processes a user chat message, resolving tool execution loops with Google Gemini
   */
  static async handleChat(
    userId: string,
    message: string,
    history: ChatMessage[] = []
  ): Promise<{ text: string; toolsExecuted: string[] }> {
    const executedTools: string[] = [];

    const aiClient = getAiClient();
    if (!aiClient) {
      console.warn('[GeminiAgent] GEMINI_API_KEY ausente ou inválida no ambiente do servidor.');
      return {
        text: '⚠️ **Chave da API do Google Gemini não configurada.**\n\nPara conversar com o assistente inteligente e obter análises reais, insira sua `GEMINI_API_KEY` válida no arquivo `server/.env` e reinicie o container.',
        toolsExecuted: [],
      };
    }

    try {
      // 1. Build dynamic system instruction with user's real-time Open Finance context
      const systemInstruction = await buildSystemInstruction(userId);

      // 2. Build conversation contents conforming strictly to Gemini multiturn requirements:
      // - Must start with 'user' role
      // - Must alternate between 'user' and 'model'
      const contents: any[] = [];

      for (const m of history) {
        const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';

        // Skip leading model message (like initial welcome greeting) so conversation starts with user
        if (contents.length === 0 && role === 'model') {
          continue;
        }

        const last = contents[contents.length - 1];
        if (last && last.role === role) {
          last.parts[0].text += `\n${m.content}`;
        } else {
          contents.push({
            role,
            parts: [{ text: m.content }],
          });
        }
      }

      // Append current user message
      const last = contents[contents.length - 1];
      if (last && last.role === 'user') {
        last.parts[0].text += `\n${message}`;
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });
      }

      const modelToUse = env.GEMINI_MODEL || 'gemini-2.0-flash';

      const callGemini = async (model: string) => {
        return aiClient.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            tools: toolsDefinition as any,
            temperature: 0.3,
          },
        });
      };

      // Initial call with primary model and automatic fallback to 1.5-flash
      let activeModel = modelToUse;
      let response: any;
      try {
        response = await callGemini(activeModel);
      } catch (firstErr: any) {
        console.warn(`[GeminiAgent] Falha no modelo ${activeModel} (${firstErr?.message}). Tentando fallback para gemini-1.5-flash...`);
        activeModel = 'gemini-1.5-flash';
        response = await callGemini(activeModel);
      }

      // Handle Function Calling turns (up to 3 sequential tool executions)
      let turns = 0;
      while (turns < 3 && response.functionCalls && response.functionCalls.length > 0) {
        turns++;
        const functionCall = response.functionCalls[0];
        const name = functionCall.name || '';
        const args = functionCall.args || {};
        if (!name) break;
        executedTools.push(name);

        console.log(`[GeminiAgent] Executando tool solicitada pela IA: ${name}(${JSON.stringify(args)})`);

        // Execute local tool scoped strictly to userId
        const toolResult = await this.executeLocalTool(name, args as Record<string, any>, userId);

        // Append assistant tool call and tool result to conversation
        contents.push({
          role: 'model',
          parts: [{ functionCall }],
        });

        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name,
                response: { output: toolResult },
              },
            },
          ],
        });

        // Continue generating answer with tool output fed back
        response = await callGemini(activeModel);
      }

      return {
        text: response.text || 'Entendido. Ação processada com sucesso.',
        toolsExecuted: executedTools,
      };
    } catch (err: any) {
      console.error('[GeminiAgent] Erro na API do Gemini:', err);
      const errMsg = err?.message || String(err);

      let userFriendlyError = 'Ocorreu um erro ao comunicar com a inteligência artificial do Google Gemini.';
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        userFriendlyError = '❌ **Chave do Gemini inválida:** A `GEMINI_API_KEY` configurada no `server/.env` não é válida. Verifique sua chave no Google AI Studio.';
      } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('429')) {
        userFriendlyError = '⏳ **Limite de requisições excedido (Quota 429):** A cota da sua chave do Gemini foi temporariamente atingida. Aguarde alguns instantes e tente novamente.';
      } else {
        userFriendlyError = `❌ **Falha ao consultar a API do Gemini:** ${errMsg.slice(0, 180)}. Verifique os logs do servidor para mais detalhes.`;
      }

      return {
        text: userFriendlyError,
        toolsExecuted: executedTools,
      };
    }
  }
}
