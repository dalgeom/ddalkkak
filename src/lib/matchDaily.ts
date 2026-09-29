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
 */
import { cursorAt, seededOrder, MATCH_TOTAL } from './game';

const AHEAD = 370;

export function matchOfDay(day: number): number {
	const order = seededOrder(MATCH_TOTAL, 20260303);
	return order[(cursorAt('match', day) + AHEAD) % MATCH_TOTAL];
}

/** day — 마지막으로 끝낸 날. streak — 그날까지 연속으로 「맞힌」 날 수. */
export type MatchStreak = { day: number; streak: number; best: number };

export function nextStreak(
	prev: MatchStreak | null,
	day: number,
	result: 'won' | 'revealed'
): MatchStreak {
	if (prev && prev.day === day) return prev;
	const best = prev?.best ?? 0;
	if (result === 'revealed') return { day, streak: 0, best };
	const streak = prev && prev.day === day - 1 ? prev.streak + 1 : 1;
	return { day, streak, best: Math.max(best, streak) };
}

/** 오늘 아직 안 풀었어도 어제까지 이어졌으면 산 기록이다 */
export function shownStreak(s: MatchStreak | null, day: number): number {
	return s && s.day >= day - 1 ? s.streak : 0;
}
