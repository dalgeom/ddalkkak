import { describe, it, expect } from 'vitest';
import { assembleDayQueue } from './dayview';
import { MATCH_DEDUP_DAY } from './game';

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
