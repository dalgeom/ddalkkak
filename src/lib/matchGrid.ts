/**
 * 그림 성냥(2026-10-14) — 네모 격자 위에서 성냥을 옮기는 문제. /matchstick/picture.
 *
 * 등식 성냥(matchstick.ts)은 숫자 7획 칸 안에서만 옮긴다. 여기는 칸의 변이면 어디든 놓을 수 있다.
 * 변 표기: 'h,x,y' = 점 (x,y)–(x+1,y) 가로, 'v,x,y' = 점 (x,y)–(x,y+1) 세로. 판은 w×h 칸.
 *
 * 정답은 두 가지로 판정한다.
 *   squares  크기와 상관없는 정사각형이 정확히 n개이고 남는 성냥이 없다(답이 여럿이어도 다 정답)
 *   shape    목표 그림과 평행이동으로 겹친다(돌리거나 뒤집은 것은 다른 그림 — 「반대쪽을 보게」가 성립하려면)
 *
 * 문제는 손으로 고르고 프로그램으로 검증했다(matchGrid.test.ts): 시작은 정답이 아니고, 적힌 개수보다
 * 적게 옮겨서는 안 풀리며, answer(정답 보기)는 정확히 그 개수를 옮긴 정답이다. 4×4 격자 전수 조사에서
 * 「같은 크기·남는 성냥 없이」 규칙으로는 쓸 만한 문제가 3개뿐이라 크기 상관없는 규칙을 쓴다.
 */

export type GridGoal = { squares: number } | { shape: string[] };

export interface GridPuzzle {
	id: string;
	title: string;
	/** 지문 — 규칙(몇 개 옮기기, 무엇을 만들기)을 다 적는다. 힌트에만 있는 조건은 없는 것으로 친다 */
	ask: string;
	hint: string;
	w: number;
	h: number;
	start: string[];
	moves: number;
	goal: GridGoal;
	/** 정답 보기에 쓰는 한 가지 */
	answer: string[];
}

const SQ_ASK = (moves: number, from: number, to: number) =>
	`성냥 ${moves}개를 옮겨 정사각형 ${from}개를 ${to}개로 만드세요. 크기는 상관없고, 남는 성냥이 없어야 해요.`;

