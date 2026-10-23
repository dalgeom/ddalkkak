import { describe, it, expect } from 'vitest';
import { CHOSUNG_STAGES, chosungStageWords } from './chosungStages';
import { CHOSUNG_TIERS } from './chosungTiers';
import { CHOSUNG_WORDS } from './chosung';
import { CUBE_STAGES, cubeTier, netShape } from './cubeStages';
import { problemAt } from './cubenet';
import { STAGE_SIZE } from './stages';

describe('초성 단계', () => {
	it('낱말 324개 전부에 단계가 있다', () => {
		expect(CHOSUNG_WORDS.slice(0, 324).filter((w) => !CHOSUNG_TIERS[w.word]).map((w) => w.word)).toEqual([]);
	});
	it('판마다 5낱말, 그 단계(고수는 어려움에), 겹침 없음, 구성 고정', () => {
		const all = CHOSUNG_STAGES.flatMap((s) => s.ids);
		expect(new Set(all).size).toBe(all.length);
		for (const s of CHOSUNG_STAGES) {
			expect(s.ids).toHaveLength(STAGE_SIZE);
			for (const w of s.ids) expect(Math.min(CHOSUNG_TIERS[w], 4), w).toBe(s.tier);
		}
		expect([1, 2, 3, 4].map((t) => CHOSUNG_STAGES.filter((s) => s.tier === t).length)).toMatchInlineSnapshot(`
			[
			  10,
			  24,
			  24,
			  9,
			]
		`);
		expect(CHOSUNG_STAGES[0].ids).toMatchInlineSnapshot(`
			[
			  "딸기",
			  "짜장면",
			  "펭귄",
			  "바나나",
			  "캥거루",
			]
		`);
		expect(chosungStageWords('1-1')).toHaveLength(5);
		expect(chosungStageWords('9-9')).toBeNull();
	});
});

describe('전개도 단계', () => {
	it('십자(1-4-1)는 쉬움, 나머지는 보통', () => {
		for (let i = 0; i < 50; i++) {
			const p = problemAt(i);
			expect(cubeTier(p), `${i} ${netShape(p)}`).toBe(netShape(p) === '1-4-1' ? 2 : 3);
		}
	});
	it('쉬움 30판 · 보통 40판(10/21 12 · 12에서 늘림), 판의 문제는 그 단계, 겹침 없음, 구성 고정', () => {
		expect(CUBE_STAGES.map((s) => s.tier).filter((t) => t === 2).length).toBe(30);
		expect(CUBE_STAGES.map((s) => s.tier).filter((t) => t === 3).length).toBe(40);
		const all = CUBE_STAGES.flatMap((s) => s.ids);
		expect(new Set(all).size).toBe(all.length);
		for (const s of CUBE_STAGES) for (const i of s.ids) expect(cubeTier(problemAt(i))).toBe(s.tier);
		expect(CUBE_STAGES[0].ids).toMatchInlineSnapshot(`
			[
			  281,
			  341,
			  113,
			  170,
			  479,
			]
		`);
	});
});
