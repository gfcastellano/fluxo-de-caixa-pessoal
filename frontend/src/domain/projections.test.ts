import { describe, it, expect } from 'vitest';
import { projectMonthNet } from './projections';

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
