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
	const where = (gi: number) => spotName(o, gi);
	const op = `기호 「${o.opPlus ? '+' : '−'}」`;
	const from = o.opPlus && !s.opPlus ? op : where(o.glyphs.findIndex((m, i) => m & ~s.glyphs[i]));
	const to = !o.opPlus && s.opPlus ? op : where(o.glyphs.findIndex((m, i) => s.glyphs[i] & ~m));
	return [`성냥을 빼는 곳: ${from}`, from === to ? '뺀 성냥을 같은 숫자 안에 다시 꽂아요' : `꽂는 곳: ${to}`];
}

const SEG_KO: Record<SegKey, string> = { a: '위', b: '오른쪽 위', c: '오른쪽 아래', d: '아래', e: '왼쪽 아래', f: '왼쪽 위', g: '가운데' };

/**
 * 성냥 하나 옮기기 해설 한 문장(10/22). 해설이 「성냥 하나만 옮겨 6 − 2 = 4를 만들면 참」뿐이라
 * 어느 성냥을 어디로 옮겼는지 몰랐다(직접 풀어 보고 확인). 빼는 자리 · 놓는 자리 · 바뀐 숫자를 말로 적는다.
 */
export function moveSentence(p: MatchProblem): string {
	const o = parseEq(p.displayed);
	const s = parseEq(p.solution);
	const od = digitsOf(o);
	const sd = digitsOf(s);
	const segOf = (m: number) => SEG_KEYS.find((k) => m & bit(k))!;
	// 해설용 짧은 자리 이름(10/22 미리 풀기: 「= 뒤 「16」의 뒷자리 「6」의」가 딱딱했다). 힌트는 spotName 그대로
	const at = (gi: number) =>
		gi === 0 ? `맨 앞 「${od[0]}」` : gi === 1 ? `기호 뒤 「${od[1]}」` : o.cLen === 1 ? `답 「${od[2]}」` : `답 ${gi === 2 ? '첫자리' : '끝자리'} 「${od[gi]}」`;
	const fi = o.glyphs.findIndex((m, i) => m & ~s.glyphs[i]);
	const ti = o.glyphs.findIndex((m, i) => s.glyphs[i] & ~m);
	if (o.opPlus && !s.opPlus)
		return `기호 「+」의 세로 성냥을 빼서 ${at(ti)}의 ${SEG_KO[segOf(s.glyphs[ti] & ~o.glyphs[ti])]} 자리에 놓아요(+ → −, ${od[ti]} → ${sd[ti]}).`;
	if (!o.opPlus && s.opPlus)
		return `${at(fi)}의 ${SEG_KO[segOf(o.glyphs[fi] & ~s.glyphs[fi])]} 성냥을 빼서 기호 「−」에 세로로 꽂아요(${od[fi]} → ${sd[fi]}, − → +).`;
	const from = SEG_KO[segOf(o.glyphs[fi] & ~s.glyphs[fi])];
	const to = SEG_KO[segOf(s.glyphs[ti] & ~o.glyphs[ti])];
	if (fi === ti) return `${at(fi)}의 ${from} 성냥을 같은 숫자 ${to} 자리로 옮겨요(${od[fi]} → ${sd[fi]}).`;
	return `${at(fi)}의 ${from} 성냥을 빼서 ${at(ti)}의 ${to} 자리에 놓아요(${od[fi]} → ${sd[fi]}, ${od[ti]} → ${sd[ti]}).`;
}

/** 판 위 자리 이름 — moveHints·ruleHints가 쓴다 */
function spotName(o: Board, gi: number): string {
	const d = digitsOf(o);
	if (gi === 0) return `맨 앞 숫자 「${d[0]}」`;
	if (gi === 1) return `기호 뒤 숫자 「${d[1]}」`;
	if (o.cLen === 1) return `= 뒤 숫자 「${d[2]}」`;
	return `= 뒤 「${d[2]}${d[3]}」의 ${gi === 2 ? '앞자리' : '뒷자리'} 「${d[gi]}」`;
}

/**
 * 단계 모드 힌트(2026-10-14). move1은 moveHints 그대로, 빼기·더하기는 한 줄,
 * 2개 옮기기는 빼는 곳 → 꽂는 곳 두 줄이고 한 자리에서 둘이면 「~에서 2개」로 묶는다.
 */
export function ruleHints(p: MatchProblem, rule: MatchRule): string[] {
	if (rule === 'move1') return moveHints(p);
	const o = parseEq(p.displayed);
	const s = parseEq(p.solution);
	const from: string[] = [];
	const to: string[] = [];
	const put = (list: string[], name: string, n: number) => {
		if (n === 1) list.push(name);
		else if (n > 1) list.push(`${name}에서 ${n}개`);
	};
	o.glyphs.forEach((m, i) => {
		put(from, spotName(o, i), popcount(m & ~s.glyphs[i]));
		put(to, spotName(o, i), popcount(s.glyphs[i] & ~m));
	});
	const op = `기호 「${o.opPlus ? '+' : '−'}」`;
	if (o.opPlus && !s.opPlus) from.push(op);
	if (!o.opPlus && s.opPlus) to.push(op);
	if (rule === 'remove1') return [`성냥을 빼는 곳: ${from.join(', ')}`];
	if (rule === 'add1') return [`성냥을 꽂는 곳: ${to.join(', ')}`];
	return [`성냥을 빼는 곳: ${from.join(', ')}`, `꽂는 곳: ${to.join(', ')}`];
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
