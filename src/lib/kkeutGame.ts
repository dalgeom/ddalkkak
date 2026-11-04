import type { Tier } from './tiers';
import { best, bestMoves, check, last, movesFrom, pickMove, type Dict, type Reject, type Table } from './kkeut';

/**
 * 끝말잇기 한 판(2026-11-03). 화면(/kkeut)은 이 상태를 그리기만 한다.
 * 퍼즐: 컴퓨터는 사전 전체로 최선(best). N번째 사람 말 뒤에도 받아치면 실패.
 * 사람이 정답 길(line)대로 두는 동안은 길의 컴퓨터 말이 최선 수 후보 안에 있으면 그 말을 낸다 — 해설의 길과 실제 판이 같게.
 * 대결: 단계별 pickMove. 무승부 글자가 188종이라 사람이 DUEL_LIMIT수를 버티면 사람 승리로 끝낸다.
 * 컴퓨터가 낼 말이 없으면(새싹 · 쉬움은 쉬운 말만 알아서 막힐 수 있다) 사람 승리.
 * 진검승부(free, 11/4): 고수(5단계) 컴퓨터와 수 제한 없이 누가 먼저 막히나 — 20수에서 끝나 심심한 사람을 위해.
 */
export const DUEL_LIMIT = 20;

export type Turn = { who: 'me' | 'cpu'; word: string };
export type Game = {
	mode: 'puzzle' | 'duel' | 'free';
	tier: Tier;
	n: number;
	line: string[];
	chain: Turn[];
	used: Set<string>;
	end: null | 'win' | 'lose' | 'fail' | 'giveup';
};

const make = (mode: Game['mode'], tier: Tier, n: number, start: string, line: string[] = []): Game => ({
	mode,
	tier,
	n,
	line,
	chain: [{ who: 'cpu', word: start }],
	used: new Set([start]),
	end: null
});

export const newPuzzle = (start: string, n: number, line: string[] = []) => make('puzzle', 5, n, start, line);
export const newDuel = (tier: Tier, start: string) => make('duel', tier, 0, start);
export const newFree = (start: string) => make('free', 5, 0, start);

/** 대결 첫 단어 — 쉬운 말 중 사람이 처음부터 지지 않고, 이을 말이 다섯 개 넘는 글자로 끝나는 것 */
export function firstWord(d: Dict, t: Table, tier: Tier, rand: () => number = Math.random): string {
	const ok = (w: string) => !t.lose.has(last(w)) && movesFrom(d, last(w)).filter((x) => tier > 2 || d.easy.has(x)).length > 5;
	const pool = d.words.filter((w) => d.easy.has(w) && ok(w));
	const from = pool.length ? pool : d.words.filter((w) => !t.lose.has(last(w)));
	return from[Math.floor(rand() * from.length)];
}

/** 사람 한 수. 받지 않으면 이유를, 받으면 null(컴퓨터 답 · 판 끝은 g에 적힌다) */
export function play(g: Game, d: Dict, t: Table, raw: string, rand: () => number = Math.random): Reject | null {
	if (g.end) return null;
	const r = check(d, g.chain[g.chain.length - 1].word, raw, g.used);
	if (!r.ok) return r.why;
	g.chain.push({ who: 'me', word: r.word });
	g.used.add(r.word);
	const mine = g.chain.filter((x) => x.who === 'me').length;
	if (g.mode === 'duel' && mine >= DUEL_LIMIT) {
		g.end = 'win';
		return null;
	}
	const reply = g.mode === 'puzzle' ? puzzleReply(g, d, t, r.word, rand) : pickMove(d, t, g.tier, last(r.word), g.used, rand);
	if (!reply) {
		g.end = 'win';
		return null;
	}
	g.chain.push({ who: 'cpu', word: reply });
	g.used.add(reply);
	const stuck = !movesFrom(d, last(reply), g.used).length;
	if (g.mode === 'puzzle' && (mine >= g.n || stuck)) g.end = 'fail';
	else if (stuck) g.end = 'lose';
	return null;
}

function puzzleReply(g: Game, d: Dict, t: Table, w: string, rand: () => number): string | null {
	const ms = movesFrom(d, last(w), g.used);
	const i = g.chain.length - 1;
	const next = g.line[i];
	if (next && g.chain.slice(1).every((x, k) => x.word === g.line[k]) && bestMoves(t, ms).includes(next)) return next;
	return best(t, ms, rand);
}

/** 「모르겠어요」 — 판을 끝내고 낼 수 있었던 말을 셋까지(쉬운 말 먼저) */
export function giveUp(g: Game, d: Dict): string[] {
	g.end = 'giveup';
	const ms = movesFrom(d, last(g.chain[g.chain.length - 1].word), g.used);
	return [...ms.filter((w) => d.easy.has(w)), ...ms.filter((w) => !d.easy.has(w))].slice(0, 3);
}
