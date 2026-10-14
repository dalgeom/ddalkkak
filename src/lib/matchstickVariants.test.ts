import { describe, it, expect } from 'vitest';
import { parseEq, isTrue, moveDiff, RULE_DIFF, type MatchRule } from './matchstick';
import V from './data/matchstick-variants.json';

/** 생성기(scripts/matchstick-variants.mjs, JS)와 다른 길(TS 엔진)로 「정답이 정확히 하나」를 다시 센다 */
const TRUE: string[] = [];
for (let a = 0; a <= 9; a++)
	for (let b = 0; b <= 9; b++)
		for (const op of ['+', '-'])
			for (let c = 0; c <= 19; c++) if ((op === '+' ? a + b : a - b) === c) TRUE.push(`${a} ${op} ${b} = ${c}`);

function hits(displayed: string, rule: MatchRule): string[] {
	const o = parseEq(displayed);
	const need = RULE_DIFF[rule];
	return TRUE.filter((t) => {
		const b = parseEq(t);
		if (b.cLen !== o.cLen) return false;
		const d = moveDiff(o, b);
		return d.removed === need.removed && d.added === need.added;
	});
}

describe('matchstick-variants.json', () => {
	for (const rule of ['move2', 'remove1', 'add1'] as const) {
		it(`${rule} — 표시식은 거짓, 그 규칙의 답은 정확히 하나, 1개 옮기기로는 안 풀린다`, () => {
			const list = (V as Record<string, { displayed: string; solution: string }[]>)[rule];
			expect(list.length).toBeGreaterThan(100);
			for (const p of list) {
				expect(isTrue(parseEq(p.displayed)), p.displayed).toBe(false);
				expect(hits(p.displayed, rule), p.displayed).toEqual([p.solution]);
				expect(hits(p.displayed, 'move1'), p.displayed).toEqual([]);
			}
		});
	}
});
