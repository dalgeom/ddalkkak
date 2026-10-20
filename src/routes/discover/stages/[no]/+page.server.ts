import { error } from '@sveltejs/kit';
import { DISCOVER_STAGES, discoverStageProblems } from '$lib/discoverStages';
import type { EntryGenerator } from './$types';

// 판마다 고정 5문제라 미리 그려 둔다(74쪽)
export const prerender = true;
export const entries: EntryGenerator = () => DISCOVER_STAGES.map((s) => ({ no: String(s.no) }));

export function load({ params }) {
	const no = Number(params.no);
	const st = DISCOVER_STAGES[no - 1];
	const problems = discoverStageProblems(no);
	if (!st || !problems) error(404, 'Not found');
	return {
		no,
		tier: st.tier,
		inTier: st.inTier,
		total: DISCOVER_STAGES.length,
		stages: DISCOVER_STAGES.map(({ no, tier, inTier }) => ({ no, tier, inTier })),
		problems
	};
}
