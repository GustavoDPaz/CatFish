# 📘 CatFish - Documentação Técnica & Arquitetura do Sistema
> **Single Source of Truth (SSOT)**  
> **Versão:** 1.0.0 | **Data de Revisão:** Outubro de 2026  
> **Status:** Ativo / Produção e Desenvolvimento

---

## 1. Visão Geral e Propósito

### 1.1. O que é o CatFish
O **CatFish** é uma plataforma full-stack de **Gestão Financeira Pessoal** que funde ferramentas bancárias de alta precisão técnica com mecânicas avançadas de gamificação (inspiradas no universo Hunter x Hunter). 

O sistema resolve o problema da dispersão de dados financeiros, descontrole de limites de cartão, falta de previsibilidade de fluxo de caixa e amortização ineficiente de dívidas caras.

### 1.2. Principais Funcionalidades
1. **Open Finance Brasil Dinâmico (Pluggy API):** Agregação bancária de contas correntes, poupanças e faturas de cartão de crédito de qualquer instituição regulamentada pelo Banco Central do Brasil.
2. **Importador Universal de Extratos OFX:** Processamento local de arquivos `.ofx` (SGML e XML) de todos os grandes bancos nacionais, com categorização inteligente automática via heurística de palavras-chave.
3. **Copiloto Financeiro Inteligente (Gemini AI Agent):** Assistente contextual em linguagem natural integrado ao SDK oficial `@google/genai` (modelos Gemini 2.x), com suporte a *Function Calling* autônomo para leitura de saldos, consulta de faturas, verificação de orçamentos e registro de lançamentos.
4. **Gerenciador de Dívidas & APR (Hakoware / Potclean):** Cálculo de juros efetivos, parcelamentos acumulados, capacidade de endividamento mensal e simulações de amortização acelerada.
5. **Radar de Fluxo de Caixa (En Radar):** Projeção preditiva de entradas, saídas fixas, taxa de queima (*burn rate*) e dias de liquidez (*runway*).
6. **Metas Financeiras Gamificadas (Greed Island Cards):** Sistema de conquistas e objetivos estruturados como cartas colecionáveis por raridade (SS, S, A, B), com acompanhamento de progresso percentual e aportes.
7. **Isolamento Multi-tenant & Segurança Bancária:** Criptografia simétrica em repouso AES-256-GCM para tokens de acesso bancários, verificação de integridade HMAC SHA-256 contra *timing attacks* em webhooks e isolamento multiusuário estrito (*Anti-IDOR* e *Row Level Security*).

### 1.3. Stack Tecnológica Completa

