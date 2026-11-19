import { error } from '@sveltejs/kit';
import { kstDayNumber } from '$lib/game';
import { parseGrid } from '$lib/crossword';
import { CROSSWORD_FIRST_DAY, CROSSWORD_PUZZLES } from '$lib/data/crosswordPuzzles';
import type { EntryGenerator } from './$types';

// 지난 오늘의 낱말퍼즐 해설(2026-11-17) — 정답 판 · 열쇠 · 사전 뜻을 HTML에 굽는다. 오늘 · 앞날 판은 굽지 않는다(끝말잇기 해설과 같다).
export const prerender = true;

const past = () => CROSSWORD_PUZZLES.filter((_, i) => CROSSWORD_FIRST_DAY + i < kstDayNumber(Date.now()));

export const entries: EntryGenerator = () => past().map((p) => ({ date: p.date }));

export async function load({ params, fetch }) {
	const p = past().find((x) => x.date === params.date);
	if (!p) error(404, '없는 날이에요');
	const g = parseGrid(p.rows);
	const cho = (w: string) => Math.floor((w.charCodeAt(0) - 0xac00) / 588);
	const need = [...new Set(g.words.map((w) => cho(w.answer)))];
	const parts = await Promise.all(
		need.map(async (n) => {
			const r = await fetch(`/kkeut/defs/${n}.json`);
			if (!r.ok) throw new Error(`뜻풀이 조각 ${n}.json 없음`);
			return r.json();
		})
	);
	const words = g.words.map((w) => ({
		num: w.num,
		dir: w.dir,
		answer: w.answer,
		clue: p.clues[w.answer] ?? '',
		def: p.defs?.[w.answer] ?? parts.find((x) => x[w.answer])?.[w.answer] ?? ''
	}));
	const i = CROSSWORD_PUZZLES.indexOf(p);
	return {
		p,
		chars: g.chars,
		black: g.black,
		numbers: g.numbers,
		words,
		prev: CROSSWORD_PUZZLES[i - 1]?.date ?? null,
		next: past()[i + 1]?.date ?? null
	};
}
