/**
 * 상식 퀴즈 대결(v2, 2026-10-14) — 씨앗(seed) 하나로 10문제를 고른다. 같은 씨앗이면 누구에게나 같은 10문제다.
 * 친구에게 「?s=씨앗&n=점수&t=초」 링크를 보내면 같은 문제로 겨룬다(/trivia/duel).
 *
 * 왜: 공유가 4주 동안 사실상 0이었다(공유 53번 보임 · 1번 눌림, 문제 보내기 212번 · 1번 — 10/14 점검).
 * 점수 비교는 퀴즈에서 가장 강한 공유 동기다.
 *
 * 상식 문제 파일은 약 300KB라 화면에 싣지 않는다 — 서버(+page.server.ts)가 고르고 10문제만 내린다.
 */
import { seededOrder } from './game';
import type { Problem, Grade } from './problems';

/** 쉬운 순서로 — 처음 세 문제에서 떠나지 않게 */
export const DUEL_PLAN: [Grade, number][] = [
	['초등', 3],
	['중등', 3],
	['고등', 2],
	['어른', 2]
];
export const DUEL_SIZE = DUEL_PLAN.reduce((n, [, k]) => n + k, 0);

export function pickDuel(bank: Problem[], seed: number): Problem[] {
	const out: Problem[] = [];
	DUEL_PLAN.forEach(([grade, k], gi) => {
		const pool = bank.filter((p) => p.grade === grade && p.type === 'choice');
		const order = seededOrder(pool.length, (seed * 7 + gi * 7919) >>> 0);
		for (const i of order.slice(0, k)) out.push(pool[i]);
	});
	return out;
}

/** 링크의 씨앗 — 양의 정수만 받는다. 없거나 이상하면 null */
export function parseSeed(v: string | null): number | null {
	if (!v || !/^\d{1,9}$/.test(v)) return null;
	const n = Number(v);
	return n > 0 ? n : null;
}

/** 친구 기록 — 점수 0~10, 시간 1초~1시간. 하나라도 이상하면 기록 없이 시작 */
export function parseVs(n: string | null, t: string | null): { score: number; secs: number } | null {
	if (!n || !t || !/^\d{1,2}$/.test(n) || !/^\d{1,4}$/.test(t)) return null;
	const score = Number(n);
	const secs = Number(t);
	if (score > DUEL_SIZE || secs < 1 || secs > 3600) return null;
	return { score, secs };
}

/** 이겼나 — 점수가 먼저, 같으면 빠른 쪽 */
export function duelOutcome(me: { score: number; secs: number }, vs: { score: number; secs: number }): 'win' | 'lose' | 'draw' {
	if (me.score !== vs.score) return me.score > vs.score ? 'win' : 'lose';
	if (me.secs !== vs.secs) return me.secs < vs.secs ? 'win' : 'lose';
	return 'draw';
}
