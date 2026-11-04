import { error } from '@sveltejs/kit';
import { kstDayNumber } from '$lib/game';
import { dueum, last } from '$lib/kkeut';
import { KKEUT_FIRST_DAY, KKEUT_PUZZLES } from '$lib/data/kkeutPuzzles';
import type { EntryGenerator } from './$types';

// 지난 오늘의 끝말잇기 해설(2026-11-03) — 오간 말과 사전 뜻을 HTML에 굽는다. 오늘 · 앞날 퍼즐은 굽지 않는다.
export const prerender = true;

const past = () => KKEUT_PUZZLES.filter((_, i) => KKEUT_FIRST_DAY + i < kstDayNumber(Date.now()));

export const entries: EntryGenerator = () => past().map((p) => ({ date: p.date }));

export async function load({ params, fetch }) {
	const p = past().find((x) => x.date === params.date);
	if (!p) error(404, '없는 날이에요');
	const cho = (w: string) => Math.floor((w.charCodeAt(0) - 0xac00) / 588);
	const words = [p.start, ...p.line];
	const need = [...new Set(words.map(cho))];
	const parts = await Promise.all(
		need.map(async (n) => {
			const r = await fetch(`/kkeut/defs/${n}.json`);
			if (!r.ok) throw new Error(`뜻풀이 조각 ${n}.json 없음`);
			return r.json();
		})
	);
	const defs: Record<string, string> = {};
	for (const w of words) defs[w] = parts.find((x) => x[w])?.[w] ?? '';
	const i = KKEUT_PUZZLES.indexOf(p);
	return {
		p,
		defs,
		n: (p.line.length + 1) / 2,
		end: last(p.line[p.line.length - 1]),
		du: dueum(last(p.line[p.line.length - 1])) !== null,
		prev: KKEUT_PUZZLES[i - 1]?.date ?? null,
		next: past()[i + 1]?.date ?? null
	};
}