export const GRID_PUZZLES: GridPuzzle[] = [
	{
		id: 'dog',
		title: '강아지 돌려세우기',
		ask: '성냥 1개를 옮겨 강아지가 오른쪽을 보게 하세요.',
		hint: '강아지의 목과 꼬리는 둘 다 위로 솟은 성냥 하나예요.',
		w: 5,
		h: 3,
		start: ['h,1,1', 'h,2,1', 'v,1,1', 'v,3,1', 'v,1,0', 'h,0,0', 'v,3,0'],
		moves: 1,
		goal: { shape: ['h,1,1', 'h,2,1', 'v,1,1', 'v,3,1', 'v,3,0', 'h,3,0', 'v,1,0'] },
		answer: ['h,1,1', 'h,2,1', 'v,1,1', 'v,3,1', 'v,1,0', 'v,3,0', 'h,3,0']
	},
	{
		id: 'sq-stairs',
		title: '계단 정사각형',
		ask: SQ_ASK(2, 3, 2),
		hint: '두 정사각형이 함께 쓰는 성냥이 있어요. 하나를 없애면서 그 성냥을 살려 두세요.',
		w: 4,
		h: 4,
		start: ['h,1,2', 'h,1,3', 'v,1,2', 'v,2,2', 'h,2,2', 'h,2,3', 'v,3,2', 'h,2,1', 'v,2,1', 'v,3,1'],
		moves: 2,
		goal: { squares: 2 },
		answer: ['h,1,3', 'v,1,2', 'h,2,2', 'h,2,3', 'v,3,2', 'h,2,1', 'v,2,1', 'v,3,1', 'h,1,1', 'v,1,1']
	},
	{
		id: 'mieum-rieul',
		title: 'ㅁ을 ㄹ로',
		ask: '성냥 2개를 옮겨 ㅁ을 ㄹ로 바꾸세요. 글자는 판 어디에 만들어도 돼요.',
		hint: 'ㅁ과 ㄹ은 맨 위·맨 아래 가로 성냥이 같아요. 세로 성냥을 보세요.',
		w: 4,
		h: 3,
		start: ['h,1,0', 'h,2,0', 'h,1,2', 'h,2,2', 'v,1,0', 'v,1,1', 'v,3,0', 'v,3,1'],
		moves: 2,
		goal: { shape: ['h,0,0', 'h,1,0', 'v,2,0', 'h,0,1', 'h,1,1', 'v,0,1', 'h,0,2', 'h,1,2'] },
		answer: ['h,1,0', 'h,2,0', 'h,1,2', 'h,2,2', 'v,1,1', 'v,3,0', 'h,1,1', 'h,2,1']
	},
	{
		id: 'sq-L',
		title: 'ㄱ자 정사각형',
		ask: SQ_ASK(2, 4, 3),
		hint: '남는 성냥이 없어야 해요. 정사각형 하나를 허물고, 거기서 나온 성냥이 다른 정사각형의 변이 되게 해 보세요.',
		w: 5,
		h: 4,
		start: ['h,1,1', 'h,1,2', 'v,1,1', 'v,2,1', 'h,2,1', 'h,2,2', 'v,3,1', 'h,3,1', 'h,3,2', 'v,4,1', 'h,3,3', 'v,3,2', 'v,4,2'],
		moves: 2,
		goal: { squares: 3 },
		answer: ['h,1,1', 'h,1,2', 'v,1,1', 'v,2,1', 'h,2,1', 'h,3,1', 'h,3,2', 'v,4,1', 'h,3,3', 'v,3,2', 'v,4,2', 'h,2,3', 'v,2,2']
	},
	{
		id: 'rieul-bieup',
		title: 'ㄹ을 ㅂ으로',
		ask: '성냥 2개를 옮겨 ㄹ을 ㅂ으로 바꾸세요. 글자는 판 어디에 만들어도 돼요.',
		hint: 'ㅂ에는 맨 위 가로 성냥이 없어요.',
		w: 4,
		h: 3,
		start: ['h,1,0', 'h,2,0', 'v,3,0', 'h,1,1', 'h,2,1', 'v,1,1', 'h,1,2', 'h,2,2'],
		moves: 2,
		goal: { shape: ['v,0,0', 'v,0,1', 'v,2,0', 'v,2,1', 'h,0,1', 'h,1,1', 'h,0,2', 'h,1,2'] },
		answer: ['v,3,0', 'h,1,1', 'h,2,1', 'v,1,1', 'h,1,2', 'h,2,2', 'v,1,0', 'v,3,1']
	},
	{
		id: 'sq-T',
		title: 'T자 정사각형',
		ask: SQ_ASK(2, 4, 3),
		hint: '가운데 정사각형은 세 정사각형과 성냥을 나눠 써요. 거기서부터 보세요.',
		w: 5,
		h: 4,
		start: ['h,1,1', 'h,1,2', 'v,1,1', 'v,2,1', 'h,2,1', 'h,2,2', 'v,3,1', 'h,3,1', 'h,3,2', 'v,4,1', 'h,2,3', 'v,2,2', 'v,3,2'],
		moves: 2,
		goal: { squares: 3 },
		answer: ['h,1,1', 'v,1,1', 'h,2,1', 'h,2,2', 'v,3,1', 'h,3,1', 'h,3,2', 'v,4,1', 'h,2,3', 'v,2,2', 'v,3,2', 'h,1,3', 'v,1,2']
	},
	{
		id: 'bieup-tieut',
		title: 'ㅂ을 ㅌ으로',
		ask: '성냥 2개를 옮겨 ㅂ을 ㅌ으로 바꾸세요. 글자는 판 어디에 만들어도 돼요.',
		hint: 'ㅌ은 오른쪽 세로 성냥이 없고, 맨 위가 막혀 있어요.',
		w: 4,
		h: 3,
		start: ['v,1,0', 'v,1,1', 'v,3,0', 'v,3,1', 'h,1,1', 'h,2,1', 'h,1,2', 'h,2,2'],
		moves: 2,
		goal: { shape: ['h,0,0', 'h,1,0', 'v,0,0', 'v,0,1', 'h,0,1', 'h,1,1', 'h,0,2', 'h,1,2'] },
		answer: ['v,1,0', 'v,1,1', 'h,1,1', 'h,2,1', 'h,1,2', 'h,2,2', 'h,1,0', 'h,2,0']
	},
	{
		id: 'sq-cross',
		title: '십자 정사각형',
		ask: SQ_ASK(2, 5, 4),
		hint: '가운데 정사각형은 네 팔과 성냥을 하나씩 나눠 써요. 팔 하나를 허물 때 무엇이 함께 무너지는지 보세요.',
		w: 5,
		h: 5,
		start: ['h,2,1', 'h,2,2', 'v,2,1', 'v,3,1', 'h,1,2', 'h,1,3', 'v,1,2', 'v,2,2', 'h,2,3', 'v,3,2', 'h,3,2', 'h,3,3', 'v,4,2', 'h,2,4', 'v,2,3', 'v,3,3'],
		moves: 2,
		goal: { squares: 4 },
		answer: ['h,2,1', 'v,3,1', 'h,1,2', 'h,1,3', 'v,1,2', 'v,2,2', 'h,2,3', 'v,3,2', 'h,3,2', 'h,3,3', 'v,4,2', 'h,2,4', 'v,2,3', 'v,3,3', 'h,1,1', 'v,1,1']
	},
	{
		id: 'sq-2x2',
		title: '2×2 정사각형',
		ask: SQ_ASK(3, 5, 3),
		hint: '지금은 작은 정사각형 4개와 큰 정사각형 1개, 모두 5개예요.',
		w: 4,
		h: 4,
		start: ['h,1,1', 'h,1,2', 'v,1,1', 'v,2,1', 'h,2,1', 'h,2,2', 'v,3,1', 'h,1,3', 'v,1,2', 'v,2,2', 'h,2,3', 'v,3,2'],
		moves: 3,
		goal: { squares: 3 },
		answer: ['h,1,2', 'v,2,1', 'h,2,1', 'h,2,2', 'v,3,1', 'h,1,3', 'v,1,2', 'v,2,2', 'v,3,2', 'h,3,2', 'h,3,3', 'v,4,2']
	},
	{
		id: 'sq-2x3',
		title: '2×3 정사각형',
		ask: SQ_ASK(3, 8, 3),
		hint: '지금은 작은 정사각형 6개와 2×2 크기 2개, 모두 8개예요.',
		w: 5,
		h: 4,
		start: ['h,1,1', 'h,1,2', 'v,1,1', 'v,2,1', 'h,2,1', 'h,2,2', 'v,3,1', 'h,3,1', 'h,3,2', 'v,4,1', 'h,1,3', 'v,1,2', 'v,2,2', 'h,2,3', 'v,3,2', 'h,3,3', 'v,4,2'],
		moves: 3,
		goal: { squares: 3 },
		answer: ['h,1,1', 'v,1,1', 'v,2,1', 'h,2,1', 'v,3,1', 'h,3,1', 'v,4,1', 'h,1,3', 'v,1,2', 'v,2,2', 'h,2,3', 'v,3,2', 'h,3,3', 'v,4,2', 'h,1,0', 'v,1,0', 'v,2,0']
	}
];

