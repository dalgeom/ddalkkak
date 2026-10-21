import { error } from '@sveltejs/kit';
import { CHOSUNG_STAGES, chosungStageWords } from '$lib/chosungStages';
import type { EntryGenerator } from './$types';

// 판 주소는 「단계-번째」(1-3 = 새싹 3판) — 새 판이 붙어도 주소가 안 밀린다(stages.ts)
export const prerender = true;
export const entries: EntryGenerator = () => CHOSUNG_STAGES.map((s) => ({ key: s.key }));

export function load({ params }) {
	const st = CHOSUNG_STAGES.find((s) => s.key === params.key);
	const words = chosungStageWords(params.key);
	if (!st || !words) error(404, 'Not found');
	return { key: st.key, tier: st.tier, inTier: st.inTier, stages: CHOSUNG_STAGES.map(({ key, tier, inTier }) => ({ key, tier, inTier })), words };
}
