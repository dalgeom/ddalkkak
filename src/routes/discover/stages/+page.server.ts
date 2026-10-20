import { DISCOVER_STAGES } from '$lib/discoverStages';

// 지도는 판 번호 · 단계만 내린다(문제는 판 화면이 5개씩 받는다)
export const prerender = true;

export function load() {
	return { stages: DISCOVER_STAGES.map(({ no, tier, inTier }) => ({ no, tier, inTier })) };
}
