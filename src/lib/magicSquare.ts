/* /read/magic-square 글 끝 「직접 채워 보기」 판의 규칙.
   글이 검색 입구 1위인데(11/12~18 검색 세션 40) 읽고 나서 손으로 해 볼 곳이 없었다(11/19). */

export type Size = 3 | 4 | 5;

/** n×n 마방진 한 줄의 합 — 1~n²의 합을 n줄로 나눈 것 */
export const target = (n: number) => (n * (n * n + 1)) / 2;

/** 본문 「대각선 뒤집기」로 만든 4×4, 시암 방법으로 만든 5×5 정답 */
const SOLUTION: Record<4 | 5, number[]> = {
	4: [16, 2, 3, 13, 5, 11, 10, 8, 9, 7, 6, 12, 4, 14, 15, 1],
	5: [17, 24, 1, 8, 15, 23, 5, 7, 14, 16, 4, 6, 13, 20, 22, 10, 12, 19, 21, 3, 11, 18, 25, 2, 9]
};

/** 처음 판 — 0은 빈칸. 3×3은 빈 판, 4×4는 대각선이 아닌 칸, 5×5는 1~10을 미리 둔다 */
export function startBoard(n: Size): number[] {
	if (n === 3) return Array(9).fill(0);
	if (n === 4) {
		const 대각선 = new Set([0, 5, 10, 15, 3, 6, 9, 12]);
		return SOLUTION[4].map((v, i) => (대각선.has(i) ? 0 : v));
	}
	return SOLUTION[5].map((v) => (v <= 10 ? v : 0));
}

/** 행 n개 · 열 n개 · 대각선 ↘ · ↙의 합. 빈칸이 하나라도 있는 줄은 null */
export function lineSums(b: number[], n: number) {
	const sum = (idx: number[]) => (idx.some((i) => !b[i]) ? null : idx.reduce((s, i) => s + b[i], 0));
	const r = [...Array(n).keys()];
	return {
		rows: r.map((y) => sum(r.map((x) => y * n + x))),
		cols: r.map((x) => sum(r.map((y) => y * n + x))),
		diag: sum(r.map((k) => k * n + k)),
		anti: sum(r.map((k) => k * n + (n - 1 - k)))
	};
}

/** 두 번 이상 들어간 수 */
export function duplicates(b: number[]): Set<number> {
	const seen = new Set<number>();
	const dup = new Set<number>();
	for (const v of b) if (v) (seen.has(v) ? dup : seen).add(v);
	return dup;
}

/** 1~n²가 한 번씩 들어가고 모든 줄의 합이 같다 */
export function isSolved(b: number[], n: number): boolean {
	if (b.length !== n * n || duplicates(b).size) return false;
	if (b.some((v) => v < 1 || v > n * n)) return false;
	const s = lineSums(b, n);
	const t = target(n);
	return [...s.rows, ...s.cols, s.diag, s.anti].every((v) => v === t);
}
