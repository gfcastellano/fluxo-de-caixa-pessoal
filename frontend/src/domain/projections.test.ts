import { describe, it, expect } from 'vitest';
import { projectMonthNet, projectYearEndImpact } from './projections';

describe('projectMonthNet', () => {
  it('returns currentNet when remainingDays is 0 (month ended)', () => {
    const result = projectMonthNet({
      currentNet: 500,
      lastNDaysNet: 200,
      remainingDays: 0,
      windowDays: 7,
    });
    expect(result.value).toBe(500);
    expect(result.explanation).toContain('encerrado');
  });

  it('returns currentNet when windowDays is 0 (no data)', () => {
    const result = projectMonthNet({
      currentNet: 300,
      lastNDaysNet: 0,
      remainingDays: 15,
      windowDays: 0,
    });
    expect(result.value).toBe(300);
    expect(result.explanation).toContain('Sem dados');
  });

  it('projects correctly with positive daily net (N=7)', () => {
    // avg = 700/7 = 100/day, remaining 10 days → 500 + 100*10 = 1500
    const result = projectMonthNet({
      currentNet: 500,
      lastNDaysNet: 700,
      remainingDays: 10,
      windowDays: 7,
    });
    expect(result.value).toBe(1500);
    expect(result.explanation).toContain('7 dias');
  });

  it('projects correctly with N=14 window', () => {
    // avg = 1400/14 = 100/day, remaining 5 days → 200 + 100*5 = 700
    const result = projectMonthNet({
      currentNet: 200,
      lastNDaysNet: 1400,
      remainingDays: 5,
      windowDays: 14,
    });
    expect(result.value).toBe(700);
    expect(result.explanation).toContain('14 dias');
  });

  it('handles negative daily net (spending more than earning)', () => {
    // avg = -350/7 = -50/day, remaining 20 days → 1000 + (-50)*20 = 0
    const result = projectMonthNet({
      currentNet: 1000,
      lastNDaysNet: -350,
      remainingDays: 20,
      windowDays: 7,
    });
    expect(result.value).toBe(0);
  });

  it('handles negative currentNet', () => {
    // avg = 210/7 = 30/day, remaining 10 days → -500 + 30*10 = -200
    const result = projectMonthNet({
      currentNet: -500,
      lastNDaysNet: 210,
      remainingDays: 10,
      windowDays: 7,
    });
    expect(result.value).toBe(-200);
  });

  it('handles both negative currentNet and negative daily net', () => {
    // avg = -140/7 = -20/day, remaining 15 days → -300 + (-20)*15 = -600
    const result = projectMonthNet({
      currentNet: -300,
      lastNDaysNet: -140,
      remainingDays: 15,
      windowDays: 7,
    });
    expect(result.value).toBe(-600);
  });

  it('handles zero net (break-even)', () => {
    const result = projectMonthNet({
      currentNet: 0,
      lastNDaysNet: 0,
      remainingDays: 10,
      windowDays: 7,
    });
    expect(result.value).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    // avg = 100/7 ≈ 14.2857/day, remaining 3 days → 0 + 14.2857*3 = 42.8571 → 42.86
    const result = projectMonthNet({
      currentNet: 0,
      lastNDaysNet: 100,
      remainingDays: 3,
      windowDays: 7,
    });
    expect(result.value).toBe(42.86);
  });

  it('returns currentNet when remainingDays is negative', () => {
    const result = projectMonthNet({
      currentNet: 800,
      lastNDaysNet: 200,
      remainingDays: -1,
      windowDays: 7,
    });
    expect(result.value).toBe(800);
  });
});

describe('projectYearEndImpact', () => {
  it('returns 0 when monthsRemaining is 0 (year ended)', () => {
    const result = projectYearEndImpact({
      projectedMonthNet: 1000,
      monthsRemaining: 0,
    });
    expect(result.value).toBe(0);
    expect(result.explanation).toContain('encerrado');
  });

  it('returns 0 when monthsRemaining is negative', () => {
    const result = projectYearEndImpact({
      projectedMonthNet: 500,
      monthsRemaining: -2,
    });
    expect(result.value).toBe(0);
  });

  it('uses projectedMonthNet when no history available', () => {
    // 500 * 6 months = 3000
    const result = projectYearEndImpact({
      projectedMonthNet: 500,
      monthsRemaining: 6,
    });
    expect(result.value).toBe(3000);
    expect(result.explanation).toContain('sem histórico');
  });

  it('uses conservative rate (min of projection and historical avg)', () => {
    // projected = 1000, historical avg = (600+800+700)/3 = 700
    // conservative = min(1000, 700) = 700
    // 700 * 4 = 2800
    const result = projectYearEndImpact({
      projectedMonthNet: 1000,
      monthsRemaining: 4,
      historicalMonthlyNets: [600, 800, 700],
    });
    expect(result.value).toBe(2800);
    expect(result.explanation).toContain('conservadora');
  });

  it('uses projected when it is lower than historical avg', () => {
    // projected = 300, historical avg = (600+800)/2 = 700
    // conservative = min(300, 700) = 300
    // 300 * 5 = 1500
    const result = projectYearEndImpact({
      projectedMonthNet: 300,
      monthsRemaining: 5,
      historicalMonthlyNets: [600, 800],
    });
    expect(result.value).toBe(1500);
  });

  it('handles negative projections (spending more than earning)', () => {
    // projected = -200, historical avg = (-100+-300)/2 = -200
    // conservative = min(-200, -200) = -200
    // -200 * 3 = -600
    const result = projectYearEndImpact({
      projectedMonthNet: -200,
      monthsRemaining: 3,
      historicalMonthlyNets: [-100, -300],
    });
    expect(result.value).toBe(-600);
  });

  it('is conservative with negative values (picks worse scenario)', () => {
    // projected = -500, historical avg = (-100+-200)/2 = -150
    // conservative = min(-500, -150) = -500 (more negative = worse)
    // -500 * 4 = -2000
    const result = projectYearEndImpact({
      projectedMonthNet: -500,
      monthsRemaining: 4,
      historicalMonthlyNets: [-100, -200],
    });
    expect(result.value).toBe(-2000);
  });

  it('handles single month of history', () => {
    // projected = 800, historical avg = 600/1 = 600
    // conservative = min(800, 600) = 600
    // 600 * 10 = 6000
    const result = projectYearEndImpact({
      projectedMonthNet: 800,
      monthsRemaining: 10,
      historicalMonthlyNets: [600],
    });
    expect(result.value).toBe(6000);
    expect(result.explanation).toContain('1 meses');
  });

  it('handles empty history array same as no history', () => {
    const result = projectYearEndImpact({
      projectedMonthNet: 400,
      monthsRemaining: 3,
      historicalMonthlyNets: [],
    });
    expect(result.value).toBe(1200);
    expect(result.explanation).toContain('sem histórico');
  });
});
