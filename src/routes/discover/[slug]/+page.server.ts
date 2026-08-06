import { error } from '@sveltejs/kit';
import { PROBLEMS, fieldOfChip } from '$lib/problems';
import { DISCOVER_FIELD_META, fieldMetaBySlug } from '$lib/discoverFields';
import type { EntryGenerator } from './$types';

// 문제 데이터는 빌드에 박혀 있으니 요청마다 다시 만들 이유가 없다.
export const prerender = true;

export const entries: EntryGenerator = () => DISCOVER_FIELD_META.map((f) => ({ slug: f.slug }));

export function load({ params }) {
	const field = fieldMetaBySlug(params.slug);
	if (!field) error(404, '없는 분야입니다');

	// 문제 전체를 그대로 내린다 — ProblemView가 lcd·glyph·figure까지 렌더한다.
	const items = PROBLEMS.filter((p) => fieldOfChip(p.chip) === field.name);

	// 그 분야 안에서 어떤 세부 유형이 많은지 — 페이지마다 다른 내용이 되고, 목차 노릇도 한다
	const chips = [...new Set(items.map((p) => p.chip))]
		.map((chip) => ({ chip, count: items.filter((p) => p.chip === chip).length }))
		.sort((a, b) => b.count - a.count || a.chip.localeCompare(b.chip));

	const others = DISCOVER_FIELD_META.filter((f) => f.slug !== field.slug).map((f) => ({
		...f,
		count: PROBLEMS.filter((p) => fieldOfChip(p.chip) === f.name).length
	}));

	return { field, items, chips, others, total: PROBLEMS.length };
}
