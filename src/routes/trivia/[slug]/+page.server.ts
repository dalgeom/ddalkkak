import { error } from '@sveltejs/kit';
import { TRIVIA } from '$lib/trivia';
import { displayChoices } from '$lib/game';
import { categoryBySlug, TRIVIA_CATEGORIES } from '$lib/triviaCategories';
import type { Grade, Problem } from '$lib/problems';
import type { EntryGenerator } from './$types';

// 문제 데이터는 빌드에 박혀 있으니 요청마다 다시 만들 이유가 없다.
export const prerender = true;

export const entries: EntryGenerator = () => TRIVIA_CATEGORIES.map((c) => ({ slug: c.slug }));

const GRADE_ORDER: Grade[] = ['초등', '중등', '고등', '어른'];

/**
 * 전체 목록 실험(2026-10-06 시작) — 이 네 쪽만 대표 아래에 나머지 문제를 다시 싣는다.
 *
 * 구글 노출이 9/03 「대표 + 산문」 배포 다음 날부터 하루 18 → 0~7로 꺼졌다. 8월에 이 네 쪽이
 * 「세계사 상식 퀴즈」 4위·「음식 상식 퀴즈」 3위·「우주 상식 퀴즈」 5.6위·「음악 상식 퀴즈」 7위였는데
 * 지금은 노출 0이다(문학은 2위 그대로). 퀴즈를 찾는 사람에게 31문제라 써 놓고 11개만 보여 준 것이
 * 원인인지, 네 쪽만 되돌려 나머지 14쪽과 GSC 노출을 3~4주 견준다. 색인은 정상이었다(URL 검사 49/57).
 * 산문(deepDive·why)은 그대로 둔다 — 애드센스 대응(655b2a6)을 걷는 게 아니라 목록을 덧붙이는 것이다.
 */
const FULL_LIST_SLUGS = new Set(['world-history', 'food', 'space', 'music', 'spelling']);
// spelling(10/6 신설)은 실험군이 아니다. 네이버 「맞춤법퀴즈」 1쪽이 전부 문제 모음이라
// 처음부터 전체를 싣는다. 10/27 판정 때 4쪽 대 14쪽 비교에서 뺀다.

export function load({ params }) {
	const category = categoryBySlug(params.slug);
	if (!category) error(404, '없는 분야입니다');

	const all = TRIVIA.filter((t) => t.category === category.name);
	// 본문의 분야 전체 수는 {n}으로 적어 둔다 — 문제를 추가할 때마다 「34문제 중」 같은 숫자가
	// 제목(39문제)과 어긋났다(2026-09-30 실측). 여기서 실제 수로 채운다.
	const fill = (s: string) => s.replaceAll('{n}', String(all.length));

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
	const byGradeOrder = (a: Problem, b: Problem) =>
		GRADE_ORDER.indexOf(a.grade!) - GRADE_ORDER.indexOf(b.grade!);
	const view = (raw: Problem) => {
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
	};

	const items = category.featured
		.map(({ id, why }) => {
			const raw = all.find((t) => t.id === id);
			if (!raw) throw new Error(`${category.slug}의 featured에 없는 id: ${id}`);
			return { raw, why };
		})
		.sort((a, b) => byGradeOrder(a.raw, b.raw))
		.map(({ raw, why }) => ({ ...view(raw), why: fill(why) }));

	// 실험 쪽만 대표 아래에 나머지 문제를 다시 싣는다(FULL_LIST_SLUGS 주석)
	const featuredIds = new Set(category.featured.map((f) => f.id));
	const rest = FULL_LIST_SLUGS.has(category.slug)
		? all.filter((t) => !featuredIds.has(t.id)).sort(byGradeOrder).map(view)
		: [];

	// 난이도 구성은 대표가 아니라 그 분야 전체를 보여준다
	const byGrade = GRADE_ORDER.map((g) => ({
		name: g,
		count: all.filter((t) => t.grade === g).length
	})).filter((g) => g.count > 0);

	/**
	 * 다른 분야로 넘어갈 수 있게 — 문제 수가 많은 순으로.
	 *
	 * **링크에 쓰는 세 값만 보낸다.** 예전에는 `...c`로 분야 객체를 통째로 실었는데,
	 * 그 안에는 intro·desc·deepDive(2천 자 안팎)와 대표 문제 11개의 why가 들어 있다.
	 * 프리렌더된 HTML에 그게 17개 분야치 직렬화돼 실리면서 **분야 페이지 18장이 서로
	 * 81%(62KB 중 51KB)가 같은 문서**가 돼 있었다(2026-09-28 실측). 화면에 나오지도
	 * 않는 남의 분야 해설이 모든 페이지에 박혀 있던 셈이다.
	 */
	const others = TRIVIA_CATEGORIES.filter((c) => c.slug !== category.slug)
		.map((c) => ({
			slug: c.slug,
			name: c.name,
			count: TRIVIA.filter((t) => t.category === c.name).length
		}))
		.sort((a, b) => b.count - a.count);

	return {
		category: { ...category, intro: fill(category.intro), desc: fill(category.desc), deepDive: fill(category.deepDive) },
		items,
		rest,
		count: all.length,
		byGrade,
		others,
		total: TRIVIA.length
	};
}
