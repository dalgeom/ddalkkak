/**
 * 초성 퀴즈 — 초성 뽑기·채점·오늘의 초성.
 *
 * 2026-09-29 자동완성 실측으로 만들었다. 「초성 퀴즈 사이트」「초성 퀴즈 게임」이
 * 네이버·구글 양쪽에 뜨고(바로 풀 곳을 찾는 수요), 구글 트렌드 한국 12개월 평균이
 * 「상식 퀴즈」의 1.8배였다. 네이버 절대 검색량은 재지 못했다 — 효과는 노출로 판정한다.
 */
import { CHOSUNG_CATEGORIES, type ChosungEntry } from './data/chosung';
import { seededOrder, SITE_START_DAY } from './game';

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

/** 한글 음절은 초성으로, 그 밖의 글자는 그대로 둔다 */
export function chosungOf(word: string): string {
	return [...word]
		.map((ch) => {
			const c = ch.charCodeAt(0) - 0xac00;
			return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch;
		})
		.join('');
}

export type ChosungWord = { word: string; hint: string; alts: string[]; category: string };

/**
 * 낱말을 늘린 이력. 분야마다 새 낱말은 words 끝에 붙이고, 전체 목록(CHOSUNG_WORDS)은 묶음 순서로 쌓는다.
 * 그래야 앞 묶음 낱말의 번호가 그대로라 지난 날의 오늘의 초성과 기기에 남은 기록이 안 바뀐다.
 * 마지막 묶음의 수는 words 길이와 같아야 한다(chosung.test.ts).
 */
export const CHOSUNG_BATCHES: { fromDay: number; counts: Record<string, number> }[] = [
	{ fromDay: 0, counts: { animal: 52, food: 48, 'fruit-vegetable': 42, country: 42, idiom: 40 } },
	// 10/15 배포, 10/16(20742)부터 오늘의 초성이 324개 순서로 돈다
	{ fromDay: 20742, counts: { animal: 72, food: 68, 'fruit-vegetable': 62, country: 62, idiom: 60 } }
];

const toWord = (slug: string) => ([word, hint, alts]: ChosungEntry) => ({ word, hint, alts: alts ?? [], category: slug });

export const CHOSUNG_WORDS: ChosungWord[] = CHOSUNG_BATCHES.flatMap((b, bi) =>
	CHOSUNG_CATEGORIES.flatMap((c) =>
		c.words.slice(bi ? CHOSUNG_BATCHES[bi - 1].counts[c.slug] : 0, b.counts[c.slug]).map(toWord(c.slug))
	)
);

export function categoryBySlug(slug: string) {
	return CHOSUNG_CATEGORIES.find((c) => c.slug === slug);
}

const norm = (s: string) => s.replace(/\s+/g, '').trim();

/**
 * 채점. 정답 낱말·다른 표기에 더해, **같은 분야에서 초성이 같은 낱말**도 받는다
 * (ㄱㄹ에 고래를 냈는데 기린을 쳐도 맞다). 규칙에 맞는 낱말을 찾는 놀이이지
 * 출제자의 머릿속을 맞히는 놀이가 아니다.
 */
export function isCorrect(target: ChosungWord, answer: string): boolean {
	const a = norm(answer);
	if (!a) return false;
	if (a === target.word || target.alts.includes(a)) return true;
	const cho = chosungOf(target.word);
	return CHOSUNG_WORDS.some(
		(w) => w.category === target.category && w.word === a && chosungOf(w.word) === cho
	);
}

/** 한 분야 안에서 초성이 겹치는 낱말 묶음 — 분야 페이지에 싣고, 테스트가 채점과 맞춰 본다 */
export function collisionsOf(slug: string): { cho: string; words: string[] }[] {
	const by = new Map<string, string[]>();
	for (const w of CHOSUNG_WORDS.filter((x) => x.category === slug)) {
		const k = chosungOf(w.word);
		by.set(k, [...(by.get(k) ?? []), w.word]);
	}
	return [...by].filter(([, ws]) => ws.length > 1).map(([cho, words]) => ({ cho, words }));
}

/**
 * 오늘의 초성 — 그날까지 열린 낱말을 시드 순열로 하루 한 칸씩. 한 바퀴 돌기 전엔 겹치지 않는다.
 * 낱말 수는 그날의 묶음(CHOSUNG_BATCHES)을 따른다 — 낱말을 늘려도 지난 날짜의 답은 그대로다.
 */
export function chosungOfDay(day: number): number {
	const b = [...CHOSUNG_BATCHES].reverse().find((x) => x.fromDay <= day) ?? CHOSUNG_BATCHES[0];
	const n = Object.values(b.counts).reduce((a, v) => a + v, 0);
	const order = seededOrder(n, 20260404);
	return order[(((day - SITE_START_DAY) % n) + n) % n];
}
