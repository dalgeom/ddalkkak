import { error } from '@sveltejs/kit';
import { CHOSUNG_STAGES, chosungStageWords } from '$lib/chosungStages';
import type { EntryGenerator } from './$types';

export const prerender = true;
export const entries: EntryGenerator = () => CHOSUNG_STAGES.map((s) => ({ no: String(s.no) }));

export function load({ params }) {
	const no = Number(params.no);
	const st = CHOSUNG_STAGES[no - 1];
	const words = chosungStageWords(no);
	if (!st || !words) error(404, 'Not found');
	return { no, tier: st.tier, inTier: st.inTier, stages: CHOSUNG_STAGES.map(({ no, tier, inTier }) => ({ no, tier, inTier })), words };
}
