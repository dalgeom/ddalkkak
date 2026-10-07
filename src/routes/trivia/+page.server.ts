import { TRIVIA } from '$lib/trivia';
import { displayChoices } from '$lib/game';
import { categoryByName } from '$lib/triviaCategories';

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
		.map(([name, count]) => ({ name, count, slug: categoryByName(name)?.slug ?? '' }));
	const grades = GRADE_ORDER.map((g) => ({ name: g, count: byGrade[g] ?? 0 }));

	// 난이도별 맛보기 — 고정 표본(객관식만), 난이도마다 분야가 겹치지 않게 SAMPLES_PER_GRADE개씩.
	// 10/07에 1개 → 5개로 늘렸다. 네이버 「상식퀴즈」 월 20,940인데 모바일 1쪽은 전부 문제를 줄줄이
	// 푸는 쪽이었고, 이 쪽은 제목에 「상식 퀴즈 471문제」라 써 놓고 문제를 넷만 보여 줬다.
	const SAMPLES_PER_GRADE = 5;
	const picked = GRADE_ORDER.flatMap((g) => {
		const seen = new Set<string>();
		const out: (typeof TRIVIA)[number][] = [];
		for (const t of TRIVIA) {
			if (out.length >= SAMPLES_PER_GRADE) break;
			if (t.grade !== g || t.type !== 'choice' || seen.has(t.category ?? '')) continue;
			seen.add(t.category ?? '');
			out.push(t);
		}
		return out;
	});
	const samples = picked
		.map((raw) => {
			const t = displayChoices(raw!); // 게임 화면과 같은 시드 셔플 — 정답이 첫 보기에 몰려 보이지 않게
			return {
				id: t.id,
				category: t.category ?? '',
				grade: t.grade ?? '',
				question: t.blocks[0]?.kind === 'text' ? t.blocks[0].html : '',
				choices: t.choices ?? [],
				answer: t.choices?.[t.answerIndex ?? 0] ?? '',
				explain: t.explain
			};
		});

	return { total: TRIVIA.length, categories, grades, samples };
}