| Camada | Tecnologia | Versão | Propósito |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.2.8` | Biblioteca reativa para construção da interface SPA |
| **Frontend Runtime** | TypeScript | `~6.0.2` | Tipagem estática estrita em componentes e modelos |
| **Frontend Build Tool** | Vite | `^8.3.0` | Dev server ultra-rápido e bundler de produção |
| **UI Icons** | Lucide React | `^1.51.0` | Ícones vetoriais consistentes em todo o sistema |
| **Efeitos Visuais** | Canvas Confetti | `^1.9.4` | Feedback comemorativo de metas atingidas |
| **Áudio & SFX** | Web Audio API | Nativa | Síntese procedural de efeitos sonoros em tempo real |
| **Estilização** | CSS Vanilla | CSS3 Tokens | Design System responsivo com variáveis para Light/Dark Mode |
| **Backend Framework** | Fastify | `^5.2.1` | Servidor HTTP de alto desempenho e baixo overhead |
| **Backend Runtime** | Node.js + tsx | `>=20.0.0` | Execução TypeScript sem build prévio em desenvolvimento |
| **Inteligência Artificial**| Google GenAI SDK| `^2.30.0` | SDK oficial do Google Gemini com Function Calling |
| **Banco de Dados** | PostgreSQL | `16-alpine` | Banco relacional ACID com suporte a UUIDs e pgcrypto |
| **DB Driver / Pool** | `pg` (node-postgres)| `^8.13.3` | Pool de conexões otimizado com queries parametrizadas |
| **Validação de Schemas**| Zod | `^3.24.2` | Validação estrita de variáveis de ambiente e payloads |
| **Agendador (Worker)** | node-cron | `^3.0.3` | Sincronização horária automatizada de dados bancários |
| **Criptografia / AppSec**| Node.js `node:crypto`| Nativo | Criptografia AES-256-GCM e HMAC SHA-256 |
| **Containerização** | Docker & Compose | Multi-stage | Orquestração de containers da aplicação, API e Postgres |
| **Linter / Qualidade** | Oxlint | `^1.81.0` | Linter de altíssima performance para padrão de código |

---

## 2. Arquitetura e Estrutura de Diretórios

### 2.1. Padrão Arquitetural
O sistema adota uma arquitetura em **duas camadas desacopladas (SPA Frontend + REST Backend)**, projetada com o padrão **Graceful Degradation / Resilience First**:
- **Frontend SPA:** Baseado em arquitetura orientada a componentes com gerenciamento de estado isolado por usuário (`_usr_<id>`) no `localStorage`. Opera de maneira autônoma com fallbacks locais quando o backend estiver inacessível.
- **Backend Modular em Camadas:** O servidor Fastify é estruturado em `Routes -> Services -> Security/Database`, mantendo separação rígida entre protocolo HTTP, regras de negócio e acesso a dados.
- **Armazenamento Híbrido Resiliente:** O backend detecta automaticamente se o PostgreSQL está acessível. Se estiver ativo, executa queries com isolamento de usuário; caso contrário, ativa dinamicamente uma réplica em memória (`MemoryStore`), garantindo que o sistema nunca caia por indisponibilidade momentânea do banco.

```mermaid
graph TD
    subgraph Client ["Frontend (React 19 + Vite - Porta 5173)"]
        UI[Views & Modais]
        State[Local State / localStorage Multi-tenant]
        ApiClient[src/services/api.ts]
        OfxEngine[src/utils/ofxParser.ts]
    end

    subgraph Server ["Backend (Fastify 5 - Porta 3001)"]
        FastifyEntry[server/src/index.ts]
        Security[AppSec: AES-256-GCM / HMAC / Sanitizer]
        AiService[GeminiAgentService]
        OFService[OpenFinanceService]
        Worker[SyncWorker - Cron 30m]
    end

    subgraph DataLayer ["Camada de Persistência"]
        Pg[(PostgreSQL 16 com RLS)]
        Mem[(In-Memory Fallback Store)]
    end

    subgraph External ["Serviços Externos"]
        Pluggy[Pluggy Open Finance API]
        GoogleAI[Google Gemini 2.x API]
    end

    UI --> State
    UI --> ApiClient
    UI --> OfxEngine
    ApiClient -->|HTTP REST / CORS| FastifyEntry
    FastifyEntry --> Security
    FastifyEntry --> AiService
    FastifyEntry --> OFService
    Worker --> OFService
    OFService -->|Decrypted Token| Pluggy
    AiService -->|Function Calling| GoogleAI
    AiService -->|Contexto Real| OFService
    OFService --> Pg
    OFService -.->|Fallback se DB off| Mem
