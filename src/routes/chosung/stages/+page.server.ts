import { CHOSUNG_STAGES } from '$lib/chosungStages';

export const prerender = true;

export function load() {
	return { stages: CHOSUNG_STAGES.map(({ no, tier, inTier }) => ({ no, tier, inTier })) };
}
