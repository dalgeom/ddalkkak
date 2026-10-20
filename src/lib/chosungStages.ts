/**
 * 초성 단계 도전(2026-10-20, 「딸깍 5단계」) — 낱말 단계(chosungTiers.ts)대로 새싹 · 쉬움 · 보통 · 어려움.
 * 고수 낱말은 3개뿐이라 판(5문제)을 못 만들어 어려움 판에 함께 넣는다.
 *
 * 판은 고정이다(기기에 진행이 남는다) — 10/20의 낱말 324개에서 자른다. 단계마다 5로 나눈 나머지는 판에 넣지 않는다.
 */
import { CHOSUNG_WORDS, type ChosungWord } from './chosung';
import { CHOSUNG_TIERS } from './chosungTiers';
import { seededOrder } from './game';
import { STAGE_SIZE, type StageMeta } from './stages';
import type { Tier } from './tiers';

const FROZEN = 324;
const BANK = CHOSUNG_WORDS.slice(0, FROZEN);
const tierOfWord = (w: ChosungWord): Tier => Math.min(CHOSUNG_TIERS[w.word] ?? 3, 4) as Tier;

export interface ChosungStage extends StageMeta {
	words: string[];
}

export const CHOSUNG_STAGES: ChosungStage[] = (() => {
	const out: ChosungStage[] = [];
	([1, 2, 3, 4] as Tier[]).forEach((tier) => {
		const pool = BANK.filter((w) => tierOfWord(w) === tier);
		const order = seededOrder(pool.length, 2026401 + tier);
		const n = Math.floor(pool.length / STAGE_SIZE);
		for (let s = 0; s < n; s++) {
			out.push({ no: out.length + 1, tier, inTier: s + 1, words: order.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE).map((k) => pool[k].word) });
		}
	});
	return out;
})();

const BY_WORD = new Map(BANK.map((w) => [w.word, w]));

export function chosungStageWords(no: number): ChosungWord[] | null {
	const st = CHOSUNG_STAGES[no - 1];
	return st ? st.words.map((w) => BY_WORD.get(w)!) : null;
}

export const CHOSUNG_STAGE_KEY = 'ddal.chosung.stages';
