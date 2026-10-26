import { CHOSUNG_CATEGORIES } from '$lib/data/chosung';
import { CHOSUNG_TIERS } from '$lib/chosungTiers';

// 설정 화면과 진행 요령 글은 빌드에 고정된다. 낱말 뽑기 · 진행은 브라우저에서 한다.
export const prerender = true;

export function load() {
	// 분야마다 쉬운 낱말(새싹 · 쉬움)이 몇 개인지 — 「어린이 · 어르신 모임엔 쉬움 위주」 안내에 숫자로 쓴다
	const cats = CHOSUNG_CATEGORIES.map((c) => ({
		slug: c.slug,
		name: c.name,
		count: c.words.length,
		easy: c.words.filter(([w]) => (CHOSUNG_TIERS[w] ?? 3) <= 2).length
	}));
	return { cats };
}
