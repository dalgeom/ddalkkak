import { PROBLEMS, fieldOfChip, type Problem } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import { kstDayNumber, buildDailySet, dailySample, displayChoices, MATCH_TOTAL } from '$lib/game';

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
	const todaysDiscover = buildDailySet(
		PROBLEMS,
		TRIVIA,
		MATCH_TOTAL,
		dayNum,
		(p) => fieldOfChip(p.chip),
		(t) => t.category ?? '기타'
	)
		.filter((p) => p.kind === 'discover')
		.map((p) => p.index);

	const idx = dailySample(PROBLEMS.length, dayNum, todaysDiscover);
	// 본 게임과 같은 보기 셔플 — 빼먹으면 맛보기에서만 정답이 원래 자리(주로 A)에 몰린다
	const raw: Problem | undefined = PROBLEMS[idx];
	const p = raw ? displayChoices(raw) : undefined;

	return {
		dayNum,
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
