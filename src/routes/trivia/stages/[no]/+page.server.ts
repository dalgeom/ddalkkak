import { error } from '@sveltejs/kit';
import { TRIVIA_STAGES, stageQuestions } from '$lib/triviaStages';
import type { EntryGenerator } from './$types';

// 판마다 고정 5문제라 미리 그려 둔다(75쪽)
export const prerender = true;
export const entries: EntryGenerator = () => TRIVIA_STAGES.map((s) => ({ no: String(s.no) }));

export function load({ params }) {
	const no = Number(params.no);
	const st = TRIVIA_STAGES[no - 1];
	const questions = stageQuestions(no);
	if (!st || !questions) error(404, 'Not found');
	return {
		no,
		tier: st.tier,
		inTier: st.inTier,
		total: TRIVIA_STAGES.length,
		stages: TRIVIA_STAGES.map(({ no, tier, inTier }) => ({ no, tier, inTier })),
		questions
	};
}
