/**
 * 전개도 퍼즐 — 정육면체 전개도를 접었을 때 나오는 주사위를 고른다.
 *
 * 성냥개비와 같은 원칙: 사람이 문제를 쓰지 않는다. 프로그램이 만들고 프로그램이 검증한다.
 * 정답이 하나뿐이라는 것도, 오답 셋이 물리적으로 불가능하다는 것도 기계가 보증한다.
 *
 * ── 접기 ──
 * 전개도 위에서 주사위를 굴린다고 생각하면 된다. 칸 하나에 주사위를 올려놓고
 * 이웃 칸으로 굴리면, 닿는 면이 그 칸의 면이 된다. 6칸을 다 돌면
 * 어느 면이 어디에 붙는지가 정해진다.
 *
 * 단, 주사위는 종이 '아래쪽'에 있다고 봐야 한다. 그림이 바깥으로 오게 접으면
 * 상자가 종이 반대편에 생기기 때문이다. 위에 놓고 굴리면 거울상이 나온다(paperFace 주석 참고).
 *
 * ── 마주 보는 면 ──
 * 굴려도 (바닥,천장) (앞,뒤) (좌,우) 짝은 절대 안 바뀐다. 그래서 이 세 짝이
 * 곧 마주 보는 면들이다. 기준 방향을 어떻게 잡든 같은 답이 나온다.
 *
 * ── 오답이 불가능하다는 검증 ──
 * 주사위를 돌리는 방법은 24가지뿐이다. 그 24가지에서 보이는 (윗면,왼면,오른면)
 * 조합을 전부 모아두고, 오답 보기가 그 목록에 없다는 걸 확인한다.
 * 거울상은 아무리 돌려도 못 만들기 때문에 이 검사에서 확실히 걸린다.
 */

/** 주사위의 여섯 자리. 값은 전개도 칸 번호(0~5), 아직 안 정해졌으면 -1. */
type Cube = { u: number; d: number; n: number; s: number; e: number; w: number };

const EMPTY: Cube = { u: -1, d: -1, n: -1, s: -1, e: -1, w: -1 };

/* 오른쪽으로 굴리면 바닥이 왼쪽으로 넘어가고, 오른쪽 면이 바닥이 된다. */
const rollE = (c: Cube): Cube => ({ d: c.e, e: c.u, u: c.w, w: c.d, n: c.n, s: c.s });
const rollW = (c: Cube): Cube => ({ d: c.w, w: c.u, u: c.e, e: c.d, n: c.n, s: c.s });
/* 화면 아래쪽으로 굴리기 / 위쪽으로 굴리기 */
const rollS = (c: Cube): Cube => ({ d: c.s, s: c.u, u: c.n, n: c.d, e: c.e, w: c.w });
const rollN = (c: Cube): Cube => ({ d: c.n, n: c.u, u: c.s, s: c.d, e: c.e, w: c.w });

export type Cell = { r: number; c: number };

/** 전개도 문자열('#'=칸)을 좌표 목록으로. */
export function parseNet(rows: string[]): Cell[] {
	const cells: Cell[] = [];
	rows.forEach((row, r) => {
		[...row].forEach((ch, c) => {
			if (ch === '#') cells.push({ r, c });
		});
	});
	return cells;
}

/* ───────────── 접기 ─────────────
 * 굴린 상태를 그대로 합치려다 실패했었다. 경로마다 주사위가 다른 방향을 보고 있어서,
 * "이 칸은 바닥"이라는 정보만으로는 서로 다른 경로의 결과를 맞붙일 수 없다.
 * 그래서 주사위 자체의 방향을 회전행렬로 들고 다니고, 각 칸이 주사위의 어느 면이 되는지를
 * 주사위 고유 좌표계에서 구한다. 이러면 경로와 상관없이 같은 답이 나온다.
 *
 * 세계 좌표: x = 오른쪽(열 증가), y = 아래쪽(행 증가), z = 종이 위로.
 * 주사위는 항상 바닥면이 종이(z 아래)에 닿아 있다.
 */
type Vec = [number, number, number];
type Mat = [Vec, Vec, Vec];

