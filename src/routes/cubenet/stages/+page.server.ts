import { CUBE_STAGES } from '$lib/cubeStages';

export const prerender = true;

export function load() {
	return { stages: CUBE_STAGES.map(({ no, tier, inTier }) => ({ no, tier, inTier })) };
}
