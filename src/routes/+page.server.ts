import { PROBLEMS, fieldOfChip, type Problem } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import { TRIVIA_CATEGORIES } from '$lib/triviaCategories';
import { ARTICLES } from '$lib/articles';
import { kstDayNumber, buildDailySetStable, dailySample, displayChoices, MATCH_TOTAL } from '$lib/game';
import { bankSizesAt } from '$lib/bankHistory';

/** 분야별 문제 모음으로 가는 입구. 홈에서 한 번에 닿아야 사람도 크롤러도 찾아간다. */
const CATEGORY_LINKS = TRIVIA_CATEGORIES.map((c) => ({
	slug: c.slug,
	name: c.name,
	count: TRIVIA.filter((t) => t.category === c.name).length
})).sort((a, b) => b.count - a.count);

// 홈의 '오늘'은 요청 시점에 계산해야 한다. prerender 하면 빌드 시점 날짜가 정적 HTML에
// 박혀, 크롤러와 hydration 전 사용자가 매번 1970-01-01 + day-0 문제를 보는 FOUC가 생긴다.
export const prerender = false;

/**
 * 랜딩의 '오늘의 맛보기'는 서버에서 한 문제만 골라 내려보낸다.
 * 클라이언트에서 뽑으려면 문제은행(약 96KB gzip)을 랜딩에서 통째로 받아야 한다.
 */
export function load() {
	const dayNum = kstDayNumber(Date.now());

	// 오늘의 10문제에 든 발견형은 맛보기에서 제외한다(미리 답을 알게 되면 안 된다)
	// 은행 이력(bankSizesAt)까지 맞춰야 낮 배포로 문제가 추가돼도 제외 목록이 흔들리지 않는다
	const todaysDiscover = buildDailySetStable(
		PROBLEMS,
		TRIVIA,
		MATCH_TOTAL,
		dayNum,
		(p) => fieldOfChip(p.chip),
		(t) => t.category ?? '기타',
		bankSizesAt
	)
		.filter((p) => p.kind === 'discover')
		.map((p) => p.index);

	const idx = dailySample(PROBLEMS.length, dayNum, todaysDiscover);
	// 본 게임과 같은 보기 셔플 — 빼먹으면 맛보기에서만 정답이 원래 자리(주로 A)에 몰린다
	const raw: Problem | undefined = PROBLEMS[idx];
	const p = raw ? displayChoices(raw) : undefined;

	// 홈에 최신 글 셋을 실어 둔다. 읽을거리가 푸터 링크 하나로만 닿아 있으면 사람도
	// 크롤러도 사이트에 글이 있다는 걸 모른다.
	const latest = [...ARTICLES]
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, 3)
		.map((a) => ({ slug: a.slug, title: a.title, description: a.description, date: a.date, tag: a.tag }));

	return {
		dayNum,
		categories: CATEGORY_LINKS,
		latest,
		// 필요한 필드만 골라 보낸다
		sample: p
			? {
					chip: p.chip,
					blocks: p.blocks,
					type: p.type,
					answers: p.answers ?? [],
					choices: p.choices ?? [],
					answerIndex: p.answerIndex ?? -1,
					explain: p.explain
				}
			: null
	};
}