const I3: Mat = [
	[1, 0, 0],
	[0, 1, 0],
	[0, 0, 1]
];
/* 오른쪽으로 굴리기 = y축 +90도. 천장이 동쪽으로, 동쪽 면이 바닥으로 간다. */
const R_E: Mat = [
	[0, 0, 1],
	[0, 1, 0],
	[-1, 0, 0]
];
const R_W: Mat = [
	[0, 0, -1],
	[0, 1, 0],
	[1, 0, 0]
];
/* 아래쪽으로 굴리기 = x축 -90도 */
const R_S: Mat = [
	[1, 0, 0],
	[0, 0, 1],
	[0, -1, 0]
];
const R_N: Mat = [
	[1, 0, 0],
	[0, 0, -1],
	[0, 1, 0]
];

function matMul(A: Mat, B: Mat): Mat {
	const out: Mat = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	for (let i = 0; i < 3; i++)
		for (let j = 0; j < 3; j++) out[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
	return out;
}

/**
 * 지금 종이에 닿아 있는 면의 바깥쪽 법선을 주사위 고유 좌표계에서 본 것.
 *
 * 여기서 한 번 크게 틀렸다. 처음엔 주사위를 종이 '위에서' 굴린다고 보고
 * 닿는 면의 법선을 아래쪽(0,0,-1)으로 잡았다. 그런데 전개도를 실제로 접을 때는
 * 그림이 바깥으로 오도록 종이 '아래쪽으로' 접는다 — 상자가 종이의 반대편에 생긴다.
 * 두 모형은 종이면을 사이에 둔 거울상이라, 정답과 오답이 통째로 뒤바뀐다.
 * 브라우저에서 실제로 접어 렌더한 결과와 대조해서야 잡았다.
 */
function paperFace(M: Mat): Vec {
	return [M[2][0], M[2][1], M[2][2]];
}

const NORMAL_SLOT: Record<string, keyof Cube> = {
	'0,0,1': 'u',
	'0,0,-1': 'd',
	'0,-1,0': 'n',
	'0,1,0': 's',
	'1,0,0': 'e',
	'-1,0,0': 'w'
};

/**
 * 전개도를 접는다. 정육면체가 되면 각 자리에 들어간 칸 번호를, 안 되면 null.
 * 칸이 6개가 아니거나, 끊겨 있거나, 두 칸이 같은 면에 겹치면 실패한다.
 */
export function foldNet(cells: Cell[]): Cube | null {
	if (cells.length !== 6) return null;
	const at = new Map(cells.map((x, i) => [`${x.r},${x.c}`, i]));
	const normal = new Array<Vec | null>(6).fill(null);
	const stack: [number, Mat][] = [[0, I3]];

	while (stack.length) {
		const [idx, M] = stack.pop()!;
		if (normal[idx]) continue;
		normal[idx] = paperFace(M);
		const { r, c } = cells[idx];
		const moves: [number, number, Mat][] = [
			[r, c + 1, R_E],
			[r, c - 1, R_W],
			[r + 1, c, R_S],
			[r - 1, c, R_N]
		];
		for (const [nr, nc, R] of moves) {
			const ni = at.get(`${nr},${nc}`);
			if (ni === undefined || normal[ni]) continue;
			stack.push([ni, matMul(R, M)]);
		}
	}

	if (normal.some((n) => !n)) return null; // 끊긴 모양
	const cube: Cube = { ...EMPTY };
	for (let i = 0; i < 6; i++) {
		const slot = NORMAL_SLOT[normal[i]!.join(',')];
		if (!slot || cube[slot] !== -1) return null; // 두 칸이 같은 면에 겹친다 = 전개도가 아니다
		cube[slot] = i;
	}
	return cube;
}

/** 주사위를 돌리는 24가지 방법을 전부 만든다. */
export function allRotations(base: Cube): Cube[] {
	const key = (c: Cube) => `${c.u},${c.d},${c.n},${c.s},${c.e},${c.w}`;
	const seen = new Map<string, Cube>([[key(base), base]]);
	const queue = [base];
	while (queue.length) {
		const cur = queue.shift()!;
		for (const roll of [rollE, rollW, rollS, rollN]) {
			const next = roll(cur);
			const k = key(next);
			if (seen.has(k)) continue;
			seen.set(k, next);
			queue.push(next);
		}
	}
	return [...seen.values()];
}

/** 화면에 보이는 세 면 — 윗면, 왼쪽 면, 오른쪽 면. 이 '순서'가 곧 거울상 여부를 가른다. */
export type View = [number, number, number];

export function viewOf(c: Cube): View {
	return [c.u, c.s, c.e];
}

/** 실제로 만들 수 있는 모든 시점. 여기 없는 조합은 아무리 돌려도 못 만든다. */
export function achievableViews(base: Cube): Set<string> {
	return new Set(allRotations(base).map((c) => viewOf(c).join(',')));
}

/** 마주 보는 면 세 쌍. */
export function oppositePairs(c: Cube): [number, number][] {
	return [
		[c.u, c.d],
		[c.n, c.s],
		[c.e, c.w]
	];
}

/* ───────────── 전개도 후보 ───────────── */

export type Net = { rows: string[]; cells: Cell[]; cube: Cube };

/** 좌표를 왼쪽 위로 붙여 정규화한 뒤 비교용 문자열로. */
function normKey(cells: Cell[]): string {
	const minR = Math.min(...cells.map((x) => x.r));
	const minC = Math.min(...cells.map((x) => x.c));
	return cells
		.map((x) => `${x.r - minR},${x.c - minC}`)
		.sort()
		.join(' ');
}

function fromKey(key: string): Cell[] {
	return key.split(' ').map((s) => {
		const [r, c] = s.split(',').map(Number);
		return { r, c };
	});
}

function toRows(cells: Cell[]): string[] {
	const h = Math.max(...cells.map((x) => x.r)) + 1;
	const w = Math.max(...cells.map((x) => x.c)) + 1;
	const grid = Array.from({ length: h }, () => new Array(w).fill('.'));
	for (const { r, c } of cells) grid[r][c] = '#';
	return grid.map((row) => row.join(''));
}

/**
 * 여섯 칸짜리 연결된 조각을 전부 만든 뒤, 접히는 것만 남긴다.
 * 전개도를 손으로 적으면 반드시 몇 개는 틀린다 — 실제로 처음엔 24개 중 6개가 가짜였다.
 * 회전·뒤집기까지 전부 따로 세므로 생김새가 다양하게 나온다.
 */
function generateNets(): Net[] {
	let level = new Set<string>([normKey([{ r: 0, c: 0 }])]);
	for (let n = 1; n < 6; n++) {
		const next = new Set<string>();
		for (const key of level) {
			const cells = fromKey(key);
			const has = new Set(cells.map((x) => `${x.r},${x.c}`));
			for (const { r, c } of cells) {
				for (const [dr, dc] of [
					[0, 1],
					[0, -1],
					[1, 0],
					[-1, 0]
				]) {
					const nr = r + dr;
					const nc = c + dc;
					if (has.has(`${nr},${nc}`)) continue;
					next.add(normKey([...cells, { r: nr, c: nc }]));
				}
			}
		}
		level = next;
	}
	const out: Net[] = [];
	for (const key of level) {
		const cells = fromKey(key);
		const cube = foldNet(cells);
		if (cube) out.push({ rows: toRows(cells), cells, cube });
	}
	// 씨앗이 같으면 순서도 같아야 하므로 정렬해 고정한다
	return out.sort((a, b) => a.rows.join('/').localeCompare(b.rows.join('/')));
}

export const NETS: Net[] = generateNets();

/* ───────────── 면 기호 ───────────── */

/**
 * 여섯 면의 기호. 90도 돌려도 같은 모양만 쓴다 —
 * 접히면서 기호가 돌아가는데, 화살표나 숫자를 쓰면 "6이야 9야" 같은 시비가 붙는다.
 * 색만으로 구분하면 색각 이상이 있는 사람이 못 푼다. 그래서 색과 모양을 함께 준다.
 */
export type FaceShape = 'disc' | 'ring' | 'square' | 'frame' | 'plus' | 'dots';
export type Face = { shape: FaceShape; color: string; name: string };

/**
 * 처음엔 마름모와 엑스도 썼다. 그런데 마름모는 사각을 45도 돌린 것이고
 * 엑스는 십자를 45도 돌린 것이라, 3D로 돌려 보면 서로 구분이 안 됐다.
 * 그래서 회전이 아니라 채움 여부(원/고리, 사각/테두리)와 구조(십자/네 점)로 가른다.
 */
export const FACES: Face[] = [
	{ shape: 'disc', color: '#2f8f5b', name: '초록 원' },
	{ shape: 'ring', color: '#c0632e', name: '주황 고리' },
	{ shape: 'square', color: '#2f6f9f', name: '파랑 사각' },
	{ shape: 'frame', color: '#8a4fa8', name: '보라 테두리' },
	{ shape: 'plus', color: '#c93b3b', name: '빨강 십자' },
	{ shape: 'dots', color: '#6b6258', name: '회색 네점' }
];

/* ───────────── 문제 만들기 ───────────── */

/** 같은 씨앗이면 언제 어디서 돌려도 같은 문제가 나온다 (mulberry32). */
function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export type CubeNetProblem = {
	/** 전개도 그림 — 각 칸에 어떤 면 기호가 그려져 있나 (rows 좌표 순) */
	net: { rows: string[]; cells: Cell[]; faceOf: number[] };
	/** 보기 4개. 각각 [윗면, 왼면, 오른면] 기호 번호 */
	options: View[];
	/** 정답 보기 번호 */
	answer: number;
	/** 해설에 쓸 마주 보는 면 짝 */
	opposites: [number, number][];
};

/**
 * 문제 하나를 만든다. 만들지 못하면 null(호출부가 다음 씨앗으로 넘어간다).
 *
 * 오답은 세 가지 방식으로 만든다.
 *   1) 정답의 왼면·오른면을 맞바꾼 거울상 — 눈으로는 제일 헷갈리는데 절대 못 만든다
 *   2) 실제로는 마주 보는 두 면을 한 화면에 넣기 — 마주 본 면은 같이 안 보인다
 *   3) 세 면을 다른 순서로 돌려놓기
 * 만든 뒤에는 24가지 회전 목록과 대조해 정말 불가능한지 확인한다. 하나라도 통과 못 하면 문제를 버린다.
 */
export function makeProblem(seed: number): CubeNetProblem | null {
	const rand = rng(seed);
	const net = NETS[Math.floor(rand() * NETS.length)];

	// 전개도 칸 번호 → 면 기호 번호
	const faceOf = shuffled([0, 1, 2, 3, 4, 5], rand);
	const sym = (cellIdx: number) => faceOf[cellIdx];

	const rotations = allRotations(net.cube);
	const ok = new Set(rotations.map((c) => viewOf(c).map(sym).join(',')));

	// 정답은 24가지 중 하나를 고른다
	const base = rotations[Math.floor(rand() * rotations.length)];
	const correct = viewOf(base).map(sym) as View;

	const opp = oppositePairs(net.cube).map(([a, b]) => [sym(a), sym(b)]) as [number, number][];
	const oppOf = new Map<number, number>();
	for (const [a, b] of opp) {
		oppOf.set(a, b);
		oppOf.set(b, a);
	}

	const impossible = (v: View) => !ok.has(v.join(','));
	const wrong: View[] = [];
	const push = (v: View) => {
		if (!impossible(v)) return;
		if (new Set(v).size !== 3) return; // 같은 기호가 두 번 보이는 그림은 어색하다
		if (v.join(',') === correct.join(',')) return;
		if (wrong.some((w) => w.join(',') === v.join(','))) return;
		wrong.push(v);
	};

	// 1) 거울상
	push([correct[0], correct[2], correct[1]]);
	// 2) 마주 보는 면을 같은 화면에
	for (const i of [0, 1, 2]) {
		const other = oppOf.get(correct[(i + 1) % 3]);
		if (other === undefined) continue;
		const v = correct.slice() as View;
		v[i] = other;
		push(v);
	}
	// 3) 순서 돌리기
	push([correct[1], correct[0], correct[2]]);
	push([correct[2], correct[1], correct[0]]);
	push([correct[1], correct[2], correct[0]]);
	push([correct[2], correct[0], correct[1]]);

	if (wrong.length < 3) return null;

	const options = shuffled([correct, ...wrong.slice(0, 3)], rand);
	const answer = options.findIndex((v) => v.join(',') === correct.join(','));

	// 마지막 확인 — 보기 중 만들 수 있는 것이 정확히 하나인가
	const possibleCount = options.filter((v) => ok.has(v.join(','))).length;
	if (possibleCount !== 1 || answer < 0) return null;

	return {
		net: { rows: net.rows, cells: net.cells, faceOf },
		options,
		answer,
		opposites: opp
	};
}

/** 씨앗을 옮겨가며 확실히 한 문제를 만든다. */
export function problemAt(index: number): CubeNetProblem {
	for (let k = 0; k < 200; k++) {
		const p = makeProblem(index * 7919 + k);
		if (p) return p;
	}
	throw new Error('전개도 문제를 만들지 못했습니다');
}
