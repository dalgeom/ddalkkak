import { ARTICLES } from '$lib/articles';

// 글은 빌드에 박혀 있으니 요청마다 다시 만들 이유가 없다.
export const prerender = true;

export function load() {
	// 목록에는 본문을 싣지 않는다 — body가 크다
	const items = ARTICLES.map(({ slug, title, description, date, tag }) => ({
		slug, title, description, date, tag
	}));
	return { items };
}
