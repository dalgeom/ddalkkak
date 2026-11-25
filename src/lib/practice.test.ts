import { describe, expect, it } from 'vitest';
import { PRACTICE_BASE, SCRAMBLE_POOL, SCRAMBLE_PRACTICE, scramblePracticeAt } from './scramble';
import { countSolutions, sudokuAt } from './sudoku';
import { equationAt } from './equation';
import { kstDayNumber } from './game';

/* 놀이 탭 연습 판(/sudoku · /scramble · /equation, 11/25) — 데일리와 안 겹치고, 판 번호가 늘 같은 문제를 가리킨다 */
describe('연습 판', () => {
	it('시드는 데일리 날짜 번호보다 한참 위', () => {
		expect(PRACTICE_BASE).toBeGreaterThanOrEqual(1_000_000);
		expect(PRACTICE_BASE).toBeGreaterThan(kstDayNumber(Date.now()) + 365 * 100);
	});

	it('스도쿠 연습 200판은 모두 해가 하나', () => {
		for (let k = 0; k < 200; k++) {
			const s = sudokuAt(PRACTICE_BASE + k);
			expect(s.size).toBe(k % 2 === 0 ? 4 : 6);
			expect(countSolutions([...s.givens], s.size, s.boxR, s.boxC)).toBe(1);
		}
	});

	it('그림 방정식 연습 판은 답이 양수', () => {
		for (let k = 0; k < 200; k++) expect(equationAt(PRACTICE_BASE + k).answer).toBeGreaterThan(0);
	});

	it('글자 섞기 연습 낱말은 오늘의 10문제 풀에 없다', () => {
		const daily = new Set(SCRAMBLE_POOL.map((w) => w.word));
		expect(SCRAMBLE_PRACTICE.filter((w) => daily.has(w.word))).toEqual([]);
		// 양성 대조 — 같은 검사가 데일리 낱말 하나를 섞으면 잡는다
		expect([...SCRAMBLE_PRACTICE, SCRAMBLE_POOL[0]].filter((w) => daily.has(w.word))).toHaveLength(1);
	});

	it('글자 섞기 연습 풀 — 크기 · 분야', () => {
		expect(SCRAMBLE_PRACTICE.length).toBeGreaterThanOrEqual(60);
		expect(SCRAMBLE_PRACTICE.filter((w) => w.category === 'idiom' || w.category === 'movie')).toEqual([]);
		expect(new Set(SCRAMBLE_PRACTICE.map((w) => w.word)).size).toBe(SCRAMBLE_PRACTICE.length);
	});

	it('글자 섞기 앞 판은 고정(뒤에 초성 낱말이 늘어도)', () => {
		expect(SCRAMBLE_PRACTICE.slice(0, 5).map((w) => w.word)).toEqual(['천혜향', '쌀과자', '강낭콩', '오징어집', '돼지갈비']);
		expect(SCRAMBLE_PRACTICE.slice(0, 87).length).toBe(87);
		const s = scramblePracticeAt(0)!;
		expect(s.letters.join('')).not.toBe(s.word);
		expect([...s.letters].sort().join('')).toBe([...s.word].sort().join(''));
		expect(scramblePracticeAt(SCRAMBLE_PRACTICE.length)).toBeNull();
	});
});