```

### 2.2. Árvore de Diretórios Comentada

```text
CatFish/
├── .agents/                        # Configurações de agentes de IA locais e skills
│   └── skills/ui-ux-pro-max/       # Base de conhecimento de padrões de design
├── docs/                           # Documentação técnica do repositório
│   └── PROJECT_CONTEXT.md          # [ESTE ARQUIVO] Fonte Única da Verdade do sistema
├── public/                         # Assets estáticos servidos diretamente pelo Vite
├── scripts/                        # Scripts utilitários de desenvolvimento e automação
│   ├── install-git-hooks.ps1       # Script PowerShell para instalar hooks de pre-commit
│   └── install-git-hooks.sh        # Script Bash para instalar hooks no Linux/macOS
├── server/                         # Código-fonte completo do Servidor Backend Fastify
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts              # Validação de variáveis de ambiente com Zod
│   │   ├── routes/
│   │   │   ├── aiRoutes.ts         # Endpoints do assistente (/api/ai/chat)
│   │   │   ├── openFinanceRoutes.ts# Endpoints bancários (/api/open-finance/*)
│   │   │   └── webhookRoutes.ts    # Webhooks da Pluggy com HMAC (/api/webhooks)
│   │   ├── security/
│   │   │   ├── crypto.ts           # Criptografia simétrica AES-256-GCM em repouso
│   │   │   ├── hmac.ts             # Validação timingSafeEqual para assinaturas de webhook
│   │   │   └── sanitizer.ts        # Sanitizador de prompt e mascaramento Zero Leakage
│   │   ├── services/
│   │   │   ├── geminiAgent.ts      # Motor do agente Gemini AI com Function Calling
│   │   │   ├── openFinance.ts      # Serviço central de agregação bancária e sincronização
│   │   │   └── syncWorker.ts       # Cron worker para sincronização periódica a cada 30m
│   │   ├── db.ts                   # Pool PostgreSQL (pg) com auto-migração e fallback
│   │   └── index.ts                # Ponto de entrada do backend Fastify e middlewares
│   ├── .env.example                # Modelo de variáveis de ambiente do backend
│   ├── Dockerfile                  # Build do container do backend Node.js
│   ├── package.json                # Dependências do backend
│   └── tsconfig.json               # Configuração TypeScript do servidor
├── src/                            # Código-fonte completo da Aplicação Frontend React
│   ├── assets/                     # SVGs, ícones e mídias estáticas
│   ├── components/                 # Componentes de interface e views da aplicação
│   │   ├── AiAssistantDrawer.tsx   # Gaveta lateral de chat com o Gemini Agent
│   │   ├── AprManagerView.tsx      # Visão de Dívidas, Cartões e Amortização (APR)
│   │   ├── AuthView.tsx            # Autenticação, login e cadastro de múltiplos usuários
│   │   ├── BalanceBreakdownPopover.tsx # Popover de detalhamento multi-banco do cabeçalho
│   │   ├── DashboardView.tsx       # Painel principal consolidado com cards e resumos
│   │   ├── EnRadarView.tsx         # Visão de Projeção de Fluxo de Caixa (En Radar)
│   │   ├── GreedIslandView.tsx     # Visão de Metas e Conquistas (Greed Island Cards)
│   │   ├── Header.tsx              # Barra de navegação superior, saldo e controles
│   │   ├── HunterLicenseModal.tsx  # Modal de perfil financeiro, dados e contas ativas
│   │   ├── OfxImportModal.tsx      # Modal de importação de extratos bancários .ofx
│   │   ├── OpenFinanceModal.tsx    # Modal de conexões Open Finance (Pluggy Connect)
│   │   ├── Sidebar.tsx             # Menu lateral colapsável com navegação
│   │   ├── TransactionsView.tsx    # Listagem, filtro e criação de transações financeiras
│   │   └── ZetsuAlertModal.tsx     # Modal de alerta crítico de endividamento excessivo
│   ├── services/
│   │   └── api.ts                  # Cliente HTTP frontend para consumo do backend
│   ├── types/
│   │   └── index.ts                # Interfaces de domínio globais (Transactions, Debts, OF)
│   ├── utils/
│   │   ├── audio.ts                # Gerenciador de efeitos sonoros Web Audio API
│   │   ├── installments.ts         # Cálculo de parcelas e amortização de dívidas
│   │   ├── ofxParser.ts            # Parser SGML/XML de extratos OFX de bancos brasileiros
│   │   └── storage.ts              # Camada de persistência local multiusuário isolada
│   ├── App.css                     # Estilos centralizados e variáveis CSS do tema
│   ├── App.tsx                     # Orquestrador central da aplicação React
│   ├── index.css                   # Resets globais e regras de tipografia
│   └── main.tsx                    # Bootstrap do React 19 no DOM
├── .env.example                    # Modelo completo de variáveis na raiz
├── .gitignore                      # Regras de exclusão do controle de versão
├── .oxlintrc.json                  # Regras de configuração do Oxlint
├── docker-compose.yml              # Orquestração do catfish-app, catfish-api e postgres
├── Dockerfile                      # Build de produção do frontend servido via Node
├── init-db.sql                     # Script DDL completo com RLS e tabelas do PostgreSQL
├── package.json                    # Dependências do frontend e scripts globais
├── tsconfig.json                   # Configuração base do TypeScript
└── vite.config.ts                  # Configuração do Vite dev server e preview
```

---

## 3. Módulos Core e Fluxo de Dados

### 3.1. Componentes e Serviços Centrais

#### 1. `OpenFinanceService` ([server/src/services/openFinance.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/services/openFinance.ts))
Responsável por toda a intermediação bancária. Gera tokens de conexão efêmeros com a Pluggy, armazena conexões ativas criptografadas em repouso com AES-256-GCM, busca contas e saldos consolidados e processa a sincronização de faturas de cartão de crédito. Se o banco de dados PostgreSQL estiver indisponível, mantém o estado em `memoryStore`.

#### 2. `GeminiAgentService` ([server/src/services/geminiAgent.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/services/geminiAgent.ts))
Implementa um agente financeiro autônomo baseado no SDK `@google/genai`. Injeta dinamicamente os saldos reais e faturas do usuário no *System Instruction*, formata o histórico de mensagens conforme as exigências da API do Google e executa um loop de até 3 turnos de *Function Calling* local:
- `get_consolidated_and_individual_balances`: Saldos de contas correntes e carteiras.
- `get_credit_cards_limits_summary`: Limites totais, faturas atuais e vencimentos.
- `get_transactions_by_period`: Extrato detalhado por período em dias.
- `get_budgets_and_goals_summary`: Tetos orçamentários e progresso de metas.
- `create_transaction`: Registro imediato de receitas ou despesas com persistência direta.

#### 3. `OfxParser` ([src/utils/ofxParser.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/src/utils/ofxParser.ts))
Módulo cliente de parsing de extratos bancários nacionais sem dependência de bibliotecas pesadas. Trata tanto o formato SGML legado quanto XML moderno, extrai metadados do banco (`<BANKID>`, `<ACCTID>`), detecta o saldo da conta (`<LEDGERBAL>`) e categoriza lançamentos automaticamente através de dicionários de correspondência de termos comuns (PIX, supermercados, postos, farmácias, etc.).

#### 4. `Storage Multi-Tenant` ([src/utils/storage.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/src/utils/storage.ts))
Gerencia o armazenamento no `localStorage` indexado pelo ID do usuário ativo (`_usr_<id>`). Garante que múltiplos usuários no mesmo navegador tenham transações, dívidas, orçamentos e cartões completamente isolados uns dos outros.

---

### 3.2. Fluxo de uma Requisição Ponta a Ponta

#### Exemplo: Envio de mensagem para a IA ("Quanto tenho disponível no Itaú e adicione 50 reais de lanche?")

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário
    participant Drawer as AiAssistantDrawer (React)
    participant Api as src/services/api.ts
    participant Router as Fastify (/api/ai/chat)
    participant Sanitizer as sanitizer.ts
    participant Agent as GeminiAgentService
    participant OF as OpenFinanceService
    participant Pg as PostgreSQL (ou MemoryStore)
    participant Gemini as Google Gemini 2.x API

    User->>Drawer: Digita a mensagem e clica em enviar
    Drawer->>Api: sendChatMessage(message, history)
    Api->>Router: POST /api/ai/chat { message, history }
    Note over Router: Rate limit check (20 req/min)
    Router->>Sanitizer: sanitizePromptInput(message, 800)
    Sanitizer-->>Router: Mensagem limpa (sem caracteres de controle)
    Router->>Agent: handleChat(userId, cleanMessage, history)
    Agent->>OF: getConsolidatedBalances(userId) & getCreditCardsSummary(userId)
    OF->>Pg: SELECT dados financeiros reais
    Pg-->>OF: Retorna saldos reais
    OF-->>Agent: Contexto financeiro atualizado
    Agent->>Agent: Constrói System Instruction com dados reais
    Agent->>Gemini: models.generateContent(contents + toolsDefinition)
    Gemini-->>Agent: FunctionCall: create_transaction({ amount: 50, category: 'Alimentação' })
    Agent->>Agent: executeLocalTool('create_transaction', args, userId)
    Agent->>Pg: INSERT INTO transactions ...
    Agent->>Gemini: Retorna functionResponse com o resultado da tool
    Gemini-->>Agent: Resposta final em linguagem natural
    Agent-->>Router: { reply, toolsExecuted }
    Router-->>Api: HTTP 200 { reply, toolsExecuted, timestamp }
    Api-->>Drawer: Exibe bolha de resposta formatada em Markdown
```

