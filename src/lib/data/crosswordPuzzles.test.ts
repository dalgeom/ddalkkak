import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { kstDayNumber } from '$lib/game';
import { checkPuzzle, parseGrid } from '$lib/crossword';
import { CROSSWORD_FIRST_DAY, CROSSWORD_PUZZLES, crosswordFor, dateOf } from './crosswordPuzzles';

const words = new Set<string>(JSON.parse(readFileSync('static/kkeut/words.json', 'utf8')).words);
const has = (w: string) => words.has(w);

describe('오늘의 가로세로 낱말퍼즐', () => {
	it('첫날부터 하루도 빠짐없이 이어진다', () => {
		CROSSWORD_PUZZLES.forEach((p, i) => expect(p.date).toBe(dateOf(CROSSWORD_FIRST_DAY + i)));
		expect(crosswordFor(CROSSWORD_FIRST_DAY)?.date).toBe(CROSSWORD_PUZZLES[0].date);
	});
	it('판이 7일 앞까지 있다', () => {
		const last = CROSSWORD_FIRST_DAY + CROSSWORD_PUZZLES.length - 1;
		expect(last, `마지막 판 ${dateOf(last)}`).toBeGreaterThanOrEqual(kstDayNumber(Date.now()) + 7);
	});
	it('모든 판이 규칙(모양 · 열쇠 · 사전)을 지킨다', () => {
		for (const p of CROSSWORD_PUZZLES) expect(checkPuzzle(p, has), p.date).toEqual([]);
	});
	it('판끼리 같은 낱말을 다시 쓰지 않는다', () => {
		const seen = new Map<string, string>();
		for (const p of CROSSWORD_PUZZLES)
			for (const w of parseGrid(p.rows).words) {
				expect(seen.get(w.answer), `${w.answer} — ${p.date}`).toBeUndefined();
				seen.set(w.answer, p.date);
			}
	});
	it('덮어쓴 뜻풀이(defs)는 그 판의 낱말에만 있다', () => {
		for (const p of CROSSWORD_PUZZLES)
			for (const w of Object.keys(p.defs ?? {})) expect(p.clues[w], `${p.date} ${w}`).toBeDefined();
	});
	it('양성 대조 — 검사기가 실제 판을 읽고 있다(한 칸 바꾸면 걸린다)', () => {
		const p = CROSSWORD_PUZZLES[0];
		const broken = { ...p, rows: [p.rows[0].replace(/^./, '뷁'), ...p.rows.slice(1)] };
		expect(checkPuzzle(broken, has).length).toBeGreaterThan(0);
	});
});
