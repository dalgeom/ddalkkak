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

/**
 * 분야 거르기(11/5) — 사용자 의견 「초성글자로 동물이름 알려주세요」(/chosung?c=animal, 11/4).
 * 사전에 분야 표시가 없어 뜻풀이 끝말로 가른다(「… 작은 새.」 · 「… 있는 나라.」). 「곤충」 · 「가축」처럼 이름이 아닌 묶음 말은 뺀다.
 * slug는 초성 퀴즈 분야(data/chosung.ts)와 같다.
 */
export const FIELDS = [
	{ slug: 'animal', name: '동물', re: /(^|[^나이] )(작은 |큰 )?(동물|짐승|새|물고기|바닷물고기|민물고기|곤충|벌레|조개|뱀)\.$/ },
	{ slug: 'fruit-vegetable', name: '과일·채소', re: /(^|[^나이] )(열매|과일|채소|나물)\.$/ },
	{ slug: 'country', name: '나라', re: /(있는|있던) (나라|공화국|왕국)\.$/ }
] as const;

const NOT_NAME = new Set(
	('침투 배태 느림보 늙다리 튀기 천적 사냥감 수놈 암놈 괴물 괴수 금수 가축 곤충 곤충류 갑각류 짐승 벌레 생선 성충 유충 치어 어족 해충 독충 ' +
		'맹수 야수 반려동물 애완동물 척추동물 무척추동물 연체동물 민물고기 바닷물고기 바닷새 날짐승 들짐승 산짐승 집짐승 길짐승 들새 산새 멧새 ' +
		'철새 날벌레 풀벌레 활어 대어 기생충 누렁이 ' +
		'쭉정이 과실 과일 과채류 실과 청과 청과물 푸성귀 산채 생채 견과 생과일 풋과일 햇과일 봄나물 산나물 들나물 풋나물 선악과 원두 커피 ' +
		'남국 북국 본국 주재국').split(' ')
);

export function fieldOf(word: string, def: string | undefined): string | null {
	if (!def || NOT_NAME.has(word)) return null;
	const d = def.trim();
	return FIELDS.find((f) => f.re.test(d))?.slug ?? null;
}
