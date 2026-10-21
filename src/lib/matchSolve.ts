/**
 * 성냥 정답 찾기(/matchstick/solve, 2026-10-21) — 사람이 넣은 식의 답을 모두 찾는다.
 *
 * 네이버에서 「12-7=6 성냥 한개만 옮겨서」처럼 식을 그대로 치고 들어오는 사람이 한 달 200명쯤인데
 * (9/21~10/21, 네이버 → /matchstick 착지), 그 식은 대개 우리 문제은행에 없다(두 자리 수 · 다른 규칙).
 * 그래서 문제은행 밖의 아무 식이나 푸는 풀이기를 둔다. 규칙은 사이트와 같다 —
 * 숫자는 7획, + 는 세로 획만 움직이고 가로 획과 = 는 고정, 없는 자리는 새로 못 만든다.
 * 이 규칙으로 문제은행 741개를 풀면 정답이 하나씩 그대로 나온다(matchSolve.test.ts).
 */
import { DIGIT_MASKS, MASK_TO_DIGIT, SEG_KEYS, bit, type MatchRule, type SegKey } from './matchstick';

/** 식의 한 칸 — 숫자(7획 마스크) · 연산자(+면 세로 획이 있다) · 등호 */
export type Cell = { k: 'd'; m: number } | { k: 'o'; plus: boolean } | { k: 'e' };

/** 움직일 수 있는 자리 — 숫자의 획, 또는 연산자의 세로 획('v') */
export type Slot = { ci: number; seg: SegKey | 'v' };

export type Solution = {
	/** 답 식, 예: '13-7=6' */
	text: string;
	cells: Cell[];
	/** 성냥을 뺀 자리 */
	removed: Slot[];
	/** 성냥을 놓은 자리 */
	added: Slot[];
};

export const MAX_LEN = 15;

export const RULE_LABEL: Record<MatchRule, string> = {
	move1: '1개 옮기기',
	move2: '2개 옮기기',
	remove1: '1개 빼기',
	add1: '1개 더하기'
};
export const RULES: MatchRule[] = ['move1', 'move2', 'remove1', 'add1'];

