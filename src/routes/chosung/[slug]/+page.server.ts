import { error } from '@sveltejs/kit';
import { CHOSUNG_CATEGORIES } from '$lib/data/chosung';
import { CHOSUNG_WORDS, categoryBySlug, chosungOf, collisionsOf } from '$lib/chosung';
import type { EntryGenerator } from './$types';

// 낱말은 빌드에 박혀 있으니 요청마다 다시 만들 이유가 없다.
export const prerender = true;

export const entries: EntryGenerator = () => CHOSUNG_CATEGORIES.map((c) => ({ slug: c.slug }));

export function load({ params }) {
	const c = categoryBySlug(params.slug);
	if (!c) error(404, '없는 분야입니다');

	// 대표만 싣는다 — 전부 늘어놓은 목록은 애드센스가 「가치가 별로 없는 콘텐츠」로 반려했다
	// (matchstickKinds.ts 참조). 나머지는 게임 화면이 맡는다.
	const items = c.featured.map((w) => {
		const x = CHOSUNG_WORDS.find((y) => y.category === c.slug && y.word === w);
		if (!x) throw new Error(`${c.slug}의 featured에 없는 낱말: ${w}`);
		return { cho: chosungOf(x.word), word: x.word, hint: x.hint };
	});

	// 글자 수 구성 — 분야마다 다르다(사자성어는 전부 넷)
	const byLen = new Map<number, number>();
	for (const [w] of c.words) byLen.set(w.length, (byLen.get(w.length) ?? 0) + 1);
	const lengths = [...byLen].sort((a, b) => a[0] - b[0]).map(([len, count]) => ({ len, count }));

	// 링크에 쓰는 값만 보낸다 — 분야 객체를 통째로 실으면 남의 분야 낱말·본문이 모든 페이지에
	// 직렬화된다(trivia/[slug] 주석, 2026-09-28).
	const others = CHOSUNG_CATEGORIES.filter((x) => x.slug !== c.slug).map((x) => ({
		slug: x.slug,
		title: x.title,
		count: x.words.length
	}));

	return {
		category: { slug: c.slug, name: c.name, title: c.title, intro: c.intro, deepDive: c.deepDive, guide: c.guide },
		count: c.words.length,
		items,
		lengths,
		collisions: collisionsOf(c.slug),
		others
	};
}
