/**
 * 성냥 대결(2026-10-20) — 씨앗 하나로 성냥 5문제를 고른다. 같은 씨앗이면 누구에게나 같은 5문제다.
 * 링크 · 답장 · 복수전은 상식 대결과 같다(duel.ts parseSeed · parseVs · duelOutcome, /matchstick/duel).
 *
 * 왜: 성냥개비는 검색 유입 1위 유형이고(4주 랜딩 245세션 · 10/14), 상식 대결이 10/18에 처음 돌기 시작했다
 * (시작 8명 · 링크 보냄 6명 14회). 사람이 가장 많이 오는 유형에 친구를 데려올 길을 붙인다.
 *
 * 문제는 모두 하나 옮기기(은행 741개)다. 쉬운 순서로 — 처음 두 문제에서 떠나지 않게(matchstickLevels.ts 기준).
 */
import { seededOrder } from './game';
import { levelOf, type MatchLevel } from './matchstickLevels';
import type { MatchProblem } from './matchstick';

export const MDUEL_PLAN: [MatchLevel | null, number][] = [
	['easy', 2],
	[null, 2],
	['hard', 1]
];
export const MDUEL_SIZE = MDUEL_PLAN.reduce((n, [, k]) => n + k, 0);

export function pickMatchDuel(bank: MatchProblem[], seed: number): MatchProblem[] {
	const out: MatchProblem[] = [];
	MDUEL_PLAN.forEach(([level, k], gi) => {
		const pool = bank.filter((p) => levelOf(p.displayed, p.solution) === level);
		const order = seededOrder(pool.length, (seed * 7 + gi * 7919) >>> 0);
		for (const i of order.slice(0, k)) out.push(pool[i]);
	});
	return out;
}

/**
 * 성냥 대결 링크 미리보기 — 그림은 scripts/og-duel.mjs가 미리 만든 13장 중 하나(mduel · mduel-0~5 · mduel-reply-0~5).
 * 답장(mine이 함께 오면)은 받는 사람 점수만 보이고 친구 점수는 감춘다 — 상식 대결(duelOg)과 같은 규칙.
 */
export function matchDuelOg(
	vs: { score: number; secs: number } | null,
	fmt: (ms: number) => string,
	mine: { score: number; secs: number } | null = null
): { title: string; description: string; image: string } {
	const base = 'https://ddalkkak.app/og/';
	const N = MDUEL_SIZE;
	if (vs && mine) {
		return {
			title: '친구가 내 성냥 도전장에 답했어요',
			description: `나 ${mine.score}/${N} · ${fmt(mine.secs * 1000)}. 친구는 몇 개 풀었을까요?`,
			image: `${base}mduel-reply-${mine.score}.png`
		};
	}
	if (!vs) {
		return {
			title: '성냥개비 대결 — 같은 5문제로 겨뤄요',
			description: '성냥 하나만 옮겨 식을 맞게. 많이 풀수록, 같으면 빠른 쪽이 이겨요.',
			image: base + 'mduel.png'
		};
	}
	const t = fmt(vs.secs * 1000);
	const image = `${base}mduel-${vs.score}.png`;
	if (vs.score === N) return { title: `친구가 성냥 ${N}/${N} 만점으로 도전장을 보냈어요`, description: `이기려면 ${t}보다 빨리 다 풀어야 해요.`, image };
	if (vs.score === 0) return { title: `친구가 성냥 0/${N}로 도전장을 보냈어요`, description: '같은 5문제, 하나만 풀어도 이겨요.', image };
	return { title: `친구가 성냥 ${vs.score}/${N}로 도전장을 보냈어요`, description: `같은 5문제, ${t}. 이길 수 있어요?`, image };
}
