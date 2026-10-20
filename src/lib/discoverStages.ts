/**
 * 발견형 단계 도전(2026-10-20, 「딸깍 5단계」) — 단계(discoverTiers.ts)대로 새싹부터 고수까지.
 * 가족이 「너무 어렵다」고 한 유형이라, 새싹 판부터 차근차근 「아!」를 쌓게 한다. 고수 판은 진짜 어렵다.
 *
 * 구성은 고정이다(기기에 진행이 남는다) — 10/20의 은행 크기(380)에서 자른다. 새 문제는 이 판들을 바꾸지 않는다.
 * 단계마다 5로 나눈 나머지는 판에 넣지 않는다. discoverStages.test.ts가 몇 판을 박아 둔다.
 */
import { PROBLEMS, type Problem } from './problems';
import { DISCOVER_TIERS } from './discoverTiers';
import { seededOrder } from './game';
import { STAGE_SIZE, type StageMeta } from './stages';
import type { Tier } from './tiers';

const FROZEN = 380;
const BANK = PROBLEMS.slice(0, FROZEN);

export interface DiscoverStage extends StageMeta {
	ids: string[];
}

export const DISCOVER_STAGES: DiscoverStage[] = (() => {
	const out: DiscoverStage[] = [];
	([1, 2, 3, 4, 5] as Tier[]).forEach((tier) => {
		const pool = BANK.filter((p) => DISCOVER_TIERS[p.id] === tier);
		const order = seededOrder(pool.length, 2026201 + tier);
		const n = Math.floor(pool.length / STAGE_SIZE);
		for (let s = 0; s < n; s++) {
			out.push({ no: out.length + 1, tier, inTier: s + 1, ids: order.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE).map((i) => pool[i].id) });
		}
	});
	return out;
})();

const BY_ID = new Map(BANK.map((p) => [p.id, p]));

export function discoverStageProblems(no: number): Problem[] | null {
	const st = DISCOVER_STAGES[no - 1];
	return st ? st.ids.map((id) => BY_ID.get(id)!) : null;
}

export const DISCOVER_STAGE_KEY = 'ddal.discover.stages';
