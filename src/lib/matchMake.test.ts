import { describe, expect, it } from 'vitest';
import { makeProblems } from './matchMake';
import { isTrueText, parseCells, solve, type Cell } from './matchSolve';

const cells = (s: string): Cell[] => {
	const r = parseCells(s);
	if ('error' in r) throw new Error(r.error);
	return r.cells;
};

describe('성냥 문제 만들기', () => {
	it('1개 옮기기 — 알려진 문제가 나온다(6+4=4 → 0+4=4)', () => {
		expect(makeProblems(cells('0+4=4'), 'move1').map((m) => m.text)).toContain('6+4=4');
	});
	it('1개 빼기 · 1개 더하기 — 정답 찾기 예제의 거꾸로', () => {
		expect(makeProblems(cells('8-3=5'), 'remove1').map((m) => m.text)).toContain('8+3=5');
		expect(makeProblems(cells('7+1=8'), 'add1').map((m) => m.text)).toContain('7+1=0');
	});
	it('만든 문제는 모두 틀린 식이고, 풀이기로 풀면 넣은 식이 답에 있다', () => {
		for (const eq of ['0+4=4', '13-7=6', '9+5=14', '8-3=5'])
			for (const rule of ['move1', 'remove1', 'add1'] as const)
				for (const m of makeProblems(cells(eq), rule)) {
					expect(isTrueText(m.text), m.text).toBe(false);
					expect(solve(cells(m.text), rule).map((s) => s.text), `${rule} ${m.text}`).toContain(eq);
					expect(m.answers.length).toBeGreaterThan(0);
				}
	});
	it('답이 하나뿐인 문제가 앞에 온다', () => {
		const ms = makeProblems(cells('13-7=6'), 'move1');
		expect(ms.length).toBeGreaterThan(0);
		for (let i = 1; i < ms.length; i++) expect(ms[i].answers.length).toBeGreaterThanOrEqual(ms[i - 1].answers.length);
	});
	it('틀린 식을 넣으면 아무것도 안 만든다', () => {
		expect(makeProblems(cells('6+4=4'), 'move1')).toEqual([]);
	});
});
