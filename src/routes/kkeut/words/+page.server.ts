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
	// 첫 글자별 한방 단어(11/16) — 「장 한방단어」처럼 글자로 찾는 사람용. 글자당 평균 2개라 쪽을 나누지 않고 초성 14묶음으로 한 쪽에 둔다.
	// 쌍자음은 기본 자음 묶음에 합친다(ㄲ→ㄱ) — 빠뜨리면 단어가 사라진다
	const dead = new Set(hanbang.map((h) => h.c));
	const GROUP = [0, 0, 1, 2, 2, 3, 4, 5, 5, 6, 6, 7, 8, 8, 9, 10, 11, 12, 13];
	const LABEL = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
	const byFirst = new Map<string, string[]>();
	for (const w of d.words) {
		if (!dead.has(last(w))) continue;
		const a = byFirst.get(w[0]);
		if (a) a.push(w);
		else byFirst.set(w[0], [w]);
	}
	const firstGroups = LABEL.map((g) => ({ g, rows: [] as { c: string; ws: string[] }[], n: 0 }));
	for (const [c, ws] of [...byFirst].sort(([a], [b]) => a.localeCompare(b, 'ko'))) {
		const grp = firstGroups[GROUP[Math.floor((c.charCodeAt(0) - 0xac00) / 588)]];
		grp.rows.push({ c, ws: [...ws.filter((w) => d.easy.has(w)), ...ws.filter((w) => !d.easy.has(w))] });
		grp.n += ws.length;
	}
	return {
		total: d.words.length,
		hanbang,
		hanbangWords: hanbang.reduce((s, h) => s + h.n, 0),
		firstChars: byFirst.size,
		firstGroups: firstGroups.filter((g) => g.n > 0)
	};
}
