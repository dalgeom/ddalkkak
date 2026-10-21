/**
 * 발견형 단계 도전(2026-10-20, 「딸깍 5단계」) — 단계(discoverTiers.ts)대로 새싹부터 고수까지.
 * 가족이 「너무 어렵다」고 한 유형이라, 새싹 판부터 차근차근 「아!」를 쌓게 한다. 고수 판은 진짜 어렵다.
 *
 * 판은 단계마다 「10/20 은행(380)의 고정 순서 + 그 뒤에 들어온 문제」를 5개씩 자른다(stages.ts buildTierStages).
 * 매일 새 발견형이 들어오면 그 단계 끝에 판이 붙고 기존 판은 그대로다. discoverStages.test.ts가 몇 판을 박아 둔다.
 */
import { PROBLEMS, type Problem } from './problems';
import { DISCOVER_TIERS } from './discoverTiers';
import { buildTierStages, legacyKeys, type TierStage } from './stages';
import type { Tier } from './tiers';

const FROZEN = 380;
const ids = (list: Problem[], t: Tier) => list.filter((p) => DISCOVER_TIERS[p.id] === t).map((p) => p.id);

export const DISCOVER_STAGES: TierStage<string>[] = buildTierStages(
	[1, 2, 3, 4, 5],
	(t) => ({ base: ids(PROBLEMS.slice(0, FROZEN), t), extra: ids(PROBLEMS.slice(FROZEN), t) }),
	2026201
);

/** 10/20의 줄번호(1~74) → 열쇠 */
export const DISCOVER_LEGACY = legacyKeys([
	[1, 8],
	[2, 20],
	[3, 21],
	[4, 20],
	[5, 5]
]);

const BY_ID = new Map(PROBLEMS.map((p) => [p.id, p]));

export function discoverStageProblems(key: string): Problem[] | null {
	const st = DISCOVER_STAGES.find((s) => s.key === key);
	return st ? st.ids.map((id) => BY_ID.get(id)!) : null;
}

export const DISCOVER_STAGE_KEY = 'ddal.discover.stages';
