/** 성냥개비 등식 게임 로직 */

export interface MatchProblem {
	displayed: string;
	solution: string;
}

export const SEG_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
export type SegKey = (typeof SEG_KEYS)[number];

const DIGIT_SEGS = [
	'abcdef',
	'bc',
	'abdeg',
	'abcdg',
	'bcfg',
	'acdfg',
	'acdefg',
	'abc',
	'abcdefg',
	'abcdfg'
];

export function toMask(s: string): number {
	return [...s].reduce((m, ch) => m | (1 << (ch.charCodeAt(0) - 97)), 0);
}
export function bit(seg: SegKey): number {
	return 1 << (seg.charCodeAt(0) - 97);
}

export const DIGIT_MASKS = DIGIT_SEGS.map(toMask);
export const MASK_TO_DIGIT = new Map(DIGIT_MASKS.map((m, d) => [m, d]));

/** 보드 상태: 숫자 글리프 마스크들 + 연산자(+/-) */
export interface Board {
	glyphs: number[];
	opPlus: boolean;
	cLen: number;
}

/** "8 - 0 = 8" / "1 + 5 = 18" 형식 파싱 */
export function parseEq(str: string): Board {
	const m = str.match(/^(\d) ([+-]) (\d) = (\d{1,2})$/);
	if (!m) throw new Error(`잘못된 등식: ${str}`);
	const cDigits = [...m[4]].map(Number);
	return {
		glyphs: [Number(m[1]), Number(m[3]), ...cDigits].map((d) => DIGIT_MASKS[d]),
		opPlus: m[2] === '+',
		cLen: cDigits.length
	};
}

export function digitsOf(b: Board): (number | undefined)[] {
	return b.glyphs.map((m) => MASK_TO_DIGIT.get(m));
}

export function isTrue(b: Board): boolean {
	const d = digitsOf(b);
	if (d.some((x) => x === undefined)) return false;
	const c = b.cLen === 1 ? d[2]! : d[2]! * 10 + d[3]!;
	return b.opPlus ? d[0]! + d[1]! === c : d[0]! - d[1]! === c;
}

export function eqString(b: Board): string {
	const d = digitsOf(b);
	if (d.some((x) => x === undefined)) return '(불완전)';
	const c = b.cLen === 1 ? `${d[2]}` : `${d[2]}${d[3]}`;
	return `${d[0]} ${b.opPlus ? '+' : '-'} ${d[1]} = ${c}`;
}

export function cloneBoard(b: Board): Board {
	return { glyphs: b.glyphs.slice(), opPlus: b.opPlus, cLen: b.cLen };
}

/** 원본 대비 이동량: 제거/추가된 성냥 개수 */
export function moveDiff(orig: Board, cur: Board): { removed: number; added: number } {
	let removed = 0;
	let added = 0;
	orig.glyphs.forEach((om, i) => {
		const cm = cur.glyphs[i];
		removed += popcount(om & ~cm);
		added += popcount(cm & ~om);
	});
	if (orig.opPlus && !cur.opPlus) removed++;
	if (!orig.opPlus && cur.opPlus) added++;
	return { removed, added };
}

/**
 * 힌트 두 단계 — 성냥을 빼는 곳, 꽂는 곳. 준비한 풀이(solution) 기준이다.
 * 오늘의 성냥개비는 10/2~10/11 시작 30명 중 19명이 정답 보기로 끝났는데, 막혔을 때 잡을 단계가
 * 정답 보기뿐이었다(오늘의 초성은 힌트가 있고 10명 중 7명이 맞혔다).
 */
export function moveHints(p: MatchProblem): [string, string] {
	const o = parseEq(p.displayed);
	const s = parseEq(p.solution);
	const d = digitsOf(o);
	const where = (gi: number) => {
		if (gi === 0) return `맨 앞 숫자 「${d[0]}」`;
		if (gi === 1) return `기호 뒤 숫자 「${d[1]}」`;
		if (o.cLen === 1) return `= 뒤 숫자 「${d[2]}」`;
		return `= 뒤 「${d[2]}${d[3]}」의 ${gi === 2 ? '앞자리' : '뒷자리'} 「${d[gi]}」`;
	};
	const op = `기호 「${o.opPlus ? '+' : '−'}」`;
	const from = o.opPlus && !s.opPlus ? op : where(o.glyphs.findIndex((m, i) => m & ~s.glyphs[i]));
	const to = !o.opPlus && s.opPlus ? op : where(o.glyphs.findIndex((m, i) => s.glyphs[i] & ~m));
	return [`성냥을 빼는 곳: ${from}`, from === to ? '뺀 성냥을 같은 숫자 안에 다시 꽂아요' : `꽂는 곳: ${to}`];
}

/** 정확히 성냥 하나를 옮겨 참이 되었는가 */
export function isSolved(orig: Board, cur: Board): boolean {
	const { removed, added } = moveDiff(orig, cur);
	return removed === 1 && added === 1 && isTrue(cur);
}

/** 단계 모드의 문제 규칙(2026-10-14). 기존 741개는 전부 move1이다 */
export type MatchRule = 'move1' | 'move2' | 'remove1' | 'add1';

/** 규칙마다 끝났을 때의 뺀 수·꽂은 수 */
export const RULE_DIFF: Record<MatchRule, { removed: number; added: number }> = {
	move1: { removed: 1, added: 1 },
	move2: { removed: 2, added: 2 },
	remove1: { removed: 1, added: 0 },
	add1: { removed: 0, added: 1 }
};

/**
 * 손을 하나 쓴 뒤의 판정. 'more'는 아직 덜 옮겼다는 뜻이라 되돌리지 않고 계속 받는다.
 * 2개 옮기기에서 첫 번째를 옮긴 직후(뺀 1·꽂은 1)가 그 경우다.
 */
export function judgeRule(orig: Board, cur: Board, rule: MatchRule): 'solved' | 'more' | 'wrong' {
	const d = moveDiff(orig, cur);
	const need = RULE_DIFF[rule];
	if (d.removed > need.removed || d.added > need.added) return 'wrong';
	if (d.removed < need.removed || d.added < need.added) return 'more';
	return isTrue(cur) ? 'solved' : 'wrong';
}

function popcount(n: number): number {
	let c = 0;
	while (n) {
		n &= n - 1;
		c++;
	}
	return c;
}
