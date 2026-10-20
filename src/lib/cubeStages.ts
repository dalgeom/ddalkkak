/**
 * 전개도 단계(2026-10-20, 「딸깍 5단계」) — 전개도 모양으로 나눈다.
 *
 * 실측(GA, 시도 5건 이상 23문제): 십자 모양(줄마다 1-4-1칸) 7문제는 시도 54건에 정답률 약 85%,
 * 나머지 모양 16문제는 118건에 약 73%였다 → 십자는 쉬움, 나머지는 보통. 오답 보기가 정답과 닮은 정도는
 * 모든 문제가 같아(정답과 같은 면 2 · 2 · 1개) 가르지 못했다. 표본이 작아 두 단계로만 나눈다 —
 * 실측이 쌓이면 어려움을 연다.
 *
 * 판은 고정이다(기기에 진행이 남는다) — 문제 번호 0~699(CUBE_TOTAL)에서 단계마다 정해진 씨앗으로 12판씩.
 */
import { problemAt, type CubeNetProblem } from './cubenet';
import { seededOrder, CUBE_TOTAL } from './game';
import { STAGE_SIZE, type StageMeta } from './stages';
import type { Tier } from './tiers';

/** 줄마다 칸 수 — 1-4-1이면 십자 */
export const netShape = (p: CubeNetProblem) => p.net.rows.map((r) => (r.match(/#/g) || []).length).join('-');

export function cubeTier(p: CubeNetProblem): Tier {
	return netShape(p) === '1-4-1' ? 2 : 3;
}

const PER_TIER = 12;

export interface CubeStage extends StageMeta {
	indices: number[];
}

export const CUBE_STAGES: CubeStage[] = (() => {
	const all = Array.from({ length: CUBE_TOTAL }, (_, i) => i);
	const tierOfIdx = new Map(all.map((i) => [i, cubeTier(problemAt(i))]));
	const out: CubeStage[] = [];
	([2, 3] as Tier[]).forEach((tier) => {
		const pool = all.filter((i) => tierOfIdx.get(i) === tier);
		const order = seededOrder(pool.length, 2026301 + tier);
		for (let s = 0; s < PER_TIER; s++) {
			out.push({ no: out.length + 1, tier, inTier: s + 1, indices: order.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE).map((k) => pool[k]) });
		}
	});
	return out;
})();

export const CUBE_STAGE_KEY = 'ddal.cube.stages';
