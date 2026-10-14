import { describe, it, expect } from 'vitest';
import { GRID_PUZZLES, gridEdges, countSquares, shapeKey, judgeGrid, type GridPuzzle } from './matchGrid';

function* comb<T>(arr: T[], k: number, s = 0, acc: T[] = []): Generator<T[]> {
	if (acc.length === k) {
		yield acc.slice();
		return;
	}
	for (let i = s; i <= arr.length - (k - acc.length); i++) {
		acc.push(arr[i]);
		yield* comb(arr, k, i + 1, acc);
		acc.pop();
	}
}

/** 정확히 k개를 옮겨 목표가 되는 배치가 있는가 */
function solvableWith(p: GridPuzzle, k: number): boolean {
	const start = new Set(p.start);
	const unlit = gridEdges(p.w, p.h).filter((e) => !start.has(e));
	const ok = (lit: Set<string>) =>
		'squares' in p.goal ? countSquares(lit, p.w, p.h) === p.goal.squares : shapeKey(lit) === shapeKey(p.goal.shape);
	for (const rm of comb(p.start, k)) {
		const base = p.start.filter((e) => !rm.includes(e));
		for (const ad of comb(unlit, k)) if (ok(new Set([...base, ...ad]))) return true;
	}
	return false;
}

describe('그림 성냥 문제', () => {
	it('id가 겹치지 않는다', () => {
		expect(new Set(GRID_PUZZLES.map((p) => p.id)).size).toBe(GRID_PUZZLES.length);
	});
	for (const p of GRID_PUZZLES) {
		it(`${p.id} — 판 안, 시작은 정답 아님, 정답 보기는 정확히 ${p.moves}개 옮긴 정답, 더 적게는 안 풀림`, () => {
			const E = new Set(gridEdges(p.w, p.h));
			for (const e of [...p.start, ...p.answer]) expect(E.has(e), e).toBe(true);
			expect(judgeGrid(p, new Set(p.start))).toBe('more');
			expect(judgeGrid(p, new Set(p.answer))).toBe('solved');
			for (let k = 1; k < p.moves; k++) expect(solvableWith(p, k), `${k}개`).toBe(false);
		});
	}
	it('정사각형 문제의 지문 숫자가 실제 시작 개수와 같다', () => {
		for (const p of GRID_PUZZLES) {
			if (!('squares' in p.goal)) continue;
			const from = countSquares(new Set(p.start), p.w, p.h);
			expect(p.ask, p.id).toContain(`정사각형 ${from}개를 ${p.goal.squares}개로`);
		}
	});
});

describe('판정', () => {
	const dog = GRID_PUZZLES.find((p) => p.id === 'dog')!;
	it('덜 옮겼으면 계속, 더 옮겼으면 오답', () => {
		const lit = new Set(dog.start);
		lit.delete('h,0,0');
		expect(judgeGrid(dog, lit)).toBe('more');
		lit.add('h,4,2');
		expect(judgeGrid(dog, lit)).toBe('wrong');
	});
	it('모양은 평행이동만 같게 본다 — 시작 그림을 그대로 옮겨 놓아도 오답', () => {
		expect(shapeKey(['h,1,1', 'v,1,1'])).toBe(shapeKey(['h,3,2', 'v,3,2']));
		expect(shapeKey(['h,0,0', 'v,1,0'])).not.toBe(shapeKey(['h,0,0', 'v,0,0']));
	});
	it('정사각형 — 크기 상관없이 세고, 남는 성냥이 있으면 -1', () => {
		const two = GRID_PUZZLES.find((p) => p.id === 'sq-2x2')!;
		expect(countSquares(new Set(two.start), 4, 4)).toBe(5);
		expect(countSquares(new Set([...two.start, 'h,0,0']), 4, 4)).toBe(-1);
	});
});
