import { describe, it, expect } from 'vitest';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import { buildDailySet, dailySample, MATCH_TOTAL } from './game';

describe('오늘의 맛보기 문제', () => {
	const todaysDiscover = (day: number) =>
		buildDailySet(PROBLEMS, TRIVIA, MATCH_TOTAL, day, (p) => fieldOfChip(p.chip), (t) => t.category ?? '기타')
			.filter((p) => p.kind === 'discover')
			.map((p) => p.index);

	it('1년치 어느 날이든 오늘의 10문제와 겹치지 않는다', () => {
		for (let day = 20649; day < 20649 + 365; day++) {
			const excl = todaysDiscover(day);
			const s = dailySample(PROBLEMS.length, day, excl);
			expect(excl, `day ${day} 맛보기가 오늘 문제와 겹침`).not.toContain(s);
			expect(s).toBeGreaterThanOrEqual(0);
			expect(s).toBeLessThan(PROBLEMS.length);
		}
	});

	it('같은 날은 같은 문제, 날마다 바뀐다', () => {
		expect(dailySample(PROBLEMS.length, 20649, [])).toBe(dailySample(PROBLEMS.length, 20649, []));
		const seq = [20649, 20650, 20651, 20652].map((d) => dailySample(PROBLEMS.length, d, []));
		expect(new Set(seq).size).toBe(seq.length);
	});

	it('맛보기 문제는 정답과 해설을 갖는다', () => {
		for (let day = 20649; day < 20649 + 60; day++) {
			const p = PROBLEMS[dailySample(PROBLEMS.length, day, todaysDiscover(day))];
			expect(p.explain.length).toBeGreaterThan(0);
			if (p.type === 'choice') expect(p.answerIndex).toBeGreaterThanOrEqual(0);
			else expect((p.answers ?? []).length).toBeGreaterThan(0);
		}
	});

	it('빈 배열·엣지 입력에 안전', () => {
		expect(dailySample(0, 100, [])).toBe(-1);
		expect(dailySample(3, -5, [])).toBeGreaterThanOrEqual(0);
	});
});
