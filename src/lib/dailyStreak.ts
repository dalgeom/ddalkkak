/**
 * 하루 한 문제의 연속 기록 — 오늘의 성냥개비(matchDaily.ts)와 오늘의 초성(chosung.ts)이 같이 쓴다.
 *
 * day — 마지막으로 끝낸 날. streak — 그날까지 연속으로 「맞힌」 날 수.
 */
export type DayStreak = { day: number; streak: number; best: number };

export function nextStreak(
	prev: DayStreak | null,
	day: number,
	result: 'won' | 'revealed'
): DayStreak {
	if (prev && prev.day === day) return prev;
	const best = prev?.best ?? 0;
	if (result === 'revealed') return { day, streak: 0, best };
	const streak = prev && prev.day === day - 1 ? prev.streak + 1 : 1;
	return { day, streak, best: Math.max(best, streak) };
}

/** 오늘 아직 안 풀었어도 어제까지 이어졌으면 산 기록이다 */
export function shownStreak(s: DayStreak | null, day: number): number {
	return s && s.day >= day - 1 ? s.streak : 0;
}
