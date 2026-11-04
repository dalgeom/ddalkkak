/**
 * 성냥 문제 만들기(/matchstick/make, 2026-11-04) — 맞는 식을 넣으면, 성냥을 움직여 그 식이 되는 틀린 식(문제)을 모두 찾는다.
 * 정답 찾기(matchSolve)를 거꾸로 돈다. 1개 옮기기의 반대는 1개 옮기기, 1개 빼기 문제는 정답에 1개를 더한 식, 1개 더하기 문제는 1개를 뺀 식이다.
 * 2개 옮기기는 경우가 수만 개라 휴대폰에서 답 수를 다 셀 수 없어 뺐다.
 * 만든 문제마다 matchSolve.solve로 답 수를 센다 — 답이 하나뿐인 문제가 좋은 문제다.
 */
import { SEG_KEYS, bit, type MatchRule, type SegKey } from './matchstick';
import { cellsText, isTrueText, parseCells, solve, type Cell, type Slot, type Solution } from './matchSolve';

export type MakeRule = Exclude<MatchRule, 'move2'>;
export const MAKE_RULES: MakeRule[] = ['move1', 'remove1', 'add1'];

export type Made = {
	/** 문제 식, 예: '6+4=4' */
	text: string;
	cells: Cell[];
	/** 이 문제의 답 전부(넣은 식이 그중 하나) */
	answers: Solution[];
	/** 넣은 식으로 가는 답 — 그림에 어느 성냥을 옮기는지 그린다 */
	mine: Solution;
};

function slots(cells: Cell[]): { lit: Slot[]; empty: Slot[] } {
	const lit: Slot[] = [];
	const empty: Slot[] = [];
	cells.forEach((c, ci) => {
		if (c.k === 'd') for (const seg of SEG_KEYS) ((c.m & bit(seg)) !== 0 ? lit : empty).push({ ci, seg });
		else if (c.k === 'o') (c.plus ? lit : empty).push({ ci, seg: 'v' });
	});
	return { lit, empty };
}

function flip(cells: Cell[], s: Slot): void {
	const c = cells[s.ci];
	if (c.k === 'd') c.m ^= bit(s.seg as SegKey);
	else if (c.k === 'o') c.plus = !c.plus;
}

/** 식으로 읽히는가 — 숫자 모양이고, 0으로 시작하는 두 자리 수(08)가 없다 */
function readable(text: string | null): text is string {
	return !!text && !('error' in parseCells(text)) && !/(^|[+\-=])0\d/.test(text);
}

/** 맞는 식 text에서 규칙 rule의 문제를 모두 만든다. 답이 하나뿐인 문제가 앞, 그다음 답 수 · 식 순 */
export function makeProblems(cells: Cell[], rule: MakeRule): Made[] {
	const target = cellsText(cells);
	if (!target || !isTrueText(target)) return [];
	const { lit, empty } = slots(cells);
	// 문제에서 답으로 가는 움직임의 반대 — 정답에서 뺄 자리 · 놓을 자리
	const takes = rule === 'remove1' ? [null] : lit;
	const puts = rule === 'add1' ? [null] : empty;
	const seen = new Map<string, Made>();
	for (const t of takes)
		for (const p of puts) {
			const next = cells.map((c) => ({ ...c }));
			if (t) flip(next, t);
			if (p) flip(next, p);
			const text = cellsText(next);
			if (!readable(text) || isTrueText(text) || seen.has(text)) continue;
			const answers = solve(next, rule);
			const mine = answers.find((a) => a.text === target);
			if (mine) seen.set(text, { text, cells: next, answers, mine });
		}
	return [...seen.values()].sort((a, b) => a.answers.length - b.answers.length || a.text.localeCompare(b.text));
}
