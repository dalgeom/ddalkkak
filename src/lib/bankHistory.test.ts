import { describe, it, expect } from 'vitest';
import { BANK_HISTORY_ALL, BANK_HISTORY_LAST, bankSizesAt } from './bankHistory';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import { buildDailySet, MATCH_TOTAL, SITE_START_DAY } from './game';

describe('은행 크기 이력', () => {
	it('마지막 엔트리가 실제 배열 길이와 같다 — 문제를 추가하면 fromDay 내일짜 엔트리도 함께 추가해야 한다', () => {
		expect(BANK_HISTORY_LAST.discover).toBe(PROBLEMS.length);
		expect(BANK_HISTORY_LAST.trivia).toBe(TRIVIA.length);
	});

	it('fromDay가 시작일부터 단조 증가한다', () => {
		expect(BANK_HISTORY_ALL[0].fromDay).toBe(SITE_START_DAY);
		for (let i = 1; i < BANK_HISTORY_ALL.length; i++)
			expect(BANK_HISTORY_ALL[i].fromDay).toBeGreaterThan(BANK_HISTORY_ALL[i - 1].fromDay);
	});

	it('크기도 단조 증가한다 — 삭제 금지(프리픽스 슬라이스의 전제)', () => {
		for (let i = 1; i < BANK_HISTORY_ALL.length; i++) {
			expect(BANK_HISTORY_ALL[i].discover).toBeGreaterThanOrEqual(
				BANK_HISTORY_ALL[i - 1].discover
			);
			expect(BANK_HISTORY_ALL[i].trivia).toBeGreaterThanOrEqual(BANK_HISTORY_ALL[i - 1].trivia);
		}
	});

	it('경계에서 맞는 크기를 준다', () => {
		expect(bankSizesAt(20676)).toEqual({ discover: 315, trivia: 417 });
		expect(bankSizesAt(20677)).toEqual({ discover: 318, trivia: 420 });
		expect(bankSizesAt(SITE_START_DAY)).toEqual({ discover: 200, trivia: 405 });
		expect(bankSizesAt(99999)).toEqual({
			discover: BANK_HISTORY_LAST.discover,
			trivia: BANK_HISTORY_LAST.trivia
		});
	});

	const picksAt = (day: number, dN: number, tN: number) =>
		buildDailySet(
			PROBLEMS.slice(0, dN),
			TRIVIA.slice(0, tN),
			MATCH_TOTAL,
			day,
			(x) => fieldOfChip(x.chip),
			(x) => x.category ?? '기타'
		);

	it('은행이 자라도 그날 크기로 계산하면 세트가 달라지지 않는다', () => {
		const s = bankSizesAt(20676);
		const frozen = picksAt(20676, s.discover, s.trivia);
		// 전체 은행(더 큰 크기)으로 계산하면 달라진다 — 이 어긋남이 이력의 존재 이유다
		const drifted = picksAt(20676, PROBLEMS.length, TRIVIA.length);
		expect(drifted).not.toEqual(frozen);
		// 같은 크기로 다시 계산하면 언제나 같다
		expect(picksAt(20676, s.discover, s.trivia)).toEqual(frozen);
	});

	it('복원 검증: 8/11을 그날 크기로 계산하면 GN 댓글러가 아침에 본 문제가 나온다', () => {
		const s = bankSizesAt(20676);
		const ids = picksAt(20676, s.discover, s.trivia)
			.filter((p) => p.kind === 'discover')
			.map((p) => PROBLEMS[p.index].id);
		expect(ids).toContain('sh-sym-vertical');
	});
});
