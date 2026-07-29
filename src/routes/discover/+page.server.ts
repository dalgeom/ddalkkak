import { PROBLEMS, type Problem } from '$lib/problems';

// 발견형 소개 랜딩 — 맛보기 문제를 SSR 텍스트로 내려 크롤러가 실제 콘텐츠를 읽게 한다.
// 문제은행 전체(96KB)를 싣지 않도록 표본만 직렬화한다.
export const prerender = false;

/** 랜딩 표본 — 품질 검증을 거친 고정 3문제(텍스트·pre 블록만 쓰는 것으로 선정) */
const SAMPLE_IDS = ['month-name-yu', 'num-keypad-flip', 'club-baby-animals'];

export function load() {
	const samples = SAMPLE_IDS.map((id) => PROBLEMS.find((p) => p.id === id))
		.filter((p): p is Problem => !!p)
		.map((p) => ({
			id: p.id,
			chip: p.chip,
			blocks: p.blocks.filter((b) => b.kind === 'text' || b.kind === 'pre'),
			answer: p.answers?.[0] ?? '',
			explain: p.explain
		}));
	return { total: PROBLEMS.length, samples };
}
