import { error } from '@sveltejs/kit';
import PROBLEMS from '$lib/data/matchstick-problems.json';
import { MATCH_KINDS, matchKindBySlug, kindOf } from '$lib/matchstickKinds';
import type { EntryGenerator } from './$types';

// 문제 데이터는 빌드에 박혀 있으니 요청마다 다시 만들 이유가 없다.
export const prerender = true;

export const entries: EntryGenerator = () => MATCH_KINDS.map((k) => ({ slug: k.slug }));

export function load({ params }) {
	const meta = matchKindBySlug(params.slug);
	if (!meta) error(404, '없는 유형입니다');

	// 전량을 페이지로 내리지 않는다. 대표는 meta.featured에 있고, 여기서는 개수만 센다.
	const count = PROBLEMS.filter((p) => kindOf(p.displayed, p.solution) === meta.kind).length;

	const others = MATCH_KINDS.filter((k) => k.slug !== meta.slug).map((k) => ({
		...k,
		count: PROBLEMS.filter((p) => kindOf(p.displayed, p.solution) === k.kind).length
	}));

	return { meta, count, others, total: PROBLEMS.length };
}
