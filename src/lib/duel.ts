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

/**
 * 대결 링크 미리보기(카카오톡 · 문자) — 그림 · 제목 · 설명. 그림은 scripts/og-duel.mjs가 미리 만든 12장 중 하나.
 * 시간은 링크마다 달라 그림 대신 설명에 넣는다(10/15 시안 docs/시안/duel-og, 「B 점수판형 + 시간은 설명」).
 */
export function duelOg(vs: { score: number; secs: number } | null, fmt: (ms: number) => string): { title: string; description: string; image: string } {
	const base = 'https://ddalkkak.app/og/';
	if (!vs) {
		return {
			title: '상식 퀴즈 대결 — 같은 10문제로 겨뤄요',
			description: '쉬운 문제부터 10개. 점수가 같으면 빠른 쪽이 이겨요.',
			image: base + 'duel.png'
		};
	}
	const t = fmt(vs.secs * 1000);
	const image = `${base}duel-${vs.score}.png`;
	if (vs.score === DUEL_SIZE) {
		return { title: `친구가 ${DUEL_SIZE}/${DUEL_SIZE} 만점으로 도전장을 보냈어요`, description: `이기려면 ${t}보다 빨리 다 맞혀야 해요.`, image };
	}
	if (vs.score === 0) {
		return { title: `친구가 0/${DUEL_SIZE}으로 도전장을 보냈어요`, description: '같은 10문제, 하나만 맞혀도 이겨요.', image };
	}
	return { title: `친구가 ${vs.score}/${DUEL_SIZE}으로 도전장을 보냈어요`, description: `같은 10문제, ${t}. 이길 수 있어요?`, image };
}
