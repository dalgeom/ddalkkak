import { describe, it, expect } from 'vitest';
import { pickDuel, parseSeed, parseVs, duelOutcome, DUEL_SIZE, DUEL_PLAN } from './duel';
import { TRIVIA } from './trivia';

describe('상식 대결', () => {
	it('같은 씨앗이면 같은 10문제, 다른 씨앗이면 대개 다르다', () => {
		const a = pickDuel(TRIVIA, 12345).map((p) => p.id);
		expect(pickDuel(TRIVIA, 12345).map((p) => p.id)).toEqual(a);
		expect(pickDuel(TRIVIA, 54321).map((p) => p.id)).not.toEqual(a);
	});
	it('10문제, 겹치지 않고, 쉬운 순서(초등 3 · 중등 3 · 고등 2 · 어른 2), 전부 선택형', () => {
		for (const seed of [1, 7, 99, 123456, 987654321]) {
			const ps = pickDuel(TRIVIA, seed);
			expect(ps).toHaveLength(DUEL_SIZE);
			expect(new Set(ps.map((p) => p.id)).size).toBe(DUEL_SIZE);
			const grades = DUEL_PLAN.flatMap(([g, k]) => Array(k).fill(g));
			expect(ps.map((p) => p.grade)).toEqual(grades);
			for (const p of ps) {
				expect(p.type).toBe('choice');
				expect(p.choices?.[p.answerIndex ?? -1], p.id).toBeTruthy();
			}
		}
	});
	it('링크 값 검사', () => {
		expect(parseSeed('123')).toBe(123);
		expect(parseSeed('0')).toBeNull();
		expect(parseSeed('-1')).toBeNull();
		expect(parseSeed('abc')).toBeNull();
		expect(parseVs('7', '80')).toEqual({ score: 7, secs: 80 });
		expect(parseVs('11', '80')).toBeNull();
		expect(parseVs('7', '0')).toBeNull();
		expect(parseVs(null, '80')).toBeNull();
	});
	it('승패 — 점수 먼저, 같으면 빠른 쪽', () => {
		expect(duelOutcome({ score: 8, secs: 90 }, { score: 7, secs: 30 })).toBe('win');
		expect(duelOutcome({ score: 7, secs: 90 }, { score: 7, secs: 30 })).toBe('lose');
		expect(duelOutcome({ score: 7, secs: 30 }, { score: 7, secs: 30 })).toBe('draw');
	});
});
