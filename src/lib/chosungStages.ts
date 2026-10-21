/**
 * 초성 단계 도전(2026-10-20, 「딸깍 5단계」) — 낱말 단계(chosungTiers.ts)대로 새싹 · 쉬움 · 보통 · 어려움.
 * 고수 낱말은 아직 판(5낱말)을 못 채워 어려움 판에 함께 넣는다.
 *
 * 판은 단계마다 「10/20 낱말 324개의 고정 순서 + 그 뒤에 들어온 낱말」을 5개씩 자른다(stages.ts buildTierStages).
 * 새 낱말을 넣으면(CHOSUNG_BATCHES 꼬리 + chosungTiers.ts에 단계) 그 단계 끝에 판이 붙고 기존 판은 그대로다.
 */
import { CHOSUNG_WORDS, type ChosungWord } from './chosung';
import { CHOSUNG_TIERS } from './chosungTiers';
import { buildTierStages, legacyKeys, type TierStage } from './stages';
import type { Tier } from './tiers';

const FROZEN = 324;
const tierOfWord = (w: ChosungWord): Tier => Math.min(CHOSUNG_TIERS[w.word] ?? 3, 4) as Tier;
const words = (list: ChosungWord[], t: Tier) => list.filter((w) => tierOfWord(w) === t).map((w) => w.word);

export const CHOSUNG_STAGES: TierStage<string>[] = buildTierStages(
	[1, 2, 3, 4],
	(t) => ({ base: words(CHOSUNG_WORDS.slice(0, FROZEN), t), extra: words(CHOSUNG_WORDS.slice(FROZEN), t) }),
	2026401
);

/** 10/20의 줄번호(1~64) → 열쇠 */
export const CHOSUNG_LEGACY = legacyKeys([
	[1, 7],
	[2, 24],
	[3, 24],
	[4, 9]
]);

const BY_WORD = new Map(CHOSUNG_WORDS.map((w) => [w.word, w]));

export function chosungStageWords(key: string): ChosungWord[] | null {
	const st = CHOSUNG_STAGES.find((s) => s.key === key);
	return st ? st.ids.map((w) => BY_WORD.get(w)!) : null;
}

export const CHOSUNG_STAGE_KEY = 'ddal.chosung.stages';
