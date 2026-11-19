import { describe, it, expect } from 'vitest';
import { target, startBoard, lineSums, duplicates, isSolved } from './magicSquare';

const LO_SHU = [2, 7, 6, 9, 5, 1, 4, 3, 8];
const S4 = [16, 2, 3, 13, 5, 11, 10, 8, 9, 7, 6, 12, 4, 14, 15, 1];
const S5 = [17, 24, 1, 8, 15, 23, 5, 7, 14, 16, 4, 6, 13, 20, 22, 10, 12, 19, 21, 3, 11, 18, 25, 2, 9];

describe('마방진 판', () => {
	it('목표 합은 15 · 34 · 65', () => {
		expect([3, 4, 5].map(target)).toEqual([15, 34, 65]);
	});

	it('정답은 완성으로 본다', () => {
		expect(isSolved(LO_SHU, 3)).toBe(true);
		expect(isSolved(S4, 4)).toBe(true);
		expect(isSolved(S5, 5)).toBe(true);
	});

	it('두 칸을 맞바꾸면 완성이 아니다 (양성 대조)', () => {
		const b = [...LO_SHU];
		[b[0], b[1]] = [b[1], b[0]];
		expect(isSolved(b, 3)).toBe(false);
	});

	it('줄 합은 같아도 같은 수가 두 번이면 완성이 아니다', () => {
		expect(isSolved([5, 5, 5, 5, 5, 5, 5, 5, 5], 3)).toBe(false);
		expect(duplicates([5, 5, 1, 0, 0])).toEqual(new Set([5]));
	});

	it('빈칸이 있는 줄의 합은 null', () => {
		const s = lineSums([2, 7, 0, 9, 5, 1, 4, 3, 8], 3);
		expect(s.rows).toEqual([null, 15, 15]);
		expect(s.cols).toEqual([15, 15, null]);
		expect(s.diag).toBe(15);
		expect(s.anti).toBe(null);
	});

	it('처음 판: 3×3 빈 판, 4×4 대각선 8칸 비움, 5×5 1~10만 둠', () => {
		expect(startBoard(3).every((v) => v === 0)).toBe(true);
		const b4 = startBoard(4);
		expect(b4.filter((v) => v === 0)).toHaveLength(8);
		expect(b4.filter(Boolean).sort((a, b) => a - b)).toEqual([2, 3, 5, 8, 9, 12, 14, 15]);
		const b5 = startBoard(5);
		expect(b5.filter(Boolean).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(isSolved(b4, 4)).toBe(false);
	});
});
