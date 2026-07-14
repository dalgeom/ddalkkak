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

/** 정확히 성냥 하나를 옮겨 참이 되었는가 */
export function isSolved(orig: Board, cur: Board): boolean {
	const { removed, added } = moveDiff(orig, cur);
	return removed === 1 && added === 1 && isTrue(cur);
}

function popcount(n: number): number {
	let c = 0;
	while (n) {
		n &= n - 1;
		c++;
	}
	return c;
}
