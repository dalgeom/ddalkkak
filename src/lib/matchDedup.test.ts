import { describe, it, expect } from 'vitest';
import { assembleDayQueue } from './dayview';
import { MATCH_DEDUP_DAY, MATCH_ZERO_DAY } from './game';

describe('성냥 같은 답 — MATCH_DEDUP_DAY부터 하루 안에 같은 답이 두 번 나오지 않는다', () => {
	const sols = (d: number) => assembleDayQueue(d).filter((p) => p.kind === 'match').map((p) => p.eq!.solution);

	it('10/29부터 90일', () => {
		for (let d = MATCH_DEDUP_DAY; d < MATCH_DEDUP_DAY + 90; d++) {
			const s = sols(d);
			expect(new Set(s).size, `day ${d}: ${s.join(' / ')}`).toBe(s.length);
		}
	});

	it('그 전 날은 예전 그대로 — 10/28 세트에 손대지 않는다', () => {
		// 양성 대조: 이 규칙이 없었다면 10/29가 걸렸다. 그 전날(10/28)은 원래 겹치지 않아 그대로다
		expect(sols(MATCH_DEDUP_DAY - 1)).toEqual(['1 + 8 = 9', '8 - 5 = 3', '1 + 5 = 6']);
	});
});

describe('성냥 0 꼴 — MATCH_ZERO_DAY부터 「x ± 0 = x」는 하루에 하나 이하', () => {
	const sols = (d: number) => assembleDayQueue(d).filter((p) => p.kind === 'match').map((p) => p.eq!.solution);
	const zero = /^(\d+) [+-] 0 = \1$|^0 \+ (\d+) = \2$/;

	it('11/17부터 90일', () => {
		// 양성 대조: 이 규칙이 없을 때 20774(9 + 0 = 9 · 9 - 0 = 9 · 2 + 0 = 2) · 20834 · 20842 · 20855가 걸렸다
		for (let d = MATCH_ZERO_DAY; d < MATCH_ZERO_DAY + 90; d++) {
			const s = sols(d);
			expect(s.filter((x) => zero.test(x)).length, `day ${d}: ${s.join(' / ')}`).toBeLessThanOrEqual(1);
		}
	});

	it('그 전 날은 예전 그대로 — 11/16 세트에 손대지 않는다', () => {
		expect(sols(MATCH_ZERO_DAY - 1)).toEqual(['9 + 4 = 13', '5 + 8 = 13']);
	});
});
