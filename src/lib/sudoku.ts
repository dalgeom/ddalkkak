/**
 * 미니 스도쿠 — 날짜 시드로 만든다. 짝수 날 4×4(2×2 상자), 홀수 날 6×6(2행×3열 상자).
 * 해가 하나뿐인 퍼즐만 낸다(빈칸을 하나씩 늘리며 해 개수를 센다).
 */
export type Sudoku = { size: 4 | 6; boxR: number; boxC: number; givens: number[]; solution: number[] };

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

function shuffle<T>(a: T[], r: () => number): T[] {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function ok(g: number[], n: number, br: number, bc: number, i: number, v: number): boolean {
	const r = Math.floor(i / n), c = i % n;
	for (let k = 0; k < n; k++) if (g[r * n + k] === v || g[k * n + c] === v) return false;
	const r0 = r - (r % br), c0 = c - (c % bc);
	for (let y = 0; y < br; y++) for (let x = 0; x < bc; x++) if (g[(r0 + y) * n + c0 + x] === v) return false;
	return true;
}

function fill(g: number[], n: number, br: number, bc: number, r: () => number): boolean {
	const i = g.indexOf(0);
	if (i < 0) return true;
	for (const v of shuffle([...Array(n)].map((_, k) => k + 1), r)) {
		if (!ok(g, n, br, bc, i, v)) continue;
		g[i] = v;
		if (fill(g, n, br, bc, r)) return true;
		g[i] = 0;
	}
	return false;
}

export function countSolutions(g: number[], n: number, br: number, bc: number, cap = 2): number {
	const i = g.indexOf(0);
	if (i < 0) return 1;
	let cnt = 0;
	for (let v = 1; v <= n && cnt < cap; v++) {
		if (!ok(g, n, br, bc, i, v)) continue;
		g[i] = v;
		cnt += countSolutions(g, n, br, bc, cap - cnt);
		g[i] = 0;
	}
	return cnt;
}

export function sudokuAt(day: number): Sudoku {
	const size: 4 | 6 = day % 2 === 0 ? 4 : 6;
	const [br, bc] = size === 4 ? [2, 2] : [2, 3];
	const r = rng(day * 7919 + 17);
	const sol = Array(size * size).fill(0);
	fill(sol, size, br, bc, r);
	const givens = [...sol];
	// 4×4는 빈칸 8~10, 6×6은 빈칸 18~22 정도가 몇 분짜리
	const target = size === 4 ? 10 : 22;
	let blanks = 0;
	for (const i of shuffle([...Array(size * size).keys()], r)) {
		if (blanks >= target) break;
		const keep = givens[i];
		givens[i] = 0;
		if (countSolutions([...givens], size, br, bc) !== 1) givens[i] = keep;
		else blanks++;
	}
	return { size, boxR: br, boxC: bc, givens, solution: sol };
}
