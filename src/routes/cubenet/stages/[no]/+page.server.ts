import { error } from '@sveltejs/kit';
import { CUBE_STAGES } from '$lib/cubeStages';
import { problemAt } from '$lib/cubenet';
import type { EntryGenerator } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => CUBE_STAGES.map((s) => ({ no: String(s.no) }));

export function load({ params }) {
	const no = Number(params.no);
	const st = CUBE_STAGES[no - 1];
	if (!st) error(404, 'Not found');
	return {
		no,
		tier: st.tier,
		inTier: st.inTier,
		stages: CUBE_STAGES.map(({ no, tier, inTier }) => ({ no, tier, inTier })),
		problems: st.indices.map((i) => problemAt(i))
	};
}
