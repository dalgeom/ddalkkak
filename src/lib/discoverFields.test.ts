import { describe, it, expect } from 'vitest';
import { DISCOVER_FIELD_META, fieldMetaBySlug, fieldMetaByName } from './discoverFields';
import { PROBLEMS, DISCOVER_FIELDS, fieldOfChip } from './problems';

describe('발견형 분야 페이지', () => {
	it('DISCOVER_FIELDS의 모든 분야에 페이지가 있다', () => {
		// 분야를 추가하고 슬러그를 안 만들면 그 문제들이 검색에서 사라진다
		for (const f of DISCOVER_FIELDS) {
			expect(fieldMetaByName(f), f).toBeDefined();
		}
		expect(DISCOVER_FIELD_META.length).toBe(DISCOVER_FIELDS.length);
	});

	it('문제가 하나도 없는 분야 페이지는 없다', () => {
		for (const f of DISCOVER_FIELD_META) {
			const n = PROBLEMS.filter((p) => fieldOfChip(p.chip) === f.name).length;
			expect(n, f.name).toBeGreaterThan(0);
		}
	});

	it('모든 문제가 어떤 분야 페이지엔가 실린다', () => {
		// 여섯 페이지의 합이 전체와 같아야 빠지는 문제가 없다
		const sum = DISCOVER_FIELD_META.reduce(
			(acc, f) => acc + PROBLEMS.filter((p) => fieldOfChip(p.chip) === f.name).length,
			0
		);
		expect(sum).toBe(PROBLEMS.length);
	});

	it('슬러그가 중복되지 않고 URL에 그대로 쓸 수 있다', () => {
		const slugs = DISCOVER_FIELD_META.map((f) => f.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const s of slugs) expect(/^[a-z][a-z-]*[a-z]$/.test(s), s).toBe(true);
	});

	it('상식 분야 슬러그와 겹치지 않는다', async () => {
		// /trivia/<slug>와 /discover/<slug>는 다른 경로라 겹쳐도 되지만,
		// 같은 이름이 두 곳을 가리키면 사람이 헷갈리고 내부 링크를 잘못 건다.
		const { TRIVIA_CATEGORIES } = await import('./triviaCategories');
		const trivia = new Set(TRIVIA_CATEGORIES.map((c) => c.slug));
		for (const f of DISCOVER_FIELD_META) expect(trivia.has(f.slug), f.slug).toBe(false);
	});

	it('분야마다 다른 소개글을 쓴다 (복제 페이지로 보이지 않게)', () => {
		const intros = DISCOVER_FIELD_META.map((f) => f.intro);
		expect(new Set(intros).size).toBe(intros.length);
		for (const f of DISCOVER_FIELD_META) expect(f.intro.length, f.name).toBeGreaterThan(40);
	});

	it('제목에 분야명을 그대로 쓰지 않는다 (검색어에 맞춘 표현)', () => {
		// '발견형 퍼즐'은 딸깍이 지어낸 말이라 아무도 검색하지 않는다
		const titles = DISCOVER_FIELD_META.map((f) => f.title);
		expect(new Set(titles).size).toBe(titles.length);
		for (const f of DISCOVER_FIELD_META) expect(f.title, f.name).not.toContain('발견형');
	});

	it('슬러그로 되찾을 수 있다', () => {
		for (const f of DISCOVER_FIELD_META) expect(fieldMetaBySlug(f.slug)).toBe(f);
		expect(fieldMetaBySlug('없는분야')).toBeUndefined();
	});
});
