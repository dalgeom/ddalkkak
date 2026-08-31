import { TRIVIA } from '$lib/trivia';
import { TRIVIA_CATEGORIES } from '$lib/triviaCategories';
import { ARTICLES } from '$lib/articles';
import { kstDayNumber } from '$lib/game';

/** 분야별 문제 모음으로 가는 입구. 홈에서 한 번에 닿아야 사람도 크롤러도 찾아간다. */
const CATEGORY_LINKS = TRIVIA_CATEGORIES.map((c) => ({
	slug: c.slug,
	name: c.name,
	count: TRIVIA.filter((t) => t.category === c.name).length
})).sort((a, b) => b.count - a.count);

// 홈의 '오늘'은 요청 시점에 계산해야 한다. prerender 하면 빌드 시점 날짜가 정적 HTML에
// 박혀, 크롤러와 hydration 전 사용자가 매번 1970-01-01 + day-0 문제를 보는 FOUC가 생긴다.
export const prerender = false;

export function load() {
	const dayNum = kstDayNumber(Date.now());

	// 홈에 최신 글 셋을 실어 둔다. 읽을거리가 푸터 링크 하나로만 닿아 있으면 사람도
	// 크롤러도 사이트에 글이 있다는 걸 모른다.
	const latest = [...ARTICLES]
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, 3)
		.map((a) => ({ slug: a.slug, title: a.title, description: a.description, date: a.date, tag: a.tag }));

	return { dayNum, categories: CATEGORY_LINKS, latest };
}
