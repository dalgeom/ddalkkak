import { CHOSUNG_STAGES } from '$lib/chosungStages';

export const prerender = true;

export function load() {
	return { stages: CHOSUNG_STAGES.map(({ key, tier, inTier }) => ({ key, tier, inTier })) };
}
