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
