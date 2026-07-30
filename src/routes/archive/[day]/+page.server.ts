import { error } from '@sveltejs/kit';
import { PROBLEMS, fieldOfChip, type Problem } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import matchData from '$lib/data/matchstick-problems.json';
import { kstDayNumber, dayLabel, buildDailySet, MATCH_TOTAL, SITE_START_DAY } from '$lib/game';
import type { PageServerLoad } from './$types';

// 요청 시점에 '오늘'을 계산한다. prerender 하면 빌드 시점 기준으로 고정돼 날짜가 넘어가도
// 새 날짜 페이지가 생기지 않고(진짜 404), 스포일러 가드도 갱신되지 않는다.
// server load라 PROBLEMS·TRIVIA 원본 배열이 클라이언트 번들에 실리지 않고, 그날 분량만 직렬화된다.
export const prerender = false;

type Eq = { displayed: string; solution: string };

export const load: PageServerLoad = ({ params }) => {
	const day = Number(params.day);
	const today = kstDayNumber(Date.now());
	// 미래·오늘은 answers를 품고 있어 넘기지 않는다. 아카이브 창 밖도 막는다.
	// 사이트 개설 전 날짜도 404 — 계산은 되지만 실제로 아무도 그날 풀지 않았다.
	if (!Number.isInteger(day) || day >= today || day < today - 400 || day < SITE_START_DAY)
		throw error(404, 'Not found');

	// 홈의 데일리 세션과 완전히 같은 선택 로직 — 아카이브가 "그날의 문제 그대로"라는 약속을 지킨다
	const eqs = matchData as Eq[];
	const picks = buildDailySet(
		PROBLEMS,
		TRIVIA,
		MATCH_TOTAL,
		day,
		(x) => fieldOfChip(x.chip),
		(x) => x.category ?? '기타'
	);

	const discover: Problem[] = [];
	const trivia: Problem[] = [];
	const match: Eq[] = [];
	let bonus: { kind: 'discover' | 'trivia'; problem: Problem } | { kind: 'match'; eq: Eq } | null =
		null;
	for (const p of picks) {
		if (p.bonus) {
			bonus =
				p.kind === 'match'
					? { kind: 'match', eq: eqs[p.index] }
					: { kind: p.kind, problem: (p.kind === 'discover' ? PROBLEMS : TRIVIA)[p.index] };
		} else if (p.kind === 'discover') discover.push(PROBLEMS[p.index]);
		else if (p.kind === 'trivia') trivia.push(TRIVIA[p.index]);
		else match.push(eqs[p.index]);
	}

	return { day, label: dayLabel(day), discover, trivia, match, bonus };
};
