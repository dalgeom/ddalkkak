import { describe, it, expect } from 'vitest';
import { TRIVIA_CATEGORIES } from './triviaCategories';
import { DISCOVER_FIELD_META } from './discoverFields';
import { TRIVIA } from './trivia';
import { PROBLEMS, fieldOfChip } from './problems';

/**
 * 분야 글에 적은 「전체 N문제 중」이 제목의 실제 수와 어긋나지 않게 한다.
 *
 * 2026-09-30 실측: 한국사 제목 39문제 · 본문 「34문제 중」, 수·연산 62 · 「58개 가운데」 등
 * 다섯 곳. 문제를 추가할 때마다 본문 숫자만 옛날에 머물렀다. 전체 수는 {n}으로 적고
 * 서버 로드가 채운다(trivia·discover [slug]/+page.server.ts).
 *
 * 「N문제 중」의 N이 실제 수와 10 이내로 가까운데 다르면 옛 전체 수로 본다. 부분 집합
 * (「인물 문제 19개 가운데」「클럽이 {n}개 중 29개」)은 실제 수보다 훨씬 작아 걸리지 않는다.
 */
const COUNT = /(\d+)\s*(?:문제|개)\s*(?:중|가운데)/g;

function stale(texts: string[], actual: number): string[] {
	return texts.flatMap((t) =>
		[...t.matchAll(COUNT)]
			.filter((m) => Number(m[1]) !== actual && Number(m[1]) > actual - 10)
			.map((m) => m[0])
	);
}

describe('분야 글의 전체 문제 수', () => {
	it('상식 분야', () => {
		for (const c of TRIVIA_CATEGORIES) {
			const n = TRIVIA.filter((t) => t.category === c.name).length;
			const texts = [c.intro, c.desc, c.deepDive, ...c.featured.map((f) => f.why)];
			expect(stale(texts, n), `${c.slug} 실제 ${n}`).toEqual([]);
		}
	});

	it('발견형 분야', () => {
		for (const f of DISCOVER_FIELD_META) {
			const n = PROBLEMS.filter((p) => fieldOfChip(p.chip) === f.name).length;
			const texts = [f.intro, f.desc, f.deepDive, ...f.featured.map((x) => x.why)];
			expect(stale(texts, n), `${f.slug} 실제 ${n}`).toEqual([]);
		}
	});

	// 양성 대조 — 9/30에 실제로 있던 어긋남을 넣으면 잡혀야 한다
	it('옛 전체 수를 잡는다', () => {
		expect(stale(['한국사 34문제 중 연도를 묻는 것이 9개'], 39)).toEqual(['34문제 중']);
		expect(stale(['인물 문제 19개 가운데 몇은'], 39)).toEqual([]);
	});
});
