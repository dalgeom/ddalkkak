import { error } from '@sveltejs/kit';
import { TRIVIA_STAGES, stageQuestions } from '$lib/triviaStages';
import type { EntryGenerator } from './$types';

// 판마다 고정 5문제라 미리 그려 둔다. 주소는 「단계-번째」(3-5 = 보통 5판) — 새 판이 붙어도 안 밀린다(stages.ts)
export const prerender = true;
export const entries: EntryGenerator = () => TRIVIA_STAGES.map((s) => ({ key: s.key }));

export function load({ params }) {
	const st = TRIVIA_STAGES.find((s) => s.key === params.key);
	const questions = stageQuestions(params.key);
	if (!st || !questions) error(404, 'Not found');
	return {
		key: st.key,
		tier: st.tier,
		inTier: st.inTier,
		stages: TRIVIA_STAGES.map(({ key, tier, inTier }) => ({ key, tier, inTier })),
		questions
	};
}
