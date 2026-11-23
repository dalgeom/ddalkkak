/**
 * 11/24부터 오늘의 10문제에 들어가는 세 유형(글자 섞기 · 그림 방정식 · 미니 스도쿠) 생성기 검사.
 * 앞으로 1년치를 만들어 답이 하나뿐인지 · 섞인 글자가 원래 낱말과 같은 음절인지 본다.
 */
import { describe, it, expect } from 'vitest';
import { scrambleAt, scrambleCorrect, SCRAMBLE_POOL } from './scramble';
import { equationAt, countSolutions, evalExpr } from './equation';
import { sudokuAt, countSolutions as sudokuSolutions } from './sudoku';

const DAYS = Array.from({ length: 365 }, (_, i) => 20781 + i);

describe('글자 섞기', () => {
	it('낱말 풀이 넉넉하고 3~4음절이다', () => {
		expect(SCRAMBLE_POOL.length).toBeGreaterThan(140);
		for (const w of SCRAMBLE_POOL) expect([...w.word].length).toBeGreaterThanOrEqual(3);
	});
	it('섞은 글자는 같은 음절이고 제자리에 남은 글자가 없다', () => {
		for (const d of DAYS) {
			const s = scrambleAt(d);
			expect([...s.letters].sort().join('')).toBe([...s.word].sort().join(''));
			expect(s.letters.join('')).not.toBe(s.word);
			expect(s.letters.every((ch, i) => ch !== [...s.word][i])).toBe(true);
			expect(scrambleCorrect(s, ` ${s.word} `)).toBe(true);
			expect(scrambleCorrect(s, s.letters.join(''))).toBe(false);
		}
	});
	it('같은 날은 늘 같은 문제', () => {
		expect(scrambleAt(20790)).toEqual(scrambleAt(20790));
	});
});

describe('그림 방정식', () => {
	it('곱셈을 먼저 한다', () => {
		expect(evalExpr('A + B × C', { A: 1, B: 2, C: 3 })).toBe(7);
		expect(evalExpr('A × B − C', { A: 4, B: 2, C: 3 })).toBe(5);
		expect(evalExpr('B − C', { B: 9, C: 3 })).toBe(6);
	});
	it('해가 하나뿐이고 답이 값과 맞는다', () => {
		for (const d of DAYS) {
			const e = equationAt(d);
			const raw = e.lines.map((l) => l.expr.replace(new RegExp(e.symbols.join('|'), 'g'), (s) => 'ABC'[e.symbols.indexOf(s)]));
			expect(countSolutions(raw, e.lines.map((l) => l.total))).toBe(1);
			expect(e.answer).toBeGreaterThan(0);
			expect(new Set(e.values).size).toBe(3);
			expect(e.steps.at(-1)).toContain(String(e.answer));
		}
	});
	it('검사기가 해 여럿을 실제로 센다(양성 대조)', () => {
		expect(countSolutions(['A + B'], [10])).toBeGreaterThan(1);
	});
	it('수 뒤 조사가 맞다 — 「1을 더한다」, 「2를 뺀다」', () => {
		// 「둘째 줄(9)을」은 「줄을」이라 맞다 — 줄( 뒤는 뺀다
		const bad = /(?<!줄\(\d*)(?:[013678]\)?를|[2459]\)?을) (?:빼면|더한다|뺀다)/;
		expect(bad.test('1를 더한다')).toBe(true); // 양성 대조
		for (const d of DAYS) for (const st of equationAt(d).steps) expect(st).not.toMatch(bad);
	});
});

describe('미니 스도쿠', () => {
	it('짝수 날 4×4 · 홀수 날 6×6, 답이 하나뿐이다', () => {
		for (const d of DAYS.slice(0, 120)) {
			const s = sudokuAt(d);
			expect(s.size).toBe(d % 2 === 0 ? 4 : 6);
			expect(sudokuSolutions(s.givens, s.size, s.boxR, s.boxC)).toBe(1);
			s.givens.forEach((g, i) => g && expect(g).toBe(s.solution[i]));
		}
	});
});
