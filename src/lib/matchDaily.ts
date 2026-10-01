/**
 * 오늘의 성냥개비 — /matchstick에 하루 한 문제.
 *
 * 성냥개비는 검색 입구 1위다(9/01~29 방문 172명). 그런데 데일리 띠를 본 254명 중
 * 19명(7%)만 눌렀다. 성냥개비를 찾아온 사람에게 10문제 세트는 다른 상품이라,
 * 그 사람이 좋아하는 유형 안에서 매일 올 이유를 준다.
 *
 * 고르는 법: 데일리 10문제는 성냥개비 순열(seed 20260303)을 커서로 하루 2~3칸씩 앞에서
 * 집는다. 여기는 같은 순열에서 커서보다 절반(370칸) 앞을 집는다 — 데일리가 거기 닿으려면
 * 다섯 달이 넘게 걸려서, 오늘·어제·내일의 10문제와는 구조적으로 겹치지 않는다.
 * 어려움을 건너뛰며 몇 칸 밀려도 370칸 거리에 견주면 작다(테스트가 본다).
 */
import { cursorAt, seededOrder, MATCH_TOTAL } from './game';
import { levelOf } from './matchstickLevels';
import PROBLEMS from './data/matchstick-problems.json';

const AHEAD = 370;

/**
 * 10/2(day 20728)부터 「어려움」(matchstickLevels.ts — 두 자리 수 + 숫자 사이 이동·기호 변경)을
 * 건너뛴다. 9/30 문제가 2 + 3 = 17(어려움)이었는데 풀기 시작한 4명이 4명 모두 정답 보기로
 * 끝났다(n=4). 검색으로 막 들어온 사람에게 하루 한 문제가 벽이면 다음 날 올 이유가 없다.
 * 그 전 날짜는 예전 방식 그대로 둔다 — 10/1 문제가 낮에 바뀌면 안 된다.
 */
const NO_HARD_FROM = 20728;

const ORDER = seededOrder(MATCH_TOTAL, 20260303);
const isHard = (i: number) => {
	const p = (PROBLEMS as { displayed: string; solution: string }[])[i];
	return levelOf(p.displayed, p.solution) === 'hard';
};

/** 순열에서의 자리. 어려움을 건너뛰되 전날 자리보다 뒤에서만 고른다 — 이틀 연속 같은 문제가 안 나온다 */
const posMemo = new Map<number, number>();
function posOf(day: number): number {
	const start = cursorAt('match', day) + AHEAD;
	if (day < NO_HARD_FROM) return start;
	const hit = posMemo.get(day);
	if (hit !== undefined) return hit;
	let p = day === NO_HARD_FROM ? start : Math.max(start, posOf(day - 1) + 1);
	while (isHard(ORDER[p % MATCH_TOTAL])) p++;
	posMemo.set(day, p);
	return p;
}

export function matchOfDay(day: number): number {
	return ORDER[posOf(day) % MATCH_TOTAL];
}

// 연속 기록은 초성 퀴즈와 같이 쓴다(dailyStreak.ts)
export { nextStreak, shownStreak, type DayStreak as MatchStreak } from './dailyStreak';
