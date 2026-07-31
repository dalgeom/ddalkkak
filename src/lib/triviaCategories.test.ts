import { describe, it, expect } from 'vitest';
import { TRIVIA_CATEGORIES, categoryBySlug, categoryByName } from './triviaCategories';
import { TRIVIA } from './trivia';

describe('상식 퀴즈 분야 페이지', () => {
	it('trivia.ts의 모든 카테고리에 분야 페이지가 있다', () => {
		// 새 카테고리를 추가하고 슬러그를 안 만들면 /trivia에서 빈 링크가 생긴다
		for (const t of TRIVIA) {
			expect(categoryByName(t.category ?? ''), `${t.id}: ${t.category}`).toBeDefined();
		}
	});

	it('문제가 하나도 없는 분야 페이지는 없다', () => {
		for (const c of TRIVIA_CATEGORIES) {
			const n = TRIVIA.filter((t) => t.category === c.name).length;
			expect(n, c.name).toBeGreaterThan(0);
		}
	});

	it('슬러그가 중복되지 않고 URL에 그대로 쓸 수 있다', () => {
		const slugs = TRIVIA_CATEGORIES.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const s of slugs) expect(/^[a-z][a-z-]*[a-z]$/.test(s), s).toBe(true);
	});

	it('분야마다 다른 소개글을 쓴다 (복제 페이지로 보이지 않게)', () => {
		const intros = TRIVIA_CATEGORIES.map((c) => c.intro);
		expect(new Set(intros).size).toBe(intros.length);
		for (const c of TRIVIA_CATEGORIES) expect(c.intro.length, c.name).toBeGreaterThan(40);
	});

	it('슬러그로 되찾을 수 있다', () => {
		for (const c of TRIVIA_CATEGORIES) expect(categoryBySlug(c.slug)).toBe(c);
		expect(categoryBySlug('없는분야')).toBeUndefined();
	});
});
