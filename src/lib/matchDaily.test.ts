import { describe, it, expect } from 'vitest';
import { matchOfDay, nextStreak, shownStreak } from './matchDaily';
import { assembleDayQueue } from './dayview';
import { MATCH_TOTAL } from './game';
import matchData from './data/matchstick-problems.json';

const TODAY = 20725; // 2026-09-29

describe('오늘의 성냥개비 — 고르기', () => {
	it('같은 날은 같은 문제, 다음 날은 다른 문제', () => {
		expect(matchOfDay(TODAY)).toBe(matchOfDay(TODAY));
		expect(matchOfDay(TODAY + 1)).not.toBe(matchOfDay(TODAY));
		expect(matchOfDay(TODAY)).toBeGreaterThanOrEqual(0);
		expect(matchOfDay(TODAY)).toBeLessThan(MATCH_TOTAL);
	});

	it('앞뒤 60일 동안 그날·전날·다음 날 데일리 10문제의 성냥개비와 겹치지 않는다', () => {
		const eqs = matchData as { displayed: string }[];
		let checked = 0;
		for (let d = TODAY - 30; d < TODAY + 30; d++) {
			const mine = eqs[matchOfDay(d)].displayed;
			for (const near of [d - 1, d, d + 1]) {
				const daily = assembleDayQueue(near)
					.filter((q) => q.kind === 'match')
					.map((q) => q.eq!.displayed);
				// 양성 대조: 데일리가 성냥개비를 실제로 내놓고 있어야 이 비교가 의미 있다
				expect(daily.length).toBeGreaterThan(0);
				expect(daily).not.toContain(mine);
				checked++;
			}
		}
		expect(checked).toBe(180);
	});
});

describe('오늘의 성냥개비 — 연속 기록', () => {
	it('어제 풀었으면 이어지고, 하루라도 비면 1부터', () => {
		expect(nextStreak(null, TODAY, 'won')).toEqual({ day: TODAY, streak: 1, best: 1 });
		const y = { day: TODAY - 1, streak: 4, best: 4 };
		expect(nextStreak(y, TODAY, 'won')).toEqual({ day: TODAY, streak: 5, best: 5 });
		const gap = { day: TODAY - 2, streak: 4, best: 6 };
		expect(nextStreak(gap, TODAY, 'won')).toEqual({ day: TODAY, streak: 1, best: 6 });
	});

	it('정답을 보면 끊기고, 같은 날 두 번은 세지 않는다', () => {
		const y = { day: TODAY - 1, streak: 4, best: 4 };
		expect(nextStreak(y, TODAY, 'revealed')).toEqual({ day: TODAY, streak: 0, best: 4 });
		const t = { day: TODAY, streak: 5, best: 5 };
		expect(nextStreak(t, TODAY, 'won')).toBe(t);
	});

	it('화면에는 어제까지 이어진 기록만 산 것으로 보인다', () => {
		expect(shownStreak({ day: TODAY - 1, streak: 3, best: 3 }, TODAY)).toBe(3);
		expect(shownStreak({ day: TODAY, streak: 4, best: 4 }, TODAY)).toBe(4);
		expect(shownStreak({ day: TODAY - 2, streak: 3, best: 3 }, TODAY)).toBe(0);
		expect(shownStreak(null, TODAY)).toBe(0);
	});
});
