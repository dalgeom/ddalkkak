/**
 * 초성으로 단어 찾기(2026-11-05) — 「ㅅㄱ」 · 「사ㄱ」처럼 초성(과 아는 글자)을 넣으면 사전에서 맞는 말을 찾는다.
 * 왜: GSC 28일 검색어에 「ㅁㅋㅅㅂㄷㅅㅅ」 · 「ㅂㅈ」 · 「ㅇㄷ」처럼 초성 그 자체가 노출됐다(n=5회) — 초성을 풀어 줄 곳을 찾는 수요로 보인다(가설).
 */
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const BASE = 0xac00;

/** 자리마다 초성 번호(0~18) 또는 음절 글자. 초성 자리가 하나도 없거나 받을 수 없는 글자가 있으면 null */
export type Pattern = (number | string)[];

export function parsePattern(input: string): Pattern | null {
	const cs = [...input.normalize('NFC').replace(/\s+/g, '')];
	if (!cs.length) return null;
	const out: Pattern = [];
	for (const c of cs) {
		const ci = CHO.indexOf(c);
		if (ci >= 0) out.push(ci);
		else {
			const o = c.charCodeAt(0) - BASE;
			if (o < 0 || o > 11171) return null;
			out.push(c);
		}
	}
	return out.some((p) => typeof p === 'number') ? out : null;
}

export function matchWords(words: string[], p: Pattern | null): string[] {
	if (!p) return [];
	return words.filter((w) => {
		if (w.length !== p.length) return false;
		for (let i = 0; i < p.length; i++) {
			const x = p[i];
			if (typeof x === 'number' ? Math.floor((w.charCodeAt(i) - BASE) / 588) !== x : w[i] !== x) return false;
		}
		return true;
	});
}

/** 첫 자리의 초성 번호 — 뜻풀이 조각(/kkeut/defs/번호.json)을 고른다 */
export function firstCho(p: Pattern): number {
	const x = p[0];
	return typeof x === 'number' ? x : Math.floor((x.charCodeAt(0) - BASE) / 588);
}
