import { error } from '@sveltejs/kit';
import { CUBE_STAGES } from '$lib/cubeStages';
import { problemAt } from '$lib/cubenet';
import type { EntryGenerator } from './$types';

// 판 주소는 「단계-번째」(2-3 = 쉬움 3판) — 새 판이 붙어도 주소가 안 밀린다(stages.ts)
export const prerender = true;
export const entries: EntryGenerator = () => CUBE_STAGES.map((s) => ({ key: s.key }));

export function load({ params }) {
	const st = CUBE_STAGES.find((s) => s.key === params.key);
	if (!st) error(404, 'Not found');
	return {
		key: st.key,
		tier: st.tier,
		inTier: st.inTier,
		stages: CUBE_STAGES.map(({ key, tier, inTier }) => ({ key, tier, inTier })),
		problems: st.ids.map((i) => problemAt(i))
	};
}
