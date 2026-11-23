/**
 * 그림 방정식 — 오늘의 10문제 4번 칸(11/24부터).
 *
 * 그림 셋이 1~9 사이의 수를 하나씩 숨긴다. 세 줄의 식에서 값을 찾아 마지막 식을 계산한다.
 * 날짜 시드로 만들고, 1~9 전부를 대입해 세 줄을 만족하는 값이 하나뿐인 것만 낸다.
 * 곱셈이 섞인 식은 곱셈을 먼저 한다 — 해설에 그 순서를 적는다.
 */
export type Equation = {
	symbols: [string, string, string];
	lines: { expr: string; total: number }[];
	question: string;
	answer: number;
	values: [number, number, number];
	steps: string[];
};

const SETS: [string, string, string][] = [
	['🍎', '🍌', '🍇'],
	['🐶', '🐱', '🐰'],
	['⭐', '🌙', '☀️'],
	['🍩', '🍪', '🍰'],
	['🚗', '🚲', '🚌'],
	['🌷', '🌻', '🍀'],
	['⚽', '🏀', '🎾']
];

/** 수 뒤 목적격 조사 — 일·삼·육·칠·팔과 0으로 끝나는 수(영·십·백)는 받침이 있다 */
const eul = (n: number) => ([0, 1, 3, 6, 7, 8].includes(Math.abs(n) % 10) ? '을' : '를');

type Tpl = {
	lines: string[];
	q: string;
	/** 값이 이 조건을 넘어야 낸다(뺄셈이 0 이하가 되지 않게 등) */
	ok?: (a: number, b: number, c: number) => boolean;
	steps: (s: [string, string, string], v: [number, number, number], t: number[]) => string[];
};

const TPLS: Tpl[] = [
	{
		lines: ['A + A + A', 'A + B + B', 'B + C + C'],
		q: 'A + B + C',
		steps: ([A, B, C], [a, b, c], t) => [
			`첫 줄: ${A} 세 개가 ${t[0]}이니 ${A} = ${a}`,
			`둘째 줄: ${t[1]}에서 ${A}(${a})${eul(a)} 빼면 ${t[1] - a}, 이것이 ${B} 두 개라 ${B} = ${b}`,
			`셋째 줄: ${t[2]}에서 ${B}(${b})${eul(b)} 빼면 ${t[2] - b}, 이것이 ${C} 두 개라 ${C} = ${c}`
		]
	},
	{
		lines: ['A + A', 'A + B', 'B − C'],
		q: 'A + B × C',
		ok: (a, b, c) => b > c,
		steps: ([A, B, C], [a, b, c], t) => [
			`첫 줄: ${A} 두 개가 ${t[0]}이니 ${A} = ${a}`,
			`둘째 줄: ${t[1]} − ${a} = ${b}, 그래서 ${B} = ${b}`,
			`셋째 줄: ${b} − ${C} = ${t[2]}이니 ${C} = ${c}`,
			`마지막 줄은 곱셈을 먼저 — ${b} × ${c} = ${b * c}, 여기에 ${a}${eul(a)} 더한다`
		]
	},
	{
		lines: ['A + B', 'B + C', 'A + C'],
		q: 'A × B − C',
		ok: (a, b, c) => a * b > c,
		steps: ([A, B, C], [a, b, c], t) => [
			`세 줄을 모두 더하면 ${A} · ${B} · ${C}가 두 번씩 — ${t[0] + t[1] + t[2]}, 그래서 셋의 합은 ${(t[0] + t[1] + t[2]) / 2}`,
			`합에서 둘째 줄(${t[1]})을 빼면 ${A} = ${a}, 셋째 줄(${t[2]})을 빼면 ${B} = ${b}, 첫 줄(${t[0]})을 빼면 ${C} = ${c}`,
			`마지막 줄은 곱셈을 먼저 — ${a} × ${b} = ${a * b}, 여기서 ${c}${eul(c)} 뺀다`
		]
	},
	{
		lines: ['A × A', 'A + B', 'B × C'],
		q: 'C + A × B',
		steps: ([A, B, C], [a, b, c], t) => [
			`첫 줄: 같은 수를 두 번 곱해 ${t[0]}이니 ${A} = ${a}`,
			`둘째 줄: ${t[1]} − ${a} = ${b}, 그래서 ${B} = ${b}`,
			`셋째 줄: ${b} × ${C} = ${t[2]}이니 ${C} = ${c}`,
			`마지막 줄은 곱셈을 먼저 — ${a} × ${b} = ${a * b}, 여기에 ${c}${eul(c)} 더한다`
		]
	}
];

/** + − × 만 있는 식. 곱셈을 먼저 한다 */
export function evalExpr(expr: string, v: Record<string, number>): number {
	const tok = expr.split(' ');
	const terms: number[] = [];
	const ops: string[] = [];
	let cur = v[tok[0]];
	for (let i = 1; i < tok.length; i += 2) {
		const op = tok[i];
		const x = v[tok[i + 1]];
		if (op === '×') cur *= x;
		else {
			terms.push(cur);
			ops.push(op);
			cur = x;
		}
	}
	terms.push(cur);
	return terms.slice(1).reduce((acc, x, i) => (ops[i] === '+' ? acc + x : acc - x), terms[0]);
}

function rng(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** 세 줄을 만족하는 (A, B, C)가 1~9 안에 몇 개인가 */
export function countSolutions(lines: string[], totals: number[]): number {
	let n = 0;
	for (let a = 1; a <= 9; a++)
		for (let b = 1; b <= 9; b++)
			for (let c = 1; c <= 9; c++)
				if (lines.every((l, i) => evalExpr(l, { A: a, B: b, C: c }) === totals[i])) n++;
	return n;
}

export function equationAt(day: number): Equation {
	const r = rng(day * 6151 + 29);
	const tpl = TPLS[((day % TPLS.length) + TPLS.length) % TPLS.length];
	const sym = SETS[Math.floor(r() * SETS.length)];
	for (;;) {
		const pick = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		for (let i = 8; i > 0; i--) {
			const j = Math.floor(r() * (i + 1));
			[pick[i], pick[j]] = [pick[j], pick[i]];
		}
		const [a, b, c] = pick;
		if (tpl.ok && !tpl.ok(a, b, c)) continue;
		const v = { A: a, B: b, C: c };
		const totals = tpl.lines.map((l) => evalExpr(l, v));
		if (totals.some((t) => t <= 0) || countSolutions(tpl.lines, totals) !== 1) continue;
		const answer = evalExpr(tpl.q, v);
		if (answer <= 0) continue;
		const show = (e: string) => e.replace(/[ABC]/g, (k) => sym['ABC'.indexOf(k)]);
		const values: [number, number, number] = [a, b, c];
		return {
			symbols: sym,
			lines: tpl.lines.map((l, i) => ({ expr: show(l), total: totals[i] })),
			question: show(tpl.q),
			answer,
			values,
			steps: [...tpl.steps(sym, values, totals), `${show(tpl.q)} = ${answer}`]
		};
	}
}
