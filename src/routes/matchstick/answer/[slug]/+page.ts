import { error } from '@sveltejs/kit';
import { MATCH_ANSWERS, answerBySlug, answerSlug } from '$lib/matchAnswers';
import type { EntryGenerator } from './$types';

// 식과 풀이 글이 빌드에 박혀 있다 — 검색 로봇이 답과 풀이를 HTML에서 읽게 미리 굽는다
export const prerender = true;

export const entries: EntryGenerator = () => MATCH_ANSWERS.map((a) => ({ slug: answerSlug(a.q) }));

export function load({ params }) {
	const a = answerBySlug(params.slug);
	if (!a) error(404, '없는 식입니다');
	return { q: a.q, note: a.note };
}
