import { describe, it, expect, beforeEach } from 'vitest';
import {
	readDayRecord, dayNumToDate, dateToDayNum, weekOf, monthGrid, summarize
} from './record';
import { SITE_START_DAY, kstDayNumber, dailyProgressKey } from './game';

/* localStorage 흉내 — game.ts의 readDailyProgress가 그대로 읽는다 */
const store = new Map<string, string>();
beforeEach(() => {
	store.clear();
	(globalThis as { localStorage?: unknown }).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k),
		key: (i: number) => [...store.keys()][i] ?? null,
		get length() { return store.size; }
	};
});

function play(dayNum: number, marks: string[], elapsedMs?: number) {
	store.set(dailyProgressKey(dayNum), JSON.stringify({ pos: marks.length, marks, done: true, elapsedMs }));
}

describe('날짜 수학 (KST)', () => {
	it('dayNum과 달력 날짜가 서로 되돌아간다', () => {
		// 사이트 시작일 2026-07-15부터 1년 왕복
		for (let d = SITE_START_DAY; d < SITE_START_DAY + 366; d++) {
			const { y, m, d: dd } = dayNumToDate(d);
			expect(dateToDayNum(y, m, dd)).toBe(d);
		}
	});

	it('kstDayNumber와 같은 기준이다 — KST 자정 직전·직후가 다른 날', () => {
		// 2026-08-09 23:59 KST = 14:59 UTC / 2026-08-10 00:01 KST = 15:01 UTC(전날)
		const before = Date.UTC(2026, 7, 9, 14, 59);
		const after = Date.UTC(2026, 7, 9, 15, 1);
		expect(kstDayNumber(before)).not.toBe(kstDayNumber(after));
		expect(dayNumToDate(kstDayNumber(after))).toMatchObject({ y: 2026, m: 8, d: 10 });
	});

	it('2026-08-10은 월요일이다 (weekday 0, 월요일 시작)', () => {
		expect(dayNumToDate(dateToDayNum(2026, 8, 10)).weekday).toBe(0);
	});

	it('weekOf는 월요일부터 7일', () => {
		const wed = dateToDayNum(2026, 8, 12);
		const week = weekOf(wed);
		expect(week).toHaveLength(7);
		expect(week[0]).toBe(dateToDayNum(2026, 8, 10));
		expect(week[6]).toBe(dateToDayNum(2026, 8, 16));
	});

	it('monthGrid는 7의 배수 길이에 그 달 날짜를 전부 담는다', () => {
		for (const [y, m, len] of [[2026, 8, 31], [2026, 2, 28], [2028, 2, 29], [2026, 12, 31]] as const) {
			const g = monthGrid(y, m);
			expect(g.length % 7).toBe(0);
			expect(g.filter((c) => c.inMonth)).toHaveLength(len);
			// 첫 칸은 월요일
			expect(dayNumToDate(g[0].dayNum).weekday).toBe(0);
		}
	});
});

describe('기록 읽기·집계', () => {
	it('완주한 날만 기록으로 친다', () => {
		play(SITE_START_DAY, ['clean', 'hinted', 'miss']);
		store.set(dailyProgressKey(SITE_START_DAY + 1),
			JSON.stringify({ pos: 3, marks: ['clean'], done: false }));
		expect(readDayRecord(SITE_START_DAY)).toMatchObject({ correct: 2, total: 3 });
		expect(readDayRecord(SITE_START_DAY + 1)).toBeNull();
	});

	it('연속·최장·평균이 맞는다', () => {
		const t = SITE_START_DAY + 9;
		// 0,1,2 연속 3일 — 그다음 쉼 — 7,8,9(오늘) 연속 3일
		for (const off of [0, 1, 2, 7, 8]) play(SITE_START_DAY + off, ['clean'], 60000);
		play(t, ['clean', 'miss'], 120000);
		const s = summarize(t);
		expect(s.days).toBe(6);
		expect(s.streak).toBe(3);
		expect(s.bestStreak).toBe(3);
		expect(s.totalCorrect).toBe(6);
		expect(s.avgMs).toBe(70000);
	});

	it('오늘을 아직 안 풀었으면 어제까지의 연속을 보여준다', () => {
		const t = SITE_START_DAY + 5;
		play(t - 2, ['clean']);
		play(t - 1, ['clean']);
		expect(summarize(t).streak).toBe(2);
	});

	it('시간 기록이 없던 날(elapsedMs 없음)은 평균에서 빠진다', () => {
		const t = SITE_START_DAY + 1;
		play(t - 1, ['clean']);           // 옛날 완주 — 시간 없음
		play(t, ['clean'], 90000);
		expect(summarize(t).avgMs).toBe(90000);
	});
});
