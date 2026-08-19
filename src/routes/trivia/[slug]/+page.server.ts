import { error } from '@sveltejs/kit';
import { TRIVIA } from '$lib/trivia';
import { displayChoices } from '$lib/game';
import { categoryBySlug, TRIVIA_CATEGORIES } from '$lib/triviaCategories';
import type { Grade } from '$lib/problems';
import type { EntryGenerator } from './$types';

// 문제 데이터는 빌드에 박혀 있으니 요청마다 다시 만들 이유가 없다.
export const prerender = true;

export const entries: EntryGenerator = () => TRIVIA_CATEGORIES.map((c) => ({ slug: c.slug }));

const GRADE_ORDER: Grade[] = ['초등', '중등', '고등', '어른'];

export function load({ params }) {
	const category = categoryBySlug(params.slug);
	if (!category) error(404, '없는 분야입니다');

	const items = TRIVIA.filter((t) => t.category === category.name)
		.sort((a, b) => GRADE_ORDER.indexOf(a.grade!) - GRADE_ORDER.indexOf(b.grade!))
		.map((raw) => {
			// 게임 화면과 같은 시드 셔플을 태운다. 원본 순서 그대로 내보내면 정답의 74%가
			// 첫 보기라, 공개된 문제지가 "답은 늘 A"로 보인다.
			const t = displayChoices(raw);
			return {
				id: t.id,
				grade: t.grade ?? '',
				question: t.blocks[0]?.kind === 'text' ? t.blocks[0].html : '',
				choices: t.choices ?? [],
				// 객관식은 보기 중 하나, 주관식은 대표 답안 하나만 보여준다
				answer: t.type === 'choice' ? (t.choices?.[t.answerIndex ?? 0] ?? '') : (t.answers?.[0] ?? ''),
				explain: t.explain
			};
		});

	const byGrade = GRADE_ORDER.map((g) => ({
		name: g,
		count: items.filter((i) => i.grade === g).length
	})).filter((g) => g.count > 0);

	// 다른 분야로 넘어갈 수 있게 — 문제 수가 많은 순으로
	const others = TRIVIA_CATEGORIES.filter((c) => c.slug !== category.slug)
		.map((c) => ({ ...c, count: TRIVIA.filter((t) => t.category === c.name).length }))
		.sort((a, b) => b.count - a.count);

	return { category, items, byGrade, others, total: TRIVIA.length };
}
