/**
 * 끝말잇기(2026-11-03) — 두음 · 받는 말 판정 · 이기는 글자 표 · 컴퓨터 수 고르기.
 * 사전은 한국어기초사전(국립국어원, CC BY-SA 2.0 KR) 명사 — scripts/kkeut-build.mjs가 static/kkeut/에 굽는다.
 * 설계: docs/superpowers/specs/2026-11-03-kkeut-design.md
 */
import type { Tier } from './tiers';

const BASE = 0xac00;
/** 중성 ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ */
const Y = new Set([2, 6, 7, 12, 17, 20]);

/** 두음법칙으로 대신 시작해도 되는 글자, 없으면 null */
export function dueum(c: string): string | null {
	const o = c.charCodeAt(0) - BASE;
	if (o < 0 || o > 11171) return null;
	let cho = Math.floor(o / 588);
	const jung = Math.floor((o % 588) / 28);
	const jong = o % 28;
	if (cho === 5) cho = Y.has(jung) ? 11 : 2;
	else if (cho === 2 && Y.has(jung)) cho = 11;
	else return null;
	return String.fromCharCode(BASE + cho * 588 + jung * 28 + jong);
}

/** 끝 글자 c 다음에 시작할 수 있는 글자들 */
export function startsFor(c: string): string[] {
	const d = dueum(c);
	return d ? [c, d] : [c];
}

export const last = (w: string) => w[w.length - 1];

export type Dict = { words: string[]; easy: Set<string>; has: Set<string>; byFirst: Map<string, string[]> };

export function makeDict(words: string[], easy: string[] = []): Dict {
	const byFirst = new Map<string, string[]>();
	for (const w of words) {
		const a = byFirst.get(w[0]);
		if (a) a.push(w);
		else byFirst.set(w[0], [w]);
	}
	return { words, easy: new Set(easy), has: new Set(words), byFirst };
}

/** c로 끝난 말 다음에 낼 수 있는 말(이미 나온 말은 뺀다) */
export function movesFrom(d: Dict, c: string, used: Set<string> = new Set()): string[] {
	const out: string[] = [];
	for (const s of startsFor(c)) for (const w of d.byFirst.get(s) ?? []) if (!used.has(w)) out.push(w);
	return out;
}

export type Reject = 'short' | 'first' | 'notword' | 'used';

export function check(
	d: Dict,
	prev: string | null,
	raw: string,
	used: Set<string>
): { ok: true; word: string } | { ok: false; why: Reject } {
	const word = raw.replace(/\s+/g, '').normalize('NFC');
	if (word.length < 2) return { ok: false, why: 'short' };
	if (prev && !startsFor(last(prev)).includes(word[0])) return { ok: false, why: 'first' };
	if (!d.has.has(word)) return { ok: false, why: 'notword' };
	if (used.has(word)) return { ok: false, why: 'used' };
	return { ok: true, word };
}

/**
 * 글자 단위 역행 분석(다시 쓰기 금지는 무시한다).
 * win: 그 글자 차례인 쪽이 반드시 이기는 데 드는 내 수, lose: 반드시 지기까지 남은 상대 수(0 = 이을 말이 없음).
 * 둘 다 없는 글자는 어느 쪽도 반드시 이기지 못한다.
 */
export type Table = { win: Map<string, number>; lose: Map<string, number> };

export function charTable(d: Dict, maxDepth = 8): Table {
	const chars = new Set<string>();
	for (const w of d.words) {
		chars.add(w[0]);
		chars.add(last(w));
	}
	const next = new Map<string, string[]>();
	for (const c of chars) next.set(c, [...new Set(movesFrom(d, c).map(last))]);
	const win = new Map<string, number>();
	const lose = new Map<string, number>();
	for (const c of chars) if (!next.get(c)!.length) lose.set(c, 0);
	for (let depth = 1; depth <= maxDepth; depth++) {
		let changed = false;
		for (const c of chars) {
			if (win.has(c) || lose.has(c)) continue;
			if (next.get(c)!.some((e) => (lose.get(e) ?? 99) < depth)) {
				win.set(c, depth);
				changed = true;
			}
		}
		for (const c of chars) {
			if (win.has(c) || lose.has(c)) continue;
			if (next.get(c)!.every((e) => (win.get(e) ?? 99) <= depth)) {
				lose.set(c, depth);
				changed = true;
			}
		}
		if (!changed) break;
	}
	return { win, lose };
}

