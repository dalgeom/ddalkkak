import { describe, it, expect } from 'vitest';
import { newKeys, tierCounts, type StageMeta } from './stages';

const S = (tier: 1 | 2 | 3 | 4 | 5, n: number): StageMeta[] =>
	Array.from({ length: n }, (_, i) => ({ key: `${tier}-${i + 1}`, tier, inTier: i + 1 }));

describe('새 판 표시(10/22)', () => {
	const now = [...S(1, 3), ...S(5, 2)];

	it('단계별 판 수', () => {
		expect(tierCounts(now)).toEqual({ 1: 3, 5: 2 });
	});
	it('처음 연 사람에게는 새 판이 없다', () => {
		expect(newKeys(now, null, { '5-1': 3 }).size).toBe(0);
	});
	it('깬 적 있는 단계에서, 지난번보다 뒤에 붙은 판 중 아직 안 깬 것만', () => {
		const seen = { 1: 2, 5: 1 };
		expect([...newKeys(now, seen, { '5-1': 3 })]).toEqual(['5-2']); // 새싹은 손대지 않은 단계라 빠진다
		expect([...newKeys(now, seen, { '5-1': 3, '1-1': 1 })].sort()).toEqual(['1-3', '5-2']);
		expect(newKeys(now, seen, { '5-1': 3, '5-2': 1 }).size).toBe(0); // 깬 새 판은 더는 새 판이 아니다
	});
});
