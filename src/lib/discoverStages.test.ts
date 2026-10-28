import { describe, it, expect } from 'vitest';
import { DISCOVER_STAGES, discoverStageProblems } from './discoverStages';
import { DISCOVER_TIERS } from './discoverTiers';
import { STAGE_SIZE } from './stages';

describe('발견형 단계 도전', () => {
	it('단계마다 판, 판마다 5문제, 판의 문제는 그 단계, 겹침 없음', () => {
		const all = DISCOVER_STAGES.flatMap((s) => s.ids);
		expect(new Set(all).size).toBe(all.length);
		for (const s of DISCOVER_STAGES) {
			expect(s.ids).toHaveLength(STAGE_SIZE);
			for (const id of s.ids) expect(DISCOVER_TIERS[id], id).toBe(s.tier);
		}
		const per = [1, 2, 3, 4, 5].map((t) => DISCOVER_STAGES.filter((s) => s.tier === t).length);
		expect(per.every((n) => n > 0)).toBe(true);
		expect(new Set(DISCOVER_STAGES.map((s) => s.key)).size).toBe(DISCOVER_STAGES.length);
	});
	it('판 구성 고정(기기에 진행이 남는다)', () => {
		expect(DISCOVER_STAGES.length).toMatchInlineSnapshot(`78`); // 10/22 새싹 2 · 고수 1 추가로 74 → 75, 10/23 새싹 1 · 고수 2 추가로 76, 10/28 새싹 1 · 고수 2 추가로 78
		expect(DISCOVER_STAGES[0].ids).toMatchInlineSnapshot(`
			[
			  "cal-mirror-clock",
			  "rps-fingers",
			  "sh-closed-count",
			  "cal-clock-opposite",
			  "nm-ones-square",
			]
		`);
	});
	it('판 문제를 꺼낸다', () => {
		expect(discoverStageProblems('1-1')).toHaveLength(5);
		expect(discoverStageProblems('9-9')).toBeNull();
	});
});
