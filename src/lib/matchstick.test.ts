import { describe, it, expect } from 'vitest';
import { parseEq, isTrue, isSolved, eqString, moveDiff } from './matchstick';
import problems from './data/matchstick-problems.json';

describe('matchstick 로직', () => {
	it('파싱과 문자열 왕복', () => {
		expect(eqString(parseEq('8 - 0 = 8'))).toBe('8 - 0 = 8');
		expect(eqString(parseEq('1 + 5 = 18'))).toBe('1 + 5 = 18');
	});

	it('등식 판정', () => {
		expect(isTrue(parseEq('8 - 0 = 8'))).toBe(true);
		expect(isTrue(parseEq('2 + 6 = 8'))).toBe(true);
		expect(isTrue(parseEq('0 + 0 = 8'))).toBe(false);
	});
});

describe('문제 은행 무결성 (741문제 전수)', () => {
	it('모든 문제: 표시식은 거짓, 해답식은 참, 정확히 성냥 하나 차이', () => {
		for (const p of problems) {
			const disp = parseEq(p.displayed);
			const sol = parseEq(p.solution);
			expect(isTrue(disp), `표시식이 참임: ${p.displayed}`).toBe(false);
			expect(isTrue(sol), `해답식이 거짓임: ${p.solution}`).toBe(true);
			const { removed, added } = moveDiff(disp, sol);
			expect(removed === 1 && added === 1, `이동량 오류: ${p.displayed} → ${p.solution}`).toBe(
				true
			);
			expect(isSolved(disp, sol), `isSolved 실패: ${p.displayed}`).toBe(true);
		}
	});
});
