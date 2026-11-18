import { error } from '@sveltejs/kit';
import { CHOSUNG_CATEGORIES } from '$lib/data/chosung';
import { CHOSUNG_WORDS, categoryBySlug, chosungOf, collisionsOf } from '$lib/chosung';
import type { EntryGenerator } from './$types';

// 낱말은 빌드에 박혀 있으니 요청마다 다시 만들 이유가 없다.
export const prerender = true;

const NOUN: Record<string, string> = {
	animal: '동물 이름',
	food: '음식 이름',
	'fruit-vegetable': '과일·채소 이름',
	country: '나라 이름',
	snack: '과자 이름',
	movie: '영화 제목'
};

export const entries: EntryGenerator = () => CHOSUNG_CATEGORIES.map((c) => ({ slug: c.slug }));

export function load({ params }) {
	const c = categoryBySlug(params.slug);
	if (!c) error(404, '없는 분야입니다');

	// 전부 늘어놓은 목록은 애드센스가 「가치가 별로 없는 콘텐츠」로 반려했다(matchstickKinds.ts 참조).
	// 그래서 대표 10개 + 아래 글자 수 목록(글자 수당 최대 8, 정답은 접어 둠)만 싣고 나머지는 게임 화면이 맡는다.
	const items = c.featured.map((w) => {
		const x = CHOSUNG_WORDS.find((y) => y.category === c.slug && y.word === w);
		if (!x) throw new Error(`${c.slug}의 featured에 없는 낱말: ${w}`);
		return { cho: chosungOf(x.word), word: x.word, hint: x.hint, why: c.featuredWhy[w] ?? '' };
	});

	// 글자 수 구성 — 분야마다 다르다(사자성어는 전부 넷)
	const byLen = new Map<number, number>();
	for (const [w] of c.words) byLen.set(w.length, (byLen.get(w.length) ?? 0) + 1);
	const lengths = [...byLen].sort((a, b) => a[0] - b[0]).map(([len, count]) => ({ len, count }));

	// 글자 수로 풀어 보기 — 「두글자 과일」 꼴 검색어가 클릭이 잘 났다(11/18 서치어드바이저).
	// 대표를 뺀 표본이 3개 이상인 글자 수만, 앞에서 8개. 보일 글자 수가 둘 미만이면(사자성어) 절을 뺀다.
	// 상한 8을 올리지 말 것 — 나라 · 과자 · 영화는 이미 쪽에 실리는 낱말이 절반을 넘는다.
	const rest = CHOSUNG_WORDS.filter((x) => x.category === c.slug && !c.featured.includes(x.word));
	const nums = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'];
	const lens = [...new Set(rest.map((x) => x.word.length))]
		.sort((a, b) => a - b)
		.map((len) => ({ len, all: rest.filter((x) => x.word.length === len) }))
		.filter((g) => g.all.length >= 3)
		.map((g) => ({
			len: g.len,
			label: `${nums[g.len] ?? g.len} 글자 ${NOUN[c.slug] ?? `${c.name} 이름`}`,
			words: g.all.slice(0, 8).map((x) => ({ cho: chosungOf(x.word), word: x.word, hint: x.hint }))
		}));
	const byLength = lens.length >= 2 ? lens : [];

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
		byLength,
		collisions: collisionsOf(c.slug),
		others
	};
}
