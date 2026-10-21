/**
 * 전개도 단계(2026-10-20, 「딸깍 5단계」) — 전개도 모양으로 나눈다.
 *
 * 실측(GA, 시도 5건 이상 23문제): 십자 모양(줄마다 1-4-1칸) 7문제는 시도 54건에 정답률 약 85%,
 * 나머지 모양 16문제는 118건에 약 73%였다 → 십자는 쉬움, 나머지는 보통. 오답 보기가 정답과 닮은 정도는
 * 모든 문제가 같아(정답과 같은 면 2 · 2 · 1개) 가르지 못했다. 표본이 작아 두 단계로만 나눈다 —
 * 실측이 쌓이면 어려움을 연다.
 *
 * 문제는 번호(0~699)만 있으면 만들어진다. 단계마다 정해진 씨앗으로 섞은 줄에서 앞의 PER_TIER판만 연다 —
 * 판을 늘리려면 PER_TIER만 올린다(늘 꼬리에 붙어 기존 판은 그대로다).
 */
import { problemAt, type CubeNetProblem } from './cubenet';
import { CUBE_TOTAL } from './game';
import { buildTierStages, legacyKeys, type TierStage } from './stages';
import type { Tier } from './tiers';

/** 줄마다 칸 수 — 1-4-1이면 십자 */
export const netShape = (p: CubeNetProblem) => p.net.rows.map((r) => (r.match(/#/g) || []).length).join('-');

export function cubeTier(p: CubeNetProblem): Tier {
	return netShape(p) === '1-4-1' ? 2 : 3;
}

/** 단계마다 여는 판 수 — 늘리면 단계 끝에 판이 붙는다 */
export const PER_TIER: Partial<Record<Tier, number>> = { 2: 12, 3: 12 };

const all = Array.from({ length: CUBE_TOTAL }, (_, i) => i);
const tierOfIdx = new Map(all.map((i) => [i, cubeTier(problemAt(i))]));

export const CUBE_STAGES: TierStage<number>[] = buildTierStages(
	[2, 3],
	(t) => ({ base: all.filter((i) => tierOfIdx.get(i) === t), extra: [] }),
	2026301
).filter((s) => s.inTier <= (PER_TIER[s.tier] ?? 0));

/** 10/20의 줄번호(1~24) → 열쇠 */
export const CUBE_LEGACY = legacyKeys([
	[2, 12],
	[3, 12]
]);

export const CUBE_STAGE_KEY = 'ddal.cube.stages';
