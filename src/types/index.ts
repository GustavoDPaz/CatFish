export type TransactionType = 'receita' | 'despesa' | 'reserva' | 'ren' | 'ko' | 'ten';
// Backward compatibility alias
export type NenType = TransactionType;

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  account: string;
  date: string;
  recurring?: boolean;
  notes?: string;
}

export type DebtCategory = 'cartao_credito' | 'cartao_rotativo' | 'emprestimo' | 'financiamento' | 'cheque_especial' | 'outro';

export interface Debt {
  id: string;
  title: string;
  principalAmount: number;
  installmentsCount?: number;
  startMonth?: string;
  interestRateMonthly?: number;
  startDate: string;
  category: DebtCategory;
  notes?: string;
  status: 'active' | 'paid_off' | 'defaulted' | 'critical_default' | 'zetsu_bankruptcy';
  paidAmount: number;
}
// Backward compatibility alias
export type HakowareDebt = Debt;

export interface BudgetLimit {
  category: string;
  limit: number;
  icon: string;
}

export type FinancialProfileType = 'Conservador' | 'Moderado' | 'Arrojado' | 'Planejador' | 'Investidor';

export interface UserProfile {
  name: string;
  title: string;
  starLevel?: 1 | 2 | 3;
  accountId: string; // Identificador da Conta CatFish
  maxDebtCapacity: number; // Teto de segurança para dívidas
  financialProfile: FinancialProfileType; // Perfil Financeiro do Usuário
  soundEnabled: boolean;

  // Compatibilidade com dados antigos salvos em cache
  hunterId?: string;
  maxAuraCapacity?: number;
  nenAffinity?: FinancialProfileType;

  // Dados Financeiros & Saldos para Contabilização
  bankName?: string;
  bankBalance: number;
  walletBalance: number;
  emergencyFundBalance: number;
  creditCardLimit: number;
  overdraftLimit?: number;
  monthlyIncome?: number;
}
// Backward compatibility alias
export type HunterProfile = UserProfile;

export interface FinancialGoal {
  id: string;
  cardNo: string; // Código de identificação da meta (ex: '001')
  name: string; // Título da meta
  rank: 'Alta' | 'Média' | 'Normal' | 'SS' | 'S' | 'A' | 'B';
  description: string;
  objective: string;
  unlocked: boolean; // Concluída / Atingida
  rewardText: string;
  imageUrl?: string;
  targetAmount?: number;
  currentAmount?: number;
}
// Backward compatibility alias
export type GreedIslandCard = FinancialGoal;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  createdAt: string;
}
