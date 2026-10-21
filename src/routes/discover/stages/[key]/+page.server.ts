import { error } from '@sveltejs/kit';
import { DISCOVER_STAGES, discoverStageProblems } from '$lib/discoverStages';
import type { EntryGenerator } from './$types';

// 판마다 고정 5문제라 미리 그려 둔다. 주소는 「단계-번째」(1-3 = 새싹 3판) — 새 판이 붙어도 안 밀린다(stages.ts)
export const prerender = true;
export const entries: EntryGenerator = () => DISCOVER_STAGES.map((s) => ({ key: s.key }));

export function load({ params }) {
	const st = DISCOVER_STAGES.find((s) => s.key === params.key);
	const problems = discoverStageProblems(params.key);
	if (!st || !problems) error(404, 'Not found');
	return {
		key: st.key,
		tier: st.tier,
		inTier: st.inTier,
		stages: DISCOVER_STAGES.map(({ key, tier, inTier }) => ({ key, tier, inTier })),
		problems
	};
}
