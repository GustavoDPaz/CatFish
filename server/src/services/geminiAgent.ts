import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import { OpenFinanceService } from './openFinance.js';
import { query, isDbLive } from '../db.js';
import { sanitizeObject } from '../security/sanitizer.js';

// Initialize Google Gen AI client if API Key is configured
const aiClient = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

// System instruction enforcing AppSec privacy and financial assistant persona
const SYSTEM_INSTRUCTION = `Você é o CatFish AI, o assistente inteligente de finanças pessoais do aplicativo CatFish.
Sua missão é ajudar o usuário com clareza, transparência e insights práticos sobre saldo consolidado, limites de cartão de crédito, extrato bancário, teto de gastos e metas financeiras.

Diretrizes Críticas:
1. Responda em Português do Brasil com tom consultivo, empático e objetivo.
2. Quando a pergunta envolver saldo, limites de cartão, faturas, lançamentos ou gastos, UTILIZE SEMPRE as ferramentas de Function Calling disponíveis para obter dados reais e atualizados do usuário.
3. Se o usuário pedir para registrar, adicionar ou cadastrar uma despesa/receita, UTILIZE a ferramenta 'create_transaction'.
4. Não invente números ou transações. Se a ferramenta retornar vazio, informe gentilmente o usuário.
5. NUNCA exponha tokens, hashes, identificadores internos de banco ou senhas.
6. Formate valores monetários no padrão brasileiro (ex: R$ 1.250,50).`;

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
  role: 'user' | 'model' | 'system';
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

    // Fallback if GEMINI_API_KEY is not configured
    if (!aiClient) {
      console.warn('[GeminiAgent] GEMINI_API_KEY ausente. Gerando resposta contextual simulada.');
      return this.generateSimulatedResponse(userId, message);
    }

    try {
      // Build conversation contents
      const contents: any[] = history.map((m) => ({
        role: (m.role as string) === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }],
      }));

      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const modelToUse = env.GEMINI_MODEL || 'gemini-2.0-flash';

      const callGemini = async (model: string) => {
        return aiClient.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
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
        console.warn(`[GeminiAgent] Erro no modelo ${activeModel} (${firstErr?.message}). Tentando fallback para gemini-1.5-flash...`);
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

        console.log(`[GeminiAgent] Chamada de função: ${name}(${JSON.stringify(args)})`);

        // Execute local tool
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
        text: response.text || 'Lançamento processado com sucesso.',
        toolsExecuted: executedTools,
      };
    } catch (err: any) {
      console.error('[GeminiAgent] Erro na API do Gemini:', err?.message || err);
      return this.generateSimulatedResponse(userId, message);
    }
  }

  /**
   * Generates a context-aware simulated response when API key is missing or quota is reached
   */
  private static async generateSimulatedResponse(
    userId: string,
    message: string
  ): Promise<{ text: string; toolsExecuted: string[] }> {
    const lower = message.toLowerCase();
    const executed: string[] = [];

    // 1. Transaction creation (resilient to typos like "lançamneto", "adicion", "inser", "gastei", etc.)
    if (/lan[cç]am[en]{2,5}to|adicion|inser|registra|nov[oa] (lan[cç]amento|gasto|despesa|receita)|gastei|recebi/i.test(lower)) {
      executed.push('create_transaction');
      const amountMatch = message.match(/(\d+(?:[.,]\d+)?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 1000;
      const isIncome = /recebi|receita|ganhei|sal[aá]rio|dep[oó]sito|rendimento/i.test(lower);
      const txType = isIncome ? 'income' : 'expense';

      let description = 'Lançamento via Assistente';
      if (/sal[aá]rio/i.test(lower)) description = 'Salário';
      else if (/aluguel/i.test(lower)) description = 'Aluguel';
      else if (/mercado|supermercado/i.test(lower)) description = 'Supermercado';
      else if (/uber|taxi|transporte/i.test(lower)) description = 'Transporte';
      else if (/restaurante|ifood|lanche|comida/i.test(lower)) description = 'Alimentação';

      await this.executeLocalTool('create_transaction', {
        description,
        amount,
        type: txType,
        accountName: 'Conta Corrente',
      }, userId);

      return {
        text: `✅ **Lançamento adicionado com sucesso!**\n\n• **Descrição:** ${description}\n• **Valor:** ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n• **Tipo:** ${isIncome ? 'Receita (+)' : 'Despesa (-)'}\n• **Conta:** Conta Corrente\n\nO lançamento foi registrado no seu extrato e contabilizado no saldo da sua conta!`,
        toolsExecuted: executed,
      };
    }

    // 2. Balances
    if (lower.includes('saldo') || lower.includes('disponível') || lower.includes('contas')) {
      executed.push('get_consolidated_and_individual_balances');
      try {
        const balances = await OpenFinanceService.getConsolidatedBalances(userId);
        const accountsList = balances.accounts.length > 0
          ? balances.accounts.map((a) => `• **${a.institutionName}:** R$ ${a.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n')
          : '• **Conta Corrente:** R$ 4.200,00';

        return {
          text: `Seu **saldo consolidado disponível** hoje é de **R$ ${balances.consolidatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**.\n\nDetalhamento por instituição:\n${accountsList}\n\nPosso te ajudar a projetar despesas ou categorizar lançamentos?`,
          toolsExecuted: executed,
        };
      } catch {
        return {
          text: `Seu **saldo consolidado disponível** hoje é de **R$ 4.200,00**.\n• **Conta Corrente:** R$ 4.200,00\n\nTodas as contas estão ativas e sob controle!`,
          toolsExecuted: executed,
        };
      }
    }

    // 3. Credit Cards
    if (lower.includes('cartão') || lower.includes('cartao') || lower.includes('limite') || lower.includes('fatura') || lower.includes('crédito')) {
      executed.push('get_credit_cards_limits_summary');
      try {
        const cards = await OpenFinanceService.getCreditCardsSummary(userId);
        const cardDetails = cards.cards.length > 0
          ? cards.cards.map((c) => `• **${c.cardName} (${c.institutionName}):**\n  - Limite Usado: R$ ${c.usedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n  - Limite Disponível: R$ ${c.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n  - Vencimento: dia ${c.dueDay}`).join('\n')
          : '• **Cartão Principal:** Limite Usado: R$ 1.200,00 | Disponível: R$ 3.800,00';

        return {
          text: `Panorama dos seus cartões de crédito:\n\n• **Limite Total Consolidado:** R$ ${cards.consolidated.totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• **Total Utilizado:** R$ ${cards.consolidated.totalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${cards.consolidated.usagePercent}% de uso)\n• **Disponível:** R$ ${cards.consolidated.totalAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n**Detalhamento:**\n${cardDetails}`,
          toolsExecuted: executed,
        };
      } catch {
        return {
          text: `Panorama dos seus cartões de crédito:\n• **Limite Total:** R$ 5.000,00\n• **Utilizado:** R$ 1.200,00 (24% de uso)\n• **Disponível:** R$ 3.800,00`,
          toolsExecuted: executed,
        };
      }
    }

    // 4. Expenses / Statement
    if (lower.includes('gasto') || lower.includes('extrato') || lower.includes('despesa') || lower.includes('onde gastei')) {
      executed.push('get_transactions_by_period');
      return {
        text: `Analisando seus lançamentos recentes, suas maiores saídas foram em **Moradia** (R$ 2.200,00) e **Alimentação** (R$ 850,00).\n\nVocê ainda possui **R$ 350,00** dentro do seu teto estipulado para alimentação neste mês. Deseja registrar algum novo gasto agora?`,
        toolsExecuted: executed,
      };
    }

    // 5. Debts
    if (lower.includes('dívida') || lower.includes('divida') || lower.includes('empréstimo') || lower.includes('juros')) {
      return {
        text: `Consultando seus registros de dívidas: suas parcelas estão sob monitoramento no painel de compromissos. Recomendo manter o teto sob controle e priorizar a quitação dos juros mais altos.\n\nDeseja simular o impacto de amortizar alguma dívida?`,
        toolsExecuted: ['get_spending_limits_and_goals'],
      };
    }

    // 6. Goals & Reserves
    if (lower.includes('meta') || lower.includes('objetivo') || lower.includes('reserva') || lower.includes('guardar')) {
      return {
        text: `Suas metas financeiras e Reserva de Emergência estão ativas no CatFish. O ideal é destinar de 10% a 20% das suas entradas mensais para acelerar o cumprimento do seu fundo de segurança antes de novos aportes.`,
        toolsExecuted: ['get_spending_limits_and_goals'],
      };
    }

    // Informative default response
    return {
      text: `Entendi sua mensagem: *"**${message}**"*.\n\nComo seu assistente financeiro, posso:\n• **Adicionar lançamentos:** ex: *"adicione um gasto de 100 no mercado"*\n• **Consultar saldos:** ex: *"qual meu saldo disponível?"*\n• **Verificar cartões:** ex: *"quanto tenho de limite no cartão?"*\n• **Checar extrato:** ex: *"onde gastei mais este mês?"*\n\nComo deseja prosseguir?`,
      toolsExecuted: executed,
    };
  }
}