export const gridPuzzleById = (id: string) => GRID_PUZZLES.find((p) => p.id === id);

/** 판의 모든 변(성냥 자리) */
export function gridEdges(w: number, h: number): string[] {
	const E: string[] = [];
	for (let y = 0; y <= h; y++) for (let x = 0; x < w; x++) E.push(`h,${x},${y}`);
	for (let y = 0; y < h; y++) for (let x = 0; x <= w; x++) E.push(`v,${x},${y}`);
	return E;
}

/** 크기 상관없는 정사각형 개수. 어느 정사각형에도 안 들어가는 성냥이 있으면 -1 */
export function countSquares(lit: Set<string>, w: number, h: number): number {
	const used = new Set<string>();
	let n = 0;
	for (let s = 1; s <= Math.min(w, h); s++)
		for (let y = 0; y + s <= h; y++)
			for (let x = 0; x + s <= w; x++) {
				const per: string[] = [];
				for (let t = 0; t < s; t++)
					per.push(`h,${x + t},${y}`, `h,${x + t},${y + s}`, `v,${x},${y + t}`, `v,${x + s},${y + t}`);
				if (per.every((e) => lit.has(e))) {
					n++;
					per.forEach((e) => used.add(e));
				}
			}
	for (const e of lit) if (!used.has(e)) return -1;
	return n;
}

/** 평행이동을 지운 모양 — 같은 그림이면 같은 문자열 */
export function shapeKey(lit: Iterable<string>): string {
	const es = [...lit].map((e) => e.split(','));
	const mx = Math.min(...es.map((e) => +e[1]));
	const my = Math.min(...es.map((e) => +e[2]));
	return es
		.map(([k, x, y]) => `${k},${+x - mx},${+y - my}`)
		.sort()
		.join('|');
}

/** 시작 배치에서 빠진 수·새로 놓인 수 */
export function gridMoved(p: GridPuzzle, lit: Set<string>): { removed: number; added: number } {
	const start = new Set(p.start);
	return {
		removed: p.start.filter((e) => !lit.has(e)).length,
		added: [...lit].filter((e) => !start.has(e)).length
	};
}

/** 손을 하나 쓴 뒤의 판정 — 적힌 개수만큼 옮기기 전에는 'more'라 되돌리지 않는다 */
export function judgeGrid(p: GridPuzzle, lit: Set<string>): 'solved' | 'more' | 'wrong' {
	const { removed, added } = gridMoved(p, lit);
	if (removed > p.moves || added > p.moves) return 'wrong';
	if (removed < p.moves || added < p.moves) return 'more';
	const ok =
		'squares' in p.goal ? countSquares(lit, p.w, p.h) === p.goal.squares : shapeKey(lit) === shapeKey(p.goal.shape);
	return ok ? 'solved' : 'wrong';
}
