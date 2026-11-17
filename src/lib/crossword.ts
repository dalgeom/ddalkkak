/**
 * 가로세로 낱말퍼즐(2026-11-17). 판은 rows(■ = 검은 칸)와 열쇠만 저장하고, 낱말 · 번호는 여기서 뽑는다.
 * 낱말 = 가로 · 세로로 2칸 이상 이어진 흰 칸. 번호는 위에서 아래, 왼쪽에서 오른쪽으로 시작 칸에 매긴다.
 * checkPuzzle은 생성기(--check)와 테스트가 같이 쓴다.
 */
export const BLACK = '■';
const HANGUL = /^[가-힣]$/;

export type Dir = 'across' | 'down';
export type Word = { num: number; dir: Dir; cells: number[]; answer: string };
export type Grid = { size: number; chars: string[]; black: boolean[]; numbers: (number | null)[]; words: Word[] };

export function parseGrid(rows: string[]): Grid {
	const size = rows.length;
	const chars = rows.flatMap((r) => [...r]);
	const black = chars.map((c) => c === BLACK);
	const isWhite = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size && !black[r * size + c];
	const numbers: (number | null)[] = Array(size * size).fill(null);
	const words: Word[] = [];
	let n = 0;
	for (let r = 0; r < size; r++)
		for (let c = 0; c < size; c++) {
			if (!isWhite(r, c)) continue;
			const starts: Dir[] = [];
			if (!isWhite(r, c - 1) && isWhite(r, c + 1)) starts.push('across');
			if (!isWhite(r - 1, c) && isWhite(r + 1, c)) starts.push('down');
			if (!starts.length) continue;
			numbers[r * size + c] = ++n;
			for (const dir of starts) {
				const cells: number[] = [];
				for (let k = 0; dir === 'across' ? isWhite(r, c + k) : isWhite(r + k, c); k++)
					cells.push(dir === 'across' ? r * size + c + k : (r + k) * size + c);
				words.push({ num: n, dir, cells, answer: cells.map((i) => chars[i]).join('') });
			}
		}
	return { size, chars, black, numbers, words };
}

/** 판 하나의 규칙 위반 목록(빈 배열 = 통과). has를 주면 낱말이 사전에 있는지도 본다 */
export function checkPuzzle(
	p: { rows: string[]; clues: Record<string, string> },
	has?: (w: string) => boolean
): string[] {
	const why: string[] = [];
	if (p.rows.length !== 5) why.push(`줄 수 ${p.rows.length}`);
	p.rows.forEach((r, i) => {
		if ([...r].length !== 5) why.push(`${i + 1}줄 칸 수 ${[...r].length}`);
		for (const ch of r) if (ch !== BLACK && !HANGUL.test(ch)) why.push(`${i + 1}줄 이상한 글자 「${ch}」`);
	});
	if (why.length) return why;
	const g = parseGrid(p.rows);
	const covered = new Set(g.words.flatMap((w) => w.cells));
	const whites = g.black.flatMap((b, i) => (b ? [] : [i]));
	for (const i of whites) if (!covered.has(i)) why.push(`낱말에 안 속한 칸 ${i}`);
	// 섬: 흰 칸이 모두 이어져 있어야 한다
	if (whites.length) {
		const seen = new Set([whites[0]]);
		const q = [whites[0]];
		while (q.length) {
			const i = q.pop()!;
			const r = Math.floor(i / 5), c = i % 5;
			for (const [R, C] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
				const j = R * 5 + C;
				if (R < 0 || C < 0 || R > 4 || C > 4 || g.black[j] || seen.has(j)) continue;
				seen.add(j);
				q.push(j);
			}
		}
		if (seen.size !== whites.length) why.push('떨어진 섬이 있다');
	}
	const answers = g.words.map((w) => w.answer);
	for (const a of new Set(answers.filter((a, i) => answers.indexOf(a) !== i))) why.push(`같은 낱말 두 번: ${a}`);
	for (const a of answers) {
		const clue = p.clues[a];
		if (!clue?.trim()) why.push(`열쇠 없음: ${a}`);
		else if (clue.includes(a)) why.push(`열쇠에 답이 있다: ${a}`);
		if (has && !has(a)) why.push(`사전에 없음: ${a}`);
	}
	for (const k of Object.keys(p.clues)) if (!answers.includes(k)) why.push(`쓰이지 않는 열쇠: ${k}`);
	return why;
}

/** 운영에서는 오늘까지만 연다. 앞날은 dev에서만(정답 미리 보기 방지) */
export function canOpenDay(day: number, today: number, isDev: boolean): boolean {
	return isDev || day <= today;
}

/** 넣기 입력 정리 — 앞뒤 공백 · 사이 공백을 지우고, 한글 완성형만이면 그 글자들을, 아니면 null */
export function cleanEntry(s: string): string | null {
	const t = s.replace(/\s+/g, '');
	return t && /^[가-힣]+$/.test(t) ? t : null;
}
