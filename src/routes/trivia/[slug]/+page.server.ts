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

	const all = TRIVIA.filter((t) => t.category === category.name);

	/**
	 * 전 문제를 늘어놓던 것을 걷고 대표만 싣는다.
	 *
	 * 26문제와 해설을 통째로 내리면 어디서나 볼 수 있는 상식 퀴즈와 구분이 안 된다.
	 * 성냥개비 741개를 그렇게 늘어놨다가 애드센스가 「가치가 별로 없는 콘텐츠」로 두 번
	 * 반려했고, 8/24에 대표 10개 + 「왜」로 바꿨다(matchstickKinds.ts 참조).
	 * 나머지는 무한 연습이 맡는다 — 이 페이지가 이미 그리로 링크한다.
	 *
	 * 없는 id를 적으면 빌드가 여기서 죽는다. 프리렌더라 배포 전에 걸린다.
	 */
	const items = category.featured
		.map(({ id, why }) => {
			const raw = all.find((t) => t.id === id);
			if (!raw) throw new Error(`${category.slug}의 featured에 없는 id: ${id}`);
			return { raw, why };
		})
		.sort((a, b) => GRADE_ORDER.indexOf(a.raw.grade!) - GRADE_ORDER.indexOf(b.raw.grade!))
		.map(({ raw, why }) => {
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
				explain: t.explain,
				why
			};
		});

	// 난이도 구성은 대표가 아니라 그 분야 전체를 보여준다
	const byGrade = GRADE_ORDER.map((g) => ({
		name: g,
		count: all.filter((t) => t.grade === g).length
	})).filter((g) => g.count > 0);

	// 다른 분야로 넘어갈 수 있게 — 문제 수가 많은 순으로
	const others = TRIVIA_CATEGORIES.filter((c) => c.slug !== category.slug)
		.map((c) => ({ ...c, count: TRIVIA.filter((t) => t.category === c.name).length }))
		.sort((a, b) => b.count - a.count);

	return { category, items, count: all.length, byGrade, others, total: TRIVIA.length };
}
