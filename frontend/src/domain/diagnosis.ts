export interface BudgetSummary {
  total: number;
  onTrack: number;
  overBudget: number;
}

export interface DiagnosisInput {
  monthNet: number;
  monthIncome: number;
  projectedMonthNet: number;
  remainingDays: number;
  budgetSummary?: BudgetSummary;
}

export interface DiagnosisInsight {
  text: string;
  tone: 'positive' | 'neutral' | 'caution';
}

/**
 * Generates 1-3 calm, non-judgmental insights about the user's financial month.
 *
 * Priority:
 * 1. Savings rate (if income > 0)
 * 2. Budget health (if budgets exist)
 * 3. Month direction (projection vs current)
 */
export function generateDiagnosis(input: DiagnosisInput): DiagnosisInsight[] {
  const { monthNet, monthIncome, projectedMonthNet, remainingDays, budgetSummary } = input;
  const insights: DiagnosisInsight[] = [];

  // 1. Savings rate
  if (monthIncome > 0) {
    const savingsRate = Math.round((monthNet / monthIncome) * 100);
    if (savingsRate >= 20) {
      insights.push({
        text: `Você está guardando ${savingsRate}% da receita este mês.`,
        tone: 'positive',
      });
    } else if (savingsRate >= 0) {
      insights.push({
        text: `Você está guardando ${savingsRate}% da receita este mês.`,
        tone: 'neutral',
      });
    } else {
      insights.push({
        text: `Suas despesas superaram a receita em ${Math.abs(savingsRate)}% este mês.`,
        tone: 'caution',
      });
    }
  }

  // 2. Budget health
  if (budgetSummary && budgetSummary.total > 0) {
    if (budgetSummary.overBudget === 0) {
      insights.push({
        text: `Todos os ${budgetSummary.total} orçamentos estão dentro do limite.`,
        tone: 'positive',
      });
    } else {
      insights.push({
        text: `${budgetSummary.overBudget} de ${budgetSummary.total} orçamentos ultrapassaram o limite.`,
        tone: 'caution',
      });
    }
  }

  // 3. Month direction (only if there are remaining days to project)
  if (remainingDays > 0) {
    if (projectedMonthNet < 0 && monthNet >= 0) {
      // Most severe: currently positive but projection flips negative
      insights.push({
        text: 'O resultado projetado está negativo — avalie se há gastos ajustáveis.',
        tone: 'caution',
      });
    } else if (projectedMonthNet < monthNet && monthNet > 0) {
      insights.push({
        text: 'A tendência de gastos variáveis pode reduzir o saldo até o fim do mês.',
        tone: 'caution',
      });
    } else if (projectedMonthNet > monthNet && projectedMonthNet >= 0) {
      insights.push({
        text: 'Seu ritmo indica que o resultado vai melhorar até o fim do mês.',
        tone: 'positive',
      });
    }
  }

  return insights;
}