/** 넣은 글자를 식 문자열로 고른다(공백 · 여러 가지 빼기 · 전각 기호) */
export function normalize(input: string): string {
	return input
		.replace(/\s+/g, '')
		.replace(/[−–—ー－]/g, '-')
		.replace(/[＋]/g, '+')
		.replace(/[＝]/g, '=')
		.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/**
 * 식 문자열을 칸으로. 못 읽으면 그 까닭을 사람 말로 돌려준다.
 * unfinished는 아직 쓰는 중일 수 있는 모양(= 가 없음 · 끝이 기호)이라 화면이 누르기 전까지 말하지 않는다.
 */
export function parseCells(input: string): { cells: Cell[]; text: string } | { error: string; unfinished?: true } {
	const s = normalize(input);
	if (!s) return { error: '식을 넣어 주세요.', unfinished: true };
	if (/[x×*/÷]/i.test(s)) return { error: '곱하기와 나누기는 아직 못 풀어요. + 와 − 만 넣어 주세요.' };
	if (!/^[0-9+\-=]+$/.test(s)) return { error: '숫자와 + − = 만 넣을 수 있어요.' };
	if (s.length > MAX_LEN) return { error: `식이 너무 길어요. ${MAX_LEN}글자까지 넣을 수 있어요.` };
	const eqs = (s.match(/=/g) ?? []).length;
	if (eqs > 1) return { error: '= 는 하나만 넣어 주세요.' };
	if (eqs === 0) return { error: '= 가 하나 있어야 해요.', unfinished: true };
	const [l, r] = s.split('=');
	if (!SIDE.test(l) || !SIDE.test(r))
		return { error: '식 모양을 다시 봐 주세요. 예: 12-7=6', ...(/[+\-=]$/.test(s) || !r ? { unfinished: true as const } : {}) };
	const cells: Cell[] = [...s].map((ch) =>
		ch === '=' ? { k: 'e' } : ch === '+' || ch === '-' ? { k: 'o', plus: ch === '+' } : { k: 'd', m: DIGIT_MASKS[Number(ch)] }
	);
	return { cells, text: s };
}

const SIDE = /^\d+([+-]\d+)*$/;

/** 칸을 식 문자열로. 숫자가 아닌 모양이 있으면 null */
export function cellsText(cells: Cell[]): string | null {
	let out = '';
	for (const c of cells) {
		if (c.k === 'e') out += '=';
		else if (c.k === 'o') out += c.plus ? '+' : '-';
		else {
			const d = MASK_TO_DIGIT.get(c.m);
			if (d === undefined) return null;
			out += d;
		}
	}
	return out;
}

function sideValue(side: string): number | null {
	if (!SIDE.test(side)) return null;
	// 두 자리 이상인데 0으로 시작하면 수가 아니다(08)
	if (/(^|[+-])0\d/.test(side)) return null;
	let v = 0;
	for (const t of side.match(/[+-]?\d+/g)!) v += Number(t);
	return v;
}

/** 식 문자열이 참인가 */
export function isTrueText(text: string | null): boolean {
	if (!text) return false;
	const parts = text.split('=');
	if (parts.length !== 2) return false;
	const a = sideValue(parts[0]);
	const b = sideValue(parts[1]);
	return a !== null && b !== null && a === b;
}

function slotsOf(cells: Cell[]): { lit: Slot[]; empty: Slot[] } {
	const lit: Slot[] = [];
	const empty: Slot[] = [];
	cells.forEach((c, ci) => {
		if (c.k === 'd') for (const seg of SEG_KEYS) ((c.m & bit(seg)) !== 0 ? lit : empty).push({ ci, seg });
		else if (c.k === 'o') (c.plus ? lit : empty).push({ ci, seg: 'v' });
	});
	return { lit, empty };
}

function toggle(cells: Cell[], s: Slot): void {
	const c = cells[s.ci];
	if (c.k === 'd') c.m ^= bit(s.seg as SegKey);
	else if (c.k === 'o') c.plus = !c.plus;
}

function pairs<T>(xs: T[]): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) out.push([xs[i], xs[j]]);
	return out;
}

/** 규칙대로 성냥을 움직여 참이 되는 식을 모두 찾는다(같은 식은 하나로) */
export function solve(cells: Cell[], rule: MatchRule): Solution[] {
	const { lit, empty } = slotsOf(cells);
	const takes = rule === 'add1' ? [[]] : rule === 'move2' ? pairs(lit) : lit.map((s) => [s]);
	const puts = rule === 'remove1' ? [[]] : rule === 'move2' ? pairs(empty) : empty.map((s) => [s]);
	const found = new Map<string, Solution>();
	for (const removed of takes)
		for (const added of puts) {
			const next = cells.map((c) => ({ ...c }));
			for (const s of [...removed, ...added]) toggle(next, s);
			const text = cellsText(next);
			if (text && isTrueText(text) && !found.has(text)) found.set(text, { text, cells: next, removed, added });
		}
	return [...found.values()];
}

/** 답에서 바뀐 칸을 「8 → 6 · − → +」처럼 한 줄로 */
export function changeLine(before: Cell[], after: Cell[]): string {
	const b = cellsText(before) ?? '';
	const a = cellsText(after) ?? '';
	const sym = (ch: string) => (ch === '-' ? '−' : ch);
	const out: string[] = [];
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(`${sym(b[i])} → ${sym(a[i])}`);
	return out.join(' · ');
}

/** 화면에 보이는 식(빼기는 −, 기호 양옆 띄움) */
export function pretty(text: string): string {
	return text.replace(/([+\-=])/g, ' $1 ').replace(/-/g, '−');
}
