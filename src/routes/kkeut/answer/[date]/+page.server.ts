import { error } from '@sveltejs/kit';
import { kstDayNumber } from '$lib/game';
import { dueum, last, makeDict, movesFrom } from '$lib/kkeut';
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
	// 사전으로 그 자리의 갈래를 센다(11/6) — 칸마다 낼 수 있던 말 수, 마지막 수 자리에서 바로 막는 다른 말
	const wr = await fetch('/kkeut/words.json');
	if (!wr.ok) throw new Error('words.json 없음');
	const wj = await wr.json();
	const d = makeDict(wj.words, wj.easy);
	const options = p.line.map((_, i) => movesFrom(d, last(words[i]), new Set(words.slice(0, i + 1))).length);
	const L = p.line.length;
	const before = new Set(words.slice(0, L));
	const blocks = movesFrom(d, last(words[L - 1]), before).filter(
		(w) => movesFrom(d, last(w), new Set([...before, w])).length === 0
	);
	const others = blocks.filter((w) => w !== p.line[L - 1]);
	// 첫 수의 함정(1수 퍼즐만 보인다) — 짧고 쉬운 말인데 컴퓨터가 받아치는 것과 그 받는 말
	const used0 = new Set([p.start]);
	const traps = movesFrom(d, last(p.start), used0)
		.filter((w) => d.easy.has(w) && w !== p.line[0])
		.sort((a, b) => a.length - b.length)
		.map((w) => {
			const rs = movesFrom(d, last(w), new Set([p.start, w]));
			return { w, r: rs.filter((r) => d.easy.has(r)).sort((a, b) => a.length - b.length)[0] ?? rs[0] };
		})
		.filter((x) => x.r)
		.slice(0, 4);
	const defs: Record<string, string> = {};
	for (const w of words) defs[w] = parts.find((x) => x[w])?.[w] ?? '';
	const i = KKEUT_PUZZLES.indexOf(p);
	return {
		p,
		defs,
		options,
		traps,
		blockCount: blocks.length,
		others: others.slice(0, 12),
		othersMore: Math.max(0, others.length - 12),
		n: (p.line.length + 1) / 2,
		end: last(p.line[p.line.length - 1]),
		du: dueum(last(p.line[p.line.length - 1])) !== null,
		prev: KKEUT_PUZZLES[i - 1]?.date ?? null,
		next: past()[i + 1]?.date ?? null
	};
}
