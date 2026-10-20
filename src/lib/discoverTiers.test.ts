import { describe, it, expect } from 'vitest';
import { PROBLEMS } from './problems';
import { DISCOVER_TIERS } from './discoverTiers';

describe('발견형 단계', () => {
	it('은행의 모든 문제에 단계가 있고, 은행에 없는 id는 없다', () => {
		const ids = new Set(PROBLEMS.map((p) => p.id));
		expect(PROBLEMS.filter((p) => !DISCOVER_TIERS[p.id]).map((p) => p.id)).toEqual([]);
		expect(Object.keys(DISCOVER_TIERS).filter((id) => !ids.has(id))).toEqual([]);
	});
	it('단계는 1~5', () => {
		for (const [id, t] of Object.entries(DISCOVER_TIERS)) expect([1, 2, 3, 4, 5], id).toContain(t);
	});
	// 양성 대조 — 실측이 극단인 문제가 판정과 맞는지(정답률 100% n=10 · 10% n=10)
	it('실측 기준점: cal-analog-alarm은 새싹, day-month는 고수', () => {
		expect(DISCOVER_TIERS['cal-analog-alarm']).toBe(1);
		expect(DISCOVER_TIERS['day-month']).toBe(5);
	});
});
