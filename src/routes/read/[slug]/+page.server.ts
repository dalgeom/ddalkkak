import { error } from '@sveltejs/kit';
import { ARTICLES, articleBySlug } from '$lib/articles';
import type { EntryGenerator } from './$types';

// 글은 빌드에 박혀 있으니 요청마다 다시 만들 이유가 없다.
export const prerender = true;

export const entries: EntryGenerator = () => ARTICLES.map((a) => ({ slug: a.slug }));

export function load({ params }) {
	const article = articleBySlug(params.slug);
	if (!article) error(404, '없는 글입니다');

	const others = ARTICLES.filter((a) => a.slug !== article.slug).map(
		({ slug, title, tag }) => ({ slug, title, tag })
	);
	return { article, others };
}
