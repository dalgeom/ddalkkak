/**
 * 하루치 문제를 보기용으로 조립한다 — 아카이브(서버)와 /today(클라이언트)가 같이 쓴다.
 *
 * 홈의 데일리 세션과 완전히 같은 선택 로직(buildDailySet)이라
 * "그날의 문제 그대로"라는 약속이 두 화면에서 같은 코드로 지켜진다.
 * 원래 아카이브 서버 load 안에 있던 것을 /today가 생기며 끌어올렸다.
 */
import { PROBLEMS, fieldOfChip, type Problem } from './problems';
import { TRIVIA } from './trivia';
import { buildDailySetStable, MATCH_TOTAL } from './game';
import { bankSizesAt } from './bankHistory';
import { problemAt, type CubeNetProblem } from './cubenet';
import matchData from './data/matchstick-problems.json';

export type Eq = { displayed: string; solution: string };

export type DayView = {
	discover: Problem[];
	trivia: Problem[];
	match: Eq[];
	cube: CubeNetProblem[];
	bonus:
		| { kind: 'discover' | 'trivia'; problem: Problem }
		| { kind: 'match'; eq: Eq }
		| { kind: 'cube'; cube: CubeNetProblem }
		| null;
};

export function assembleDayView(day: number): DayView {
	const eqs = matchData as Eq[];
	// 날짜별 은행 크기 이력을 통째로 넘긴다 — v2(안정 뽑기)는 과거 하루하루의 크기가 필요하다
	const picks = buildDailySetStable(
		PROBLEMS,
		TRIVIA,
		MATCH_TOTAL,
		day,
		(x) => fieldOfChip(x.chip),
		(x) => x.category ?? '기타',
		bankSizesAt
	);

	const discover: Problem[] = [];
	const trivia: Problem[] = [];
	const match: Eq[] = [];
	const cube: CubeNetProblem[] = [];
	let bonus: DayView['bonus'] = null;
	for (const p of picks) {
		if (p.bonus) {
			bonus =
				p.kind === 'match'
					? { kind: 'match', eq: eqs[p.index] }
					: p.kind === 'cube'
						? { kind: 'cube', cube: problemAt(p.index) }
						: { kind: p.kind, problem: (p.kind === 'discover' ? PROBLEMS : TRIVIA)[p.index] };
		} else if (p.kind === 'discover') discover.push(PROBLEMS[p.index]);
		else if (p.kind === 'trivia') trivia.push(TRIVIA[p.index]);
		else if (p.kind === 'cube') cube.push(problemAt(p.index));
		else match.push(eqs[p.index]);
	}

	return { discover, trivia, match, cube, bonus };
}
