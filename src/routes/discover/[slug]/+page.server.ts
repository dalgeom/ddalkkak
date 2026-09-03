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

	const all = PROBLEMS.filter((p) => fieldOfChip(p.chip) === field.name);

	/**
	 * 전 문제를 늘어놓던 것을 걷고 대표만 싣는다.
	 *
	 * 59개를 details로 접어 둬도 크롤러에게는 그냥 목록이다. 성냥개비 741개를 늘어놨다가
	 * 애드센스가 「가치가 별로 없는 콘텐츠」로 두 번 반려했고, 8/24에 대표 10개 + 「왜」로
	 * 바꿨다(matchstickKinds.ts 참조). 나머지는 무한 연습이 맡는다.
	 *
	 * 없는 id를 적으면 빌드가 여기서 죽는다. 프리렌더라 배포 전에 걸린다.
	 */
	const items = field.featured.map(({ id, why }) => {
		const p = all.find((x) => x.id === id);
		if (!p) throw new Error(`${field.slug}의 featured에 없는 id: ${id}`);
		return { problem: p, why };
	});

	// 그 분야 안에서 어떤 세부 유형이 많은지 — 페이지마다 다른 내용이 되고, 목차 노릇도 한다
	// 세부 유형 집계는 대표가 아니라 그 분야 전체를 보여준다
	const chips = [...new Set(all.map((p) => p.chip))]
		.map((chip) => ({ chip, count: all.filter((p) => p.chip === chip).length }))
		.sort((a, b) => b.count - a.count || a.chip.localeCompare(b.chip));

	const others = DISCOVER_FIELD_META.filter((f) => f.slug !== field.slug).map((f) => ({
		...f,
		count: PROBLEMS.filter((p) => fieldOfChip(p.chip) === f.name).length
	}));

	return { field, items, count: all.length, chips, others, total: PROBLEMS.length };
}
