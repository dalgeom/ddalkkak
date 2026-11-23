/**
 * 글자 섞기 — 오늘의 10문제 1번 칸(11/24부터).
 *
 * 영어 애너그램은 알파벳을 섞지만, 여기서는 한글 낱말의 「음절」을 섞는다(코끼리 → 리코끼).
 * 초성 퀴즈 낱말 가운데 3~4글자 · 새싹~쉬움(단계 1~2)만 쓴다. 사자성어 · 영화 제목은 뺀다 —
 * 섞인 네 글자에서 성어나 제목을 떠올리는 것은 아느냐를 묻는 쪽이 된다.
 * 같은 음절로 다른 낱말이 되는 쌍(애너그램)은 답이 둘이라 둘 다 뺀다.
 *
 * 낱말 목록은 20780까지 들어온 묶음으로 고정한다 — 뒤에 초성 낱말이 늘어도 지난 날의 문제가 바뀌지 않게.
 */
import { CHOSUNG_BATCHES, CHOSUNG_WORDS, categoryBySlug } from './chosung';
import { CHOSUNG_TIERS } from './chosungTiers';

export type Scramble = { word: string; letters: string[]; category: string; hint: string; alts: string[] };

const POOL_DAY = 20780;
const SKIP = new Set(['idiom', 'movie']);

function rng(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(a: T[], r: () => number): T[] {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

const sortedKey = (w: string) => [...w].sort().join('');

export const SCRAMBLE_POOL = (() => {
	const snap = CHOSUNG_BATCHES.filter((b) => b.fromDay <= POOL_DAY).at(-1)!;
	const size = Object.values(snap.counts).reduce((a, b) => a + b, 0);
	const words = CHOSUNG_WORDS.slice(0, size).filter((w) => {
		const n = [...w.word].length;
		const t = CHOSUNG_TIERS[w.word];
		return !SKIP.has(w.category) && n >= 3 && n <= 4 && t !== undefined && t <= 2 && new Set(w.word).size === n;
	});
	const count = new Map<string, number>();
	for (const w of words) count.set(sortedKey(w.word), (count.get(sortedKey(w.word)) ?? 0) + 1);
	return shuffle(
		words.filter((w) => count.get(sortedKey(w.word)) === 1),
		rng(20261124)
	);
})();

/** 날짜 하나에 낱말 하나. 섞은 순서는 어느 글자도 제자리에 남지 않는다 */
export function scrambleAt(day: number): Scramble {
	const w = SCRAMBLE_POOL[((day % SCRAMBLE_POOL.length) + SCRAMBLE_POOL.length) % SCRAMBLE_POOL.length];
	const src = [...w.word];
	const r = rng(day * 7907 + 3);
	let letters = src;
	for (let k = 0; k < 50; k++) {
		letters = shuffle([...src], r);
		if (letters.every((ch, i) => ch !== src[i])) break;
	}
	const alts = w.alts.filter((a) => sortedKey(a) === sortedKey(w.word));
	return { word: w.word, letters, category: categoryBySlug(w.category)?.name ?? '', hint: w.hint, alts };
}

/** 띄어쓰기 · 앞뒤 공백은 보지 않는다. 같은 글자로 된 다른 표기도 받는다 */
export function scrambleCorrect(s: Scramble, answer: string): boolean {
	const a = answer.replace(/\s+/g, '');
	return a === s.word || s.alts.includes(a);
}
