import { makeDict, movesFrom, last } from '$lib/kkeut';

// 끝말잇기 단어 찾기(2026-11-04) — 검색은 브라우저에서 한다. 한방 끝 글자 표는 빌드에 구워 HTML에 남긴다.
export const prerender = true;

export async function load({ fetch }) {
	const r = await fetch('/kkeut/words.json');
	if (!r.ok) throw new Error('words.json 없음');
	const j: { words: string[]; easy: string[] } = await r.json();
	const d = makeDict(j.words, j.easy);
	// 끝 글자별로 그 글자로 끝나는 말을 모은다 — 받을 말이 하나도 없으면 한방 끝 글자
	const byLast = new Map<string, string[]>();
	for (const w of d.words) {
		const c = last(w);
		const a = byLast.get(c);
		if (a) a.push(w);
		else byLast.set(c, [w]);
	}
	const hanbang = [...byLast]
		.filter(([c]) => movesFrom(d, c).length === 0)
		.map(([c, ws]) => {
			const easy = ws.filter((w) => d.easy.has(w));
			const ex = [...easy, ...ws.filter((w) => !d.easy.has(w))].slice(0, 3);
			return { c, n: ws.length, ex };
		})
		.sort((a, b) => b.n - a.n);
	return { total: d.words.length, hanbang, hanbangWords: hanbang.reduce((s, h) => s + h.n, 0) };
}