---

## 4. Modelo de Dados e Estado

### 4.1. Esquema do Banco de Dados (PostgreSQL)
O schema oficial reside em [init-db.sql](file:///c:/Users/dapaz/Documents/GitHub/CatFish/init-db.sql) e possui migrações automáticas de inicialização em [server/src/db.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/db.ts).

```mermaid
erDiagram
    users ||--o{ user_sessions : "possui"
    users ||--o{ bank_connections : "conecta"
    users ||--o{ accounts : "possui"
    users ||--o{ categories : "define"
    users ||--o{ transactions : "registra"
    users ||--o{ debts : "possui"
    users ||--o{ budgets : "estabelece"
    users ||--o{ financial_goals : "persegue"
    
    bank_connections ||--o{ accounts : "sincroniza"
    accounts ||--o{ transactions : "origina"
    categories ||--o{ transactions : "classifica"
    categories ||--o{ budgets : "limita"
    debts ||--o{ debt_installments : "divide-se"
    accounts ||--o{ debts : "vincula-se"

    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar financial_title
        timestamptz created_at
    }

    bank_connections {
        uuid id PK
        varchar user_id FK
        varchar provider
        varchar item_id UK
        varchar institution_id
        varchar institution_name
        varchar status
        text encrypted_access_token
        timestamptz last_synced_at
    }

    accounts {
        uuid id PK
        varchar user_id FK
        uuid bank_connection_id FK
        varchar external_account_id
        varchar name
        varchar institution_name
        enum account_type
        numeric current_balance
        numeric credit_limit
        numeric used_limit
        numeric available_limit
        int closing_day
        int due_day
    }

    transactions {
        uuid id PK
        uuid user_id FK
        uuid account_id FK
        uuid category_id FK
        enum type
        numeric amount
        date transaction_date
        varchar description
        varchar external_provider_id UK
    }

    debts {
        uuid id PK
        uuid user_id FK
        uuid account_id FK
        varchar title
        enum category
        numeric principal_amount
        numeric paid_amount
        int installments_count
        numeric monthly_installment_value
        date start_date
        enum status
    }

    debt_installments {
        uuid id PK
        uuid debt_id FK
        int installment_number
        date due_date
        numeric amount
        boolean is_paid
    }

    budgets {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        numeric monthly_limit
        int alert_threshold_pct
    }

    financial_goals {
        uuid id PK
        uuid user_id FK
        varchar card_number
        varchar title
        varchar rank_badge
        numeric target_amount
        numeric current_amount
        boolean is_completed
    }
```

### 4.2. Tabelas Principais e Restrições
- **`bank_connections`**: Armazena as conexões bancárias da Pluggy. O token de acesso fica no campo `encrypted_access_token` (criptografado em repouso com AES-256-GCM). Possui constraint única `(user_id, provider, item_id)`.
- **`accounts`**: Contas correntes, carteiras e cartões de crédito. Armazena limites e saldo consolidado.
- **`transactions`**: Lançamentos contábeis com suporte a idempotência Open Finance através de `external_provider_id` com índice único parcial.
- **`debts` & `debt_installments`**: Dívidas cadastradas e acompanhamento individual de cada parcela amortizada.
- **`budgets`**: Tetos de gastos mensais vinculados a uma categoria específica.
- **`financial_goals`**: Metas no formato "Cartas de Greed Island", com tracking de valores alvo e badges de ranqueamento.

---

## 5. Padrões de Código e Convenções de Segurança

### 5.1. Tratamento Global de Erros (Zero Information Leakage)
O backend implementa um handler de erros centralizado no Fastify ([server/src/index.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/index.ts#L64-L73)):
- **Zero Stack Trace Leakage:** Nenhuma mensagem de erro com stack trace interno ou detalhes de banco vaza para o cliente. Erros `500` retornam mensagens opacas e amigáveis:
  ```json
  {
    "statusCode": 500,
    "error": "Internal Server Error",
    "message": "Ocorreu um erro interno no servidor."
  }
  ```
- O erro original completo é registrado estritamente nos logs do servidor através do logger seguro do Fastify.

### 5.2. AppSec e Padrões de Segurança
1. **Criptografia Simétrica em Repouso (AES-256-GCM):**
   - Implementada em [server/src/security/crypto.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/security/crypto.ts).
   - Derivação de chave de 256 bits através de `crypto.hkdfSync` com SHA-256 a partir da variável `APP_MASTER_ENCRYPTION_KEY`.
   - Formato do payload armazenado: `IV_HEX:TAG_HEX:CIPHERTEXT_HEX`. A tag de 128 bits garante detecção imediata de violação ou alteração maliciosa de dados.
2. **Prevenção contra Timing Attacks em Webhooks:**
   - Em [server/src/security/hmac.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/security/hmac.ts), a validação da assinatura de webhooks utiliza `crypto.timingSafeEqual` para impedir que invasores descubram o segredo via análise de tempo de resposta.
3. **Prevenção de Injeção de Prompt & Mascaramento (PII):**
   - Em [server/src/security/sanitizer.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/security/sanitizer.ts), as entradas do usuário são filtradas contra caracteres de controle, bytes nulos e truncadas a 800 caracteres antes de atingir a LLM.
   - Funções auxiliares mascaram CPFs (`***.123.***-45`), e-mails (`fe***@domain.com`) e números de conta bancária (`••••1234`).
4. **Proteção Anti-IDOR (Insecure Direct Object References):**
   - Todas as consultas de banco no backend exigem o `user_id` autenticado na cláusula `WHERE` (ex.: `WHERE id = $1 AND user_id = $2`), impedindo que um usuário acesse ou exclua dados de outro.
5. **Headers de Segurança HTTP (Defense-in-Depth):**
   - Injetados automaticamente no hook `onSend` do Fastify:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `X-XSS-Protection: 1; mode=block`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: geolocation=(), camera=(), microphone=()`

---

## 6. Configuração, Ambiente e Execução

### 6.1. Dicionário de Variáveis de Ambiente
Configuradas no arquivo `.env` (baseado no [.env.example](file:///c:/Users/dapaz/Documents/GitHub/CatFish/.env.example)):

| Variável | Obrigatória | Propósito | Exemplo / Padrão |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Sim | Modo de execução da aplicação | `development` ou `production` |
| `PORT` | Não | Porta do servidor Fastify | `3001` |
| `HOST` | Não | Interface de rede para bind | `0.0.0.0` |
| `CORS_ORIGIN` | Sim | Origem permitida para requisições cross-origin | `http://localhost:5173` |
| `VITE_API_URL` | Sim | URL base do backend consumida pelo Vite | `http://localhost:3001` |
| `DATABASE_URL` | Não | String de conexão com o PostgreSQL | `postgres://user:pass@localhost:5432/catfish_db` |
| `APP_MASTER_ENCRYPTION_KEY` | Sim | Chave mestra (mínimo 32 caracteres) para criptografia AES-256-GCM | String aleatória de 32+ caracteres |
| `JWT_SECRET` | Sim | Segredo para assinatura de cookies e tokens de sessão | String aleatória de 32+ caracteres |
| `PLUGGY_CLIENT_ID` | Opcional | ID da aplicação no portal Pluggy para Open Finance | Obtido em `dashboard.pluggy.ai` |
| `PLUGGY_CLIENT_SECRET` | Opcional | Chave secreta da aplicação na Pluggy | Obtido em `dashboard.pluggy.ai` |
| `PLUGGY_WEBHOOK_SECRET` | Opcional | Segredo para validação de assinaturas de webhook Pluggy | Obtido nas configurações de webhook |
| `PLUGGY_BASE_URL` | Não | Endpoint da API da Pluggy | `https://api.pluggy.ai` |
| `GEMINI_API_KEY` | Sim | Chave de API da Google AI para o agente financeiro | Obtida em `aistudio.google.com/app/apikey` |
| `GEMINI_MODEL` | Não | Modelo Gemini prioritário para chat e Function Calling | `gemini-2.0-flash` ou `gemini-2.5-flash` |

---

### 6.2. Comandos Principais de Execução

#### Instalação das Dependências
```bash
# Na raiz do projeto (instala dependências do frontend)
npm install

# Na pasta do backend
cd server && npm install && cd ..
```

#### Execução Local (Desenvolvimento)
Abra dois terminais simultâneos:
```bash
# Terminal 1: Backend Fastify com hot-reload (tsx watch)
cd server
npm run dev

# Terminal 2: Frontend React com Vite HMR
npm run dev
```
Acesse o frontend em: `http://localhost:5173`  
Backend ativo em: `http://localhost:3001`

#### Execução Completa via Docker Compose
```bash
# Sobe o banco PostgreSQL, a API Fastify e o Frontend com apenas um comando
docker compose up --build -d

# Visualizar logs em tempo real
docker compose logs -f catfish-api
```

#### Qualidade de Código & Linter
```bash
# Executar análise estática de código com Oxlint
npm run lint

# Instalar Git Hooks para proteção de segredos no repositório
# No Linux/macOS:
bash scripts/install-git-hooks.sh
# No Windows PowerShell:
.\scripts\install-git-hooks.ps1
```

---

## 7. Guia Rápido de Manutenção ("Onde mexer para...")

### 7.1. Como Criar uma Nova Rota / Endpoint no Backend
1. **Defina a Rota:** Se for relacionada a finanças ou IA, edite o arquivo correspondente em `server/src/routes/` ou crie um novo arquivo de rotas (ex.: `server/src/routes/reportsRoutes.ts`).
2. **Associe a Lógica ao Service:** Escreva os métodos de negócio correspondentes no respectivo arquivo de `server/src/services/` (garanta queries parametrizadas com `$1, $2` e filtro por `userId`).
3. **Registre no Servidor:** Abra [server/src/index.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/index.ts) e registre o plugin Fastify sob o prefixo `/api/...`:
   ```ts
   await app.register(reportsRoutes, { prefix: '/api/reports' });
   ```
4. **Adicione a chamada no Frontend:** Atualize o objeto `api` em [src/services/api.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/src/services/api.ts) com o método tipado correspondente.

### 7.2. Como Criar uma Nova View / Tela no Frontend
1. **Crie o Componente:** Em `src/components/`, crie o arquivo da tela (ex.: `src/components/InvestmentsView.tsx`).
2. **Defina a Navegação:** Em [src/App.tsx](file:///c:/Users/dapaz/Documents/GitHub/CatFish/src/App.tsx), adicione a chave ao estado `activeTab` (ex.: `'dashboard' | 'apr' | 'transactions' | 'investments'`).
3. **Adicione o Botão no Menu:** Em [src/components/Sidebar.tsx](file:///c:/Users/dapaz/Documents/GitHub/CatFish/src/components/Sidebar.tsx), adicione o novo item com ícone do `lucide-react`.
4. **Renderize na Área Central:** No switch case do `App.tsx`, renderize o novo componente quando a tab estiver ativa.

### 7.3. Como Adicionar uma Nova Tool (Function Calling) à IA
1. **Defina a Tool no Schema:** Abra [server/src/services/geminiAgent.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/server/src/services/geminiAgent.ts) e adicione a declaração da função dentro do array `toolsDefinition` com descrição clara para o modelo.
2. **Implemente a Execução:** No método `executeLocalTool`, adicione o `case 'nome_da_tool':` chamando o método de serviço correspondente e retornando o resultado.
3. **Instrua o Modelo:** Atualize o `systemInstruction` em `buildSystemInstruction` orientando o momento adequado em que o modelo deve acionar essa nova ferramenta.

---

### 7.4. Pontos de Atenção & Débitos Técnicos Conhecidos

> [!IMPORTANT]
> **1. Alinhamento de Nomenclatura (Snake Case vs Camel Case):**
> O banco de dados PostgreSQL retorna colunas em *snake_case* (`institution_name`, `item_id`, `last_synced_at`), enquanto o frontend espera tipagens em *camelCase* (`institutionName`, `itemId`, `lastSyncedAt`). Ao criar novas rotas no backend ou consumi-las no `api.ts`, garanta o mapeamento explícito para evitar atributos `undefined` na interface.

> [!WARNING]
> **2. Exclusão de Conexões (UUID vs String Item ID):**
> Na tabela `bank_connections`, a coluna `id` é do tipo `UUID`, enquanto `item_id` da Pluggy é `VARCHAR(100)`. Na cláusula de exclusão SQL, sempre utilize cast explícito (`WHERE (id::text = $1 OR item_id = $1)`) para evitar que identificadores arbitrários causem falha de sintaxe UUID no PostgreSQL.

> [!NOTE]
> **3. Proxy no Ambiente de Desenvolvimento:**
> O arquivo [src/services/api.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/src/services/api.ts) utiliza `VITE_API_URL` para apontar ao backend (`http://localhost:3001`). Em desenvolvimento local com Vite, certifique-se de que a variável esteja definida ou configure o proxy reverso em [vite.config.ts](file:///c:/Users/dapaz/Documents/GitHub/CatFish/vite.config.ts) para evitar chamadas diretas com CORS bloqueado.

> [!CAUTION]
> **4. Política Estrita de Credenciais:**
> Nunca commite arquivos `.env` ou inclua chaves de API reais no código. Utilize os Git Hooks automáticos (`scripts/install-git-hooks.*`) para garantir a sanitização contínua antes de cada commit.
