import { describe, expect, it } from 'vitest';
import { firstStep, sudokuAt } from './sudoku';

describe('스도쿠 해설 첫 수', () => {
	it('첫 수는 빈칸이고 정답과 같으며, 나머지 수는 모두 같은 줄 · 묶음에 있다', () => {
		let found = 0;
		for (let day = 20700; day < 20900; day++) {
			const s = sudokuAt(day);
			const f = firstStep(s);
			if (!f) continue;
			found++;
			const n = s.size;
			expect(s.givens[f.cell]).toBe(0);
			expect(f.value).toBe(s.solution[f.cell]);
			const r = Math.floor(f.cell / n), c = f.cell % n;
			const r0 = r - (r % s.boxR), c0 = c - (c % s.boxC);
			const around = new Set<number>();
			for (let k = 0; k < n; k++) around.add(s.givens[r * n + k]).add(s.givens[k * n + c]);
			for (let y = 0; y < s.boxR; y++) for (let x = 0; x < s.boxC; x++) around.add(s.givens[(r0 + y) * n + c0 + x]);
			for (const v of f.seen) expect(around.has(v)).toBe(true);
			expect(f.seen).not.toContain(f.value);
		}
		expect(found).toBeGreaterThan(100);
	});

	it('11/26(20783) 판에는 첫 수가 있다', () => {
		expect(firstStep(sudokuAt(20783))).not.toBeNull();
	});
});
