export interface ProjectMonthNetInput {
  currentNet: number;
  lastNDaysNet: number;
  remainingDays: number;
  windowDays: number;
}

export interface ProjectionResult {
  value: number;
  explanation: string;
}

/**
 * Projects the month-end net based on the average daily net over a recent window.
 *
 * Formula:
 *   avgDailyNet = lastNDaysNet / windowDays
 *   projectedNet = currentNet + avgDailyNet * remainingDays
 *
 * If remainingDays is 0, returns currentNet (month already ended).
 * If windowDays is 0, returns currentNet (no data to project from).
 */
export function projectMonthNet(input: ProjectMonthNetInput): ProjectionResult {
  const { currentNet, lastNDaysNet, remainingDays, windowDays } = input;

  if (remainingDays <= 0 || windowDays <= 0) {
    return {
      value: currentNet,
      explanation: remainingDays <= 0
        ? 'Mês encerrado — resultado final.'
        : 'Sem dados suficientes para projeção.',
    };
  }

  const avgDailyNet = lastNDaysNet / windowDays;
  const projected = currentNet + avgDailyNet * remainingDays;

  return {
    value: Math.round(projected * 100) / 100,
    explanation: `Baseado na média dos últimos ${windowDays} dias.`,
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
