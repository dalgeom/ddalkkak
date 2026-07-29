import { TRIVIA } from '$lib/trivia';

// 상식 퀴즈 소개 랜딩 — 분야·난이도 집계와 맛보기 문제를 SSR로 내린다.
export const prerender = false;

const GRADE_ORDER = ['초등', '중등', '고등', '어른'] as const;

export function load() {
	const byCategory: Record<string, number> = {};
	const byGrade: Record<string, number> = {};
	for (const t of TRIVIA) {
		byCategory[t.category ?? '기타'] = (byCategory[t.category ?? '기타'] ?? 0) + 1;
		byGrade[t.grade ?? '기타'] = (byGrade[t.grade ?? '기타'] ?? 0) + 1;
	}
	const categories = Object.entries(byCategory)
		.sort((a, b) => b[1] - a[1])
		.map(([name, count]) => ({ name, count }));
	const grades = GRADE_ORDER.map((g) => ({ name: g, count: byGrade[g] ?? 0 }));

	// 난이도별 맛보기 1문제씩 — 고정 표본(객관식만)
	const samples = GRADE_ORDER.map((g) => TRIVIA.find((t) => t.grade === g && t.type === 'choice'))
		.filter((t) => !!t)
		.map((t) => ({
			id: t!.id,
			category: t!.category ?? '',
			grade: t!.grade ?? '',
			question: t!.blocks[0]?.kind === 'text' ? t!.blocks[0].html : '',
			choices: t!.choices ?? [],
			answer: t!.choices?.[t!.answerIndex ?? 0] ?? '',
			explain: t!.explain
		}));

	return { total: TRIVIA.length, categories, grades, samples };
}
