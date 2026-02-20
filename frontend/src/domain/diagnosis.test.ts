import { describe, it, expect } from 'vitest';
import { generateDiagnosis } from './diagnosis';

describe('generateDiagnosis', () => {
  it('returns positive savings rate when >= 20%', () => {
    const result = generateDiagnosis({
      monthNet: 2000,
      monthIncome: 5000,
      projectedMonthNet: 2500,
      remainingDays: 10,
    });
    const savings = result.find(i => i.text.includes('guardando'));
    expect(savings).toBeDefined();
    expect(savings!.text).toContain('40%');
    expect(savings!.tone).toBe('positive');
  });

  it('returns neutral savings rate when 0-19%', () => {
    const result = generateDiagnosis({
      monthNet: 500,
      monthIncome: 5000,
      projectedMonthNet: 600,
      remainingDays: 10,
    });
    const savings = result.find(i => i.text.includes('guardando'));
    expect(savings).toBeDefined();
    expect(savings!.text).toContain('10%');
    expect(savings!.tone).toBe('neutral');
  });

  it('returns caution when expenses exceed income', () => {
    const result = generateDiagnosis({
      monthNet: -1000,
      monthIncome: 5000,
      projectedMonthNet: -1500,
      remainingDays: 10,
    });
    const savings = result.find(i => i.text.includes('superaram'));
    expect(savings).toBeDefined();
    expect(savings!.tone).toBe('caution');
  });

  it('skips savings rate when monthIncome is 0', () => {
    const result = generateDiagnosis({
      monthNet: -500,
      monthIncome: 0,
      projectedMonthNet: -800,
      remainingDays: 10,
    });
    const savings = result.find(i => i.text.includes('guardando') || i.text.includes('superaram'));
    expect(savings).toBeUndefined();
  });

  it('returns positive budget insight when all on track', () => {
    const result = generateDiagnosis({
      monthNet: 1000,
      monthIncome: 5000,
      projectedMonthNet: 1200,
      remainingDays: 10,
      budgetSummary: { total: 3, onTrack: 3, overBudget: 0 },
    });
    const budget = result.find(i => i.text.includes('orçamentos'));
    expect(budget).toBeDefined();
    expect(budget!.text).toContain('dentro do limite');
    expect(budget!.tone).toBe('positive');
  });

  it('returns caution budget insight when some over', () => {
    const result = generateDiagnosis({
      monthNet: 1000,
      monthIncome: 5000,
      projectedMonthNet: 1200,
      remainingDays: 10,
      budgetSummary: { total: 4, onTrack: 2, overBudget: 2 },
    });
    const budget = result.find(i => i.text.includes('ultrapassaram'));
    expect(budget).toBeDefined();
    expect(budget!.text).toContain('2 de 4');
    expect(budget!.tone).toBe('caution');
  });

  it('skips budget insight when no budgets', () => {
    const result = generateDiagnosis({
      monthNet: 1000,
      monthIncome: 5000,
      projectedMonthNet: 1200,
      remainingDays: 10,
    });
    const budget = result.find(i => i.text.includes('orçamentos'));
    expect(budget).toBeUndefined();
  });

  it('returns positive direction when projection improves', () => {
    const result = generateDiagnosis({
      monthNet: 500,
      monthIncome: 5000,
      projectedMonthNet: 1500,
      remainingDays: 15,
    });
    const direction = result.find(i => i.text.includes('melhorar'));
    expect(direction).toBeDefined();
    expect(direction!.tone).toBe('positive');
  });

  it('returns caution direction when projection worsens', () => {
    const result = generateDiagnosis({
      monthNet: 2000,
      monthIncome: 5000,
      projectedMonthNet: 1000,
      remainingDays: 15,
    });
    const direction = result.find(i => i.text.includes('reduzir'));
    expect(direction).toBeDefined();
    expect(direction!.tone).toBe('caution');
  });

  it('returns caution when projection turns negative', () => {
    const result = generateDiagnosis({
      monthNet: 200,
      monthIncome: 5000,
      projectedMonthNet: -300,
      remainingDays: 15,
    });
    const direction = result.find(i => i.text.includes('negativo'));
    expect(direction).toBeDefined();
    expect(direction!.tone).toBe('caution');
  });

  it('skips direction insight when remainingDays is 0', () => {
    const result = generateDiagnosis({
      monthNet: 1000,
      monthIncome: 5000,
      projectedMonthNet: 1000,
      remainingDays: 0,
    });
    const direction = result.find(i =>
      i.text.includes('melhorar') || i.text.includes('reduzir') || i.text.includes('negativo')
    );
    expect(direction).toBeUndefined();
  });

  it('returns max 3 insights', () => {
    const result = generateDiagnosis({
      monthNet: 2000,
      monthIncome: 5000,
      projectedMonthNet: 2500,
      remainingDays: 10,
      budgetSummary: { total: 3, onTrack: 3, overBudget: 0 },
    });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('handles all-positive scenario gracefully', () => {
    const result = generateDiagnosis({
      monthNet: 3000,
      monthIncome: 5000,
      projectedMonthNet: 4000,
      remainingDays: 10,
      budgetSummary: { total: 2, onTrack: 2, overBudget: 0 },
    });
    expect(result.every(i => i.tone === 'positive')).toBe(true);
  });
});
