import { TRIVIA_STAGES } from '$lib/triviaStages';

// 지도는 판 번호 · 단계만 내린다 — 상식 문제 파일(약 300KB)은 서버에만 둔다(판 화면이 5문제씩 받는다)
export const prerender = true;

export function load() {
	return { stages: TRIVIA_STAGES.map(({ no, tier, inTier }) => ({ no, tier, inTier })) };
}