const pick = <T>(a: T[], rand: () => number) => a[Math.floor(rand() * a.length)];

/** 최선 수 후보(동점 최고 점수): 상대가 반드시 지는 글자로(빨리 지는 쪽 먼저), 없으면 미정 글자로, 그것도 없으면 가장 오래 버티는 쪽으로 */
export function bestMoves(t: Table, ms: string[]): string[] {
	const score = (w: string) => {
		const e = last(w);
		const l = t.lose.get(e);
		if (l !== undefined) return 1000 - l;
		return t.win.get(e) ?? 500;
	};
	const top = Math.max(...ms.map(score));
	return ms.filter((w) => score(w) === top);
}

export function best(t: Table, ms: string[], rand: () => number = Math.random): string | null {
	return ms.length ? pick(bestMoves(t, ms), rand) : null;
}

/**
 * 단계별 컴퓨터 수(tiers.ts 1 새싹 ~ 5 고수).
 * 새싹 · 쉬움은 쉬운 말(초급 · 중급)만 안다. 새싹은 한방을 피하고, 어려움은 한방이 있으면 내고, 고수는 표대로 최선.
 */
export function pickMove(
	d: Dict,
	t: Table,
	tier: Tier,
	c: string,
	used: Set<string>,
	rand: () => number = Math.random
): string | null {
	let ms = movesFrom(d, c, used);
	if (tier <= 2) ms = ms.filter((w) => d.easy.has(w));
	if (!ms.length) return null;
	const dead = (w: string) => t.lose.get(last(w)) === 0;
	if (tier === 1) {
		const soft = ms.filter((w) => !dead(w));
		return pick(soft.length ? soft : ms, rand);
	}
	if (tier === 4) {
		const k = ms.filter(dead);
		return pick(k.length ? k : ms, rand);
	}
	if (tier === 5) return best(t, ms, rand);
	return pick(ms, rand);
}

/** 오늘의 퍼즐 수: 월~목 1 · 금 2 · 토 · 일 3 (day = kstDayNumber, 0일은 1970-01-01 목요일) */
export function puzzleMoves(day: number): 1 | 2 | 3 {
	const wd = (day + 4) % 7; // 0 = 일요일
	if (wd === 5) return 2;
	if (wd === 6 || wd === 0) return 3;
	return 1;
}

/**
 * 다시 쓰기 금지까지 넣어 w를 내면 k수 안에 반드시 이기나 — 빌드 검증용이다. 화면에서는 부르지 않는다(3수면 수 초).
 * t를 주면 표로 가망 없는 수를 건너뛴다(이긴다고 답한 것은 언제나 참이고, 못 찾은 퍼즐은 버리면 된다).
 */
export function winsWith(d: Dict, w: string, k: number, used: Set<string>, t?: Table): boolean {
	used.add(w);
	let all = true;
	for (const r of movesFrom(d, last(w), used)) {
		used.add(r);
		const ok = k > 1 && forcedWin(d, last(r), k - 1, used, t) !== null;
		used.delete(r);
		if (!ok) {
			all = false;
			break;
		}
	}
	used.delete(w);
	return all;
}

/** c 차례인 쪽이 k수 안에 반드시 이기는 첫 수, 없으면 null */
export function forcedWin(d: Dict, c: string, k: number, used: Set<string>, t?: Table): string | null {
	if (k <= 0) return null;
	for (const w of movesFrom(d, c, used)) {
		if (t && (t.lose.get(last(w)) ?? 99) > k - 1) continue;
		if (winsWith(d, w, k, used, t)) return w;
	}
	return null;
}
