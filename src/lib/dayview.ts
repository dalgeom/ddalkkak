/**
 * 하루치 문제를 보기용으로 조립한다 — 아카이브(서버)와 /today(클라이언트)가 같이 쓴다.
 *
 * 홈의 데일리 세션과 완전히 같은 선택 로직(buildDailySet)이라
 * "그날의 문제 그대로"라는 약속이 두 화면에서 같은 코드로 지켜진다.
 * 원래 아카이브 서버 load 안에 있던 것을 /today가 생기며 끌어올렸다.
 */
import { PROBLEMS, fieldOfChip, type Problem } from './problems';
import { TRIVIA } from './trivia';
import { buildDailySetStable, MATCH_TOTAL, NEW_SET_DAY } from './game';
import { bankSizesAt } from './bankHistory';
import { isOpener } from './opener';
import { problemAt, type CubeNetProblem } from './cubenet';
import matchData from './data/matchstick-problems.json';
import { scrambleAt, type Scramble } from './scramble';
import { equationAt, type Equation } from './equation';
import { sudokuAt, type Sudoku } from './sudoku';

export type Eq = { displayed: string; solution: string };

export type DayView = {
	discover: Problem[];
	trivia: Problem[];
	match: Eq[];
	cube: CubeNetProblem[];
	/** 11/24(NEW_SET_DAY)부터 — 그 전 날은 빈 배열 */
	scramble: Scramble[];
	equation: Equation[];
	sudoku: Sudoku[];
	bonus:
		| { kind: 'discover' | 'trivia'; problem: Problem }
		| { kind: 'match'; eq: Eq }
		| { kind: 'cube'; cube: CubeNetProblem }
		| null;
};

/** 홈의 데일리 큐 한 칸. 순서가 곧 출제 순서라 배열 그대로 쓴다. */
export type DayQueueItem = {
	kind: 'discover' | 'trivia' | 'match' | 'cube' | 'scramble' | 'equation' | 'sudoku';
	bonus: boolean;
	index: number;
	problem?: Problem;
	eq?: Eq;
	cube?: CubeNetProblem;
	scramble?: Scramble;
	equation?: Equation;
	sudoku?: Sudoku;
};

/**
 * 그날의 10문제를 출제 순서 그대로 조립한다.
 *
 * 홈이 이걸 /api/day/<날짜>로 받는다. 예전에는 10문제를 위해 문제은행 전체를
 * 동적 import 했는데 gz로만 174KB였다(PROBLEMS 92 + TRIVIA 78 + 나머지 4).
 * 이 배열은 gz 1.9KB다.
 *
 * assembleDayView는 이걸 종류별로 묶기만 한다 — 뽑는 규칙이 두 벌이 되면
 * 「그날의 문제 그대로」라는 약속이 조용히 어긋난다.
 */
export function assembleDayQueue(day: number): DayQueueItem[] {
	const eqs = matchData as Eq[];
	// 날짜별 은행 크기 이력을 통째로 넘긴다 — v2(안정 뽑기)는 과거 하루하루의 크기가 필요하다
	const picks = buildDailySetStable(
		PROBLEMS,
		TRIVIA,
		MATCH_TOTAL,
		day,
		(x) => fieldOfChip(x.chip),
		(x) => x.category ?? '기타',
		bankSizesAt,
		isOpener,
		(i) => eqs[i].solution
	);
	return picks.map((p) => ({
		kind: p.kind,
		bonus: !!p.bonus,
		index: p.index,
		problem:
			p.kind === 'discover' ? PROBLEMS[p.index] : p.kind === 'trivia' ? TRIVIA[p.index] : undefined,
		eq: p.kind === 'match' ? eqs[p.index] : undefined,
		cube: p.kind === 'cube' ? problemAt(p.index) : undefined,
		scramble: p.kind === 'scramble' ? scrambleAt(p.index) : undefined,
		equation: p.kind === 'equation' ? equationAt(p.index) : undefined,
		sudoku: p.kind === 'sudoku' ? sudokuAt(p.index) : undefined
	}));
}

/**
 * 11/24 새 구성 전에 열어 둔 탭(옛 JS)은 /api/day를 ?v=2 없이 부른다. 옛 JS는 새 세 유형을 그리지 못하고,
 * 404를 주면 은행 전체로 옛 구성 10문제를 계산해 버려 새 세트와 어긋난다.
 * 그래서 옛 JS가 그릴 수 있는 상식 선택형 한 칸으로 새로고침을 부탁한다.
 */
export const NOTICE_ITEM: DayQueueItem = {
	kind: 'trivia',
	bonus: false,
	index: 0,
	problem: {
		id: 'notice-new-set',
		trivia: true,
		category: '안내',
		chip: '안내',
		blocks: [{ kind: 'text', html: '오늘의 10문제가 새 구성으로 바뀌었어요. 화면을 새로고침해 주세요' }],
		type: 'choice',
		choices: ['새로고침'],
		answerIndex: 0,
		explain: '새로고침하면 새 구성의 오늘의 10문제가 열려요.'
	}
};

/** /api/day/<날짜>가 내려줄 것. v는 쿼리의 v 값(새 클라이언트는 '2') */
export function dayQueueForClient(day: number, v: string | null): DayQueueItem[] {
	if (day >= NEW_SET_DAY && v !== '2') return [NOTICE_ITEM];
	return assembleDayQueue(day);
}

export function assembleDayView(day: number): DayView {
	const picks = assembleDayQueue(day);

	const discover: Problem[] = [];
	const trivia: Problem[] = [];
	const match: Eq[] = [];
	const cube: CubeNetProblem[] = [];
	const scramble: Scramble[] = [];
	const equation: Equation[] = [];
	const sudoku: Sudoku[] = [];
	let bonus: DayView['bonus'] = null;
	for (const p of picks) {
		if (p.bonus) {
			bonus =
				p.kind === 'match'
					? { kind: 'match', eq: p.eq! }
					: p.kind === 'cube'
						? { kind: 'cube', cube: p.cube! }
						: { kind: p.kind as 'trivia' | 'discover', problem: p.problem! };
		} else if (p.kind === 'discover') discover.push(p.problem!);
		else if (p.kind === 'trivia') trivia.push(p.problem!);
		else if (p.kind === 'cube') cube.push(p.cube!);
		else if (p.kind === 'scramble') scramble.push(p.scramble!);
		else if (p.kind === 'equation') equation.push(p.equation!);
		else if (p.kind === 'sudoku') sudoku.push(p.sudoku!);
		else match.push(p.eq!);
	}

	return { discover, trivia, match, cube, scramble, equation, sudoku, bonus };
}
