import { describe, it, expect } from 'vitest';
import { MATCH_KINDS, matchKindBySlug, kindOf } from './matchstickKinds';
import { parseEq, isSolved } from './matchstick';
import { MATCH_TOTAL } from './game';
import PROBLEMS from './data/matchstick-problems.json';

describe('성냥개비 유형 페이지', () => {
	it('741문제가 빠짐없이 세 유형 중 하나로 분류된다', () => {
		// 어느 페이지에도 안 실리는 문제가 생기면 그만큼 검색에서 사라진다
		const counts = { self: 0, transfer: 0, operator: 0 };
		for (const p of PROBLEMS) counts[kindOf(p.displayed, p.solution)]++;
		expect(counts.self + counts.transfer + counts.operator).toBe(MATCH_TOTAL);
		for (const k of MATCH_KINDS) expect(counts[k.kind], k.slug).toBeGreaterThan(0);
	});

	it('분류가 실제 해법과 맞는다', () => {
		// kindOf는 보드 비교로 판정한다. 그 전제 — 정답이 정말 성냥 하나를 옮긴 것 — 을 확인한다.
		for (const p of PROBLEMS) {
			expect(isSolved(parseEq(p.displayed), parseEq(p.solution)), p.displayed).toBe(true);
		}
	});

	it('self는 숫자 하나만, transfer는 둘이 바뀐다', () => {
		for (const p of PROBLEMS) {
			const k = kindOf(p.displayed, p.solution);
			const a = parseEq(p.displayed);
			const b = parseEq(p.solution);
			const changed = a.glyphs.filter((g, i) => g !== b.glyphs[i]).length;
			if (k === 'self') expect(changed, p.displayed).toBe(1);
			if (k === 'transfer') expect(changed, p.displayed).toBe(2);
			if (k === 'operator') expect(a.opPlus === b.opPlus, p.displayed).toBe(false);
		}
	});

	it('대표 예시가 데이터에 실제로 있고 그 유형이다', () => {
		// 예시를 손으로 적었으니 데이터가 바뀌면 여기서 걸려야 한다
		for (const k of MATCH_KINDS) {
			const found = PROBLEMS.find((p) => p.displayed === k.example.displayed);
			expect(found, k.example.displayed).toBeDefined();
			expect(found!.solution, k.example.displayed).toBe(k.example.solution);
			expect(kindOf(k.example.displayed, k.example.solution), k.slug).toBe(k.kind);
		}
	});

	it('슬러그가 중복되지 않고 guide와 겹치지 않는다', () => {
		const slugs = MATCH_KINDS.map((k) => k.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		// /matchstick/guide가 이미 있다 — 슬러그가 같으면 가이드가 가려진다
		expect(slugs).not.toContain('guide');
		for (const s of slugs) expect(/^[a-z][a-z-]*[a-z]$/.test(s), s).toBe(true);
	});

	it('유형마다 다른 소개글과 요령을 쓴다 (복제 페이지로 보이지 않게)', () => {
		const intros = MATCH_KINDS.map((k) => k.intro);
		expect(new Set(intros).size).toBe(intros.length);
		for (const k of MATCH_KINDS) {
			expect(k.intro.length, k.slug).toBeGreaterThan(40);
			expect(k.how.length, k.slug).toBeGreaterThanOrEqual(2);
			for (const h of k.how) expect(h.length, k.slug).toBeGreaterThan(40);
		}
	});

	it('슬러그로 되찾을 수 있다', () => {
		for (const k of MATCH_KINDS) expect(matchKindBySlug(k.slug)).toBe(k);
		expect(matchKindBySlug('없는유형')).toBeUndefined();
	});
});
