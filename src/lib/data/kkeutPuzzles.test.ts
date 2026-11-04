import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { kstDayNumber } from '$lib/game';
import { charTable, last, makeDict, movesFrom, puzzleMoves, startsFor } from '$lib/kkeut';
import { newPuzzle, play } from '$lib/kkeutGame';
import { KKEUT_FIRST_DAY, KKEUT_PUZZLES, puzzleFor } from './kkeutPuzzles';

const j = JSON.parse(readFileSync('static/kkeut/words.json', 'utf8'));
const d = makeDict(j.words, j.easy);
const dateOf = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);

describe('오늘의 끝말잇기 퍼즐', () => {
	it('첫날부터 하루도 빠짐없이 이어진다', () => {
		KKEUT_PUZZLES.forEach((p, i) => expect(p.date).toBe(dateOf(KKEUT_FIRST_DAY + i)));
	});
	it('요일별 수와 정답 길 길이가 맞는다', () => {
		KKEUT_PUZZLES.forEach((p, i) => expect((p.line.length + 1) / 2, p.date).toBe(puzzleMoves(KKEUT_FIRST_DAY + i)));
	});
	it('시작 단어는 쉬운 말, 정답 길은 사전 명사로 이어진다', () => {
		for (const p of KKEUT_PUZZLES) {
			expect(d.easy.has(p.start), p.start).toBe(true);
			let prev = p.start;
			for (const w of p.line) {
				expect(d.has.has(w), w).toBe(true);
				expect(startsFor(last(prev)).includes(w[0]), `${prev} → ${w}`).toBe(true);
				prev = w;
			}
			expect(movesFrom(d, last(prev), new Set([p.start, ...p.line])), `${p.date} 마지막 말`).toEqual([]);
		}
	});
	it('정답 길대로 두면 컴퓨터도 길대로 받고 사람이 이긴다(rand와 무관)', () => {
		const t = charTable(d);
		for (const p of KKEUT_PUZZLES)
			for (const r of [0, 0.999]) {
				const g = newPuzzle(p.start, (p.line.length + 1) / 2, p.line);
				for (let i = 0; i < p.line.length; i += 2) play(g, d, t, p.line[i], () => r);
				expect(g.chain.map((x) => x.word), `${p.date} rand=${r}`).toEqual([p.start, ...p.line]);
				expect(g.end, `${p.date} rand=${r}`).toBe('win');
			}
	});
	it('오늘부터 7일치가 늘 준비되어 있다', () => {
		const from = Math.max(kstDayNumber(Date.now()), KKEUT_FIRST_DAY);
		for (let k = 0; k < 7; k++) expect(puzzleFor(from + k), dateOf(from + k)).not.toBeNull();
	});
});
