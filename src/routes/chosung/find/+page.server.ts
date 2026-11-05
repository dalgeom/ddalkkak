import { CHOSUNG_WORDS, chosungOf } from '$lib/chosung';

// 초성으로 단어 찾기(2026-11-05) — 검색은 브라우저에서 한다. 「자주 쓰는 초성」 표는 빌드에 구워 HTML에 남긴다.
export const prerender = true;

export async function load({ fetch }) {
	const r = await fetch('/kkeut/words.json');
	if (!r.ok) throw new Error('words.json 없음');
	const j: { words: string[]; easy: string[] } = await r.json();
	// 초성 퀴즈 정답 낱말은 뺀다 — 도구가 오늘의 초성을 풀어 주면 퀴즈가 무너진다
	const hide = [...new Set(CHOSUNG_WORDS.map((w) => w.word))];
	const hidden = new Set(hide);
	const easy = new Set(j.easy);
	// 쉬운 두 글자 말이 많은 초성부터 — 처음 온 사람이 눌러 볼 예시
	const by = new Map<string, string[]>();
	for (const w of j.words) {
		if (w.length !== 2 || !easy.has(w) || hidden.has(w)) continue;
		const k = chosungOf(w);
		const a = by.get(k);
		if (a) a.push(w);
		else by.set(k, [w]);
	}
	const common = [...by]
		.sort((a, b) => b[1].length - a[1].length)
		.slice(0, 24)
		.map(([cho, ws]) => ({ cho, n: ws.length, ex: ws.slice(0, 3) }));
	return { total: j.words.length - j.words.filter((w) => hidden.has(w)).length, hide, common };
}
