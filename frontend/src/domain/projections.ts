export interface ProjectMonthNetInput {
  pastNet: number;                    // net from transactions with date <= today
  futureScheduledNet: number;         // net from transactions with date > today (already committed)
  lastNDaysDiscretionaryNet: number;  // total non-recurring net over the last N days
  remainingDays: number;
  windowDays: number;
}

export interface ProjectionResult {
  value: number;
  explanation: string;
}

/**
 * Projects the month-end net using 3 components:
 *
 * 1. pastNet — what already happened (date <= today)
 * 2. futureScheduledNet — what's already committed for the rest of the month
 * 3. discretionary trend — avg daily net from non-recurring past transactions × remaining days
 *
 * Formula:
 *   discretionaryDailyAvg = lastNDaysDiscretionaryNet / windowDays
 *   projected = pastNet + futureScheduledNet + discretionaryDailyAvg * remainingDays
 *
 * If remainingDays <= 0, returns pastNet (month ended, no future).
 * If windowDays <= 0, returns pastNet + futureScheduledNet (no trend data).
 */
export function projectMonthNet(input: ProjectMonthNetInput): ProjectionResult {
  const { pastNet, futureScheduledNet, lastNDaysDiscretionaryNet, remainingDays, windowDays } = input;

  if (remainingDays <= 0) {
    return {
      value: pastNet,
      explanation: 'Mês encerrado — resultado final.',
    };
  }

  if (windowDays <= 0) {
    return {
      value: Math.round((pastNet + futureScheduledNet) * 100) / 100,
      explanation: 'Sem dados suficientes para projetar tendência variável.',
    };
  }

  const discretionaryDailyAvg = lastNDaysDiscretionaryNet / windowDays;
  const projected = pastNet + futureScheduledNet + discretionaryDailyAvg * remainingDays;

  return {
    value: Math.round(projected * 100) / 100,
    explanation: `Realizado + previsto + tendência de gastos variáveis (últimos ${windowDays} dias).`,
  };
}

export interface ProjectYearEndInput {
  projectedMonthNet: number;
  monthsRemaining: number;
  historicalMonthlyNets?: number[];
}

/**
 * Projects year-end cumulative impact (conservative).
 *
 * Strategy (Option B — conservative):
 *   - If historical data exists (≥1 month), compute its average.
 *   - Use the lesser of (historical average) and (projected current month net)
 *     as the conservative monthly rate.
 *   - If no history, fall back to projectedMonthNet alone.
 *   - yearEndImpact = conservativeMonthlyNet * monthsRemaining
 *
 * monthsRemaining should count remaining full months (excluding current).
 */
export function projectYearEndImpact(input: ProjectYearEndInput): ProjectionResult {
  const { projectedMonthNet, monthsRemaining, historicalMonthlyNets } = input;

  if (monthsRemaining <= 0) {
    return {
      value: 0,
      explanation: 'Ano encerrado — sem meses restantes.',
    };
  }

  let conservativeRate = projectedMonthNet;
  let explanation: string;

  if (historicalMonthlyNets && historicalMonthlyNets.length > 0) {
    const historicalAvg =
      historicalMonthlyNets.reduce((sum, v) => sum + v, 0) / historicalMonthlyNets.length;
    conservativeRate = Math.min(projectedMonthNet, historicalAvg);
    explanation = `Estimativa conservadora: menor valor entre a projeção do mês (${fmt(projectedMonthNet)}) e a média dos últimos ${historicalMonthlyNets.length} meses (${fmt(historicalAvg)}).`;
  } else {
    explanation = 'Baseado no ritmo projetado do mês atual (sem histórico anterior).';
  }

  const value = Math.round(conservativeRate * monthsRemaining * 100) / 100;

  return { value, explanation };
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
