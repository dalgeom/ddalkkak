import { describe, expect, it } from 'vitest';
import problems from './data/matchstick-problems.json';
import variants from './data/matchstick-variants.json';
import { changeLine, isTrueText, normalize, parseCells, pretty, solve, type Cell } from './matchSolve';
import type { MatchProblem } from './matchstick';

const cells = (s: string): Cell[] => {
	const r = parseCells(s);
	if ('error' in r) throw new Error(r.error);
	return r.cells;
};
const texts = (s: string, rule: Parameters<typeof solve>[1] = 'move1') => solve(cells(s), rule).map((x) => x.text).sort();
const n = (s: string) => s.replace(/\s/g, '');

describe('성냥 정답 찾기', () => {
	it('문제은행 741개는 정답이 하나씩 그대로 나온다(규칙이 사이트와 같다)', () => {
		for (const p of problems as MatchProblem[]) expect(texts(p.displayed), p.displayed).toEqual([n(p.solution)]);
	});
	it('단계 변형 문제(2개 옮기기 · 빼기 · 더하기)도 정답이 하나씩 나온다', () => {
		const V = variants as Record<'move2' | 'remove1' | 'add1', MatchProblem[]>;
		for (const rule of ['move2', 'remove1', 'add1'] as const)
			for (const p of V[rule]) expect(texts(p.displayed, rule), `${rule} ${p.displayed}`).toEqual([n(p.solution)]);
	});
	it('문제은행 밖의 식 — 두 자리 수 · 답이 여럿', () => {
		expect(texts('12-7=6')).toEqual(['13-7=6']);
		expect(texts('10+3=18')).toEqual(['10+9=19']);
		expect(texts('9-9=5')).toEqual(['8-3=5', '9-3=6']);
	});
	it('빼기 · 더하기 규칙', () => {
		expect(texts('8+3=5', 'remove1')).toContain('8-3=5');
		expect(texts('9-3=5', 'add1')).toContain('9-3=6');
	});
	it('답에서 바뀐 칸을 한 줄로', () => {
		const [s] = solve(cells('8-2=8'), 'move1');
		expect(s.text).toBe('6+2=8');
		expect(changeLine(cells('8-2=8'), s.cells)).toBe('8 → 6 · − → +');
		expect(s.removed).toHaveLength(1);
		expect(s.added).toEqual([{ ci: 1, seg: 'v' }]);
	});
	it('식 읽기 — 여러 가지 빼기 기호 · 전각 · 잘못된 식', () => {
		expect(normalize('１２ − ７ ＝ ６')).toBe('12-7=6');
		expect(parseCells('3x3=9')).toHaveProperty('error');
		expect(parseCells('1+2')).toMatchObject({ unfinished: true });
		expect(parseCells('12-')).toMatchObject({ unfinished: true });
		expect(parseCells('1=2=3')).not.toHaveProperty('unfinished');
		expect(parseCells('1++2=3')).toHaveProperty('error');
		expect(parseCells('가=1')).toHaveProperty('error');
	});
	it('참 판정 — 0으로 시작하는 두 자리는 수가 아니다', () => {
		expect(isTrueText('1+2+3=6')).toBe(true);
		expect(isTrueText('08=8')).toBe(false);
		expect(isTrueText('0=0')).toBe(true);
	});
	it('정답 찾기 쪽 설명 글의 예제 답(규칙 네 가지 · 답 그림 읽는 법)', () => {
		expect(texts('6+4=4')).toEqual(['0+4=4', '8-4=4']);
		expect(texts('41-9=5', 'move2')).toEqual(['14-9=5']);
		expect(texts('8+3=5', 'remove1')).toEqual(['8-3=5']);
		expect(texts('7+1=0', 'add1')).toEqual(['7+1=8']);
		const [s] = solve(cells('5+7=2'), 'move1');
		expect(s.text).toBe('9-7=2');
		expect(changeLine(cells('5+7=2'), s.cells)).toBe('5 → 9 · + → −');
	});
	it('보이는 식', () => {
		expect(pretty('13-7=6')).toBe('13 − 7 = 6');
	});
});
