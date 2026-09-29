import { describe, it, expect } from 'vitest';
import { MATCH_LEVELS, levelOf, matchLevelBySlug } from './matchstickLevels';
import { MATCH_KINDS } from './matchstickKinds';
import PROBLEMS from './data/matchstick-problems.json';

describe('성냥개비 난이도 페이지', () => {
	it('기준대로 나누면 쉬움 195 · 어려움 160', () => {
		const n = { easy: 0, hard: 0 };
		for (const p of PROBLEMS) {
			const l = levelOf(p.displayed, p.solution);
			if (l) n[l]++;
		}
		expect(n).toEqual({ easy: 195, hard: 160 });
	});

	it('어려움 소개글의 「160개 중 96개가 답을 바꾼다」가 데이터와 맞다', () => {
		let touched = 0;
		for (const p of PROBLEMS) {
			if (levelOf(p.displayed, p.solution) !== 'hard') continue;
			const a = p.displayed.split('=')[1].trim();
			const b = p.solution.split('=')[1].trim();
			if (a !== b) touched++;
		}
		expect(touched).toBe(96);
	});

	it('대표 예시·문제가 데이터에 있고 그 난이도다', () => {
		for (const l of MATCH_LEVELS) {
			for (const f of [l.example, ...l.featured]) {
				const found = PROBLEMS.find((p) => p.displayed === f.displayed);
				expect(found, `${l.slug}: ${f.displayed}`).toBeDefined();
				expect(found!.solution, `${l.slug}: ${f.displayed}`).toBe(f.solution);
				expect(levelOf(f.displayed, f.solution), `${l.slug}: ${f.displayed}`).toBe(l.level);
			}
		}
	});

	it('대표 문제가 서로 다른 변환이고, 유형 페이지 대표와 겹치지 않는다', () => {
		const kindEqs = new Set(MATCH_KINDS.flatMap((k) => k.featured.map((f) => f.displayed)));
		for (const l of MATCH_LEVELS) {
			expect(l.featured.length, l.slug).toBe(10);
			expect(new Set(l.featured.map((f) => f.change)).size, l.slug).toBe(10);
			for (const f of l.featured) expect(kindEqs.has(f.displayed), `${l.slug}: ${f.displayed}`).toBe(false);
		}
	});

	it('슬러그가 유형·guide와 겹치지 않고 되찾을 수 있다', () => {
		const kindSlugs = MATCH_KINDS.map((k) => k.slug);
		for (const l of MATCH_LEVELS) {
			expect(kindSlugs).not.toContain(l.slug);
			expect(l.slug).not.toBe('guide');
			expect(matchLevelBySlug(l.slug)).toBe(l);
		}
	});
});
