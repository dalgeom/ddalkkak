/**
 * 단계 도전 공통 규칙(2026-10-20) — 상식 · 발견형 · 초성 · 전개도가 쓴다.
 * 성냥 단계 도전(matchStages.ts, 10/14)과 같은 약속이다: 한 단계 5문제, 3문제 이상이면 통과(★1),
 * 통과해야 다음 판이 열리고 진행은 기기에 남는다. 단계(새싹~고수)마다 첫 판은 처음부터 열려 있다 —
 * 고수는 새싹 20판을 깨지 않고도 자기 실력에서 시작한다.
 *
 * 10/21: 판을 「단계-번째」 열쇠(3-5 = 보통 5판)로 부른다. 처음엔 전체 줄번호(1~75)였는데, 그러면 보통 끝에
 * 새 판을 붙이는 순간 어려움 판 번호가 전부 밀려 기기에 남은 「60번 ★2」가 다른 판을 가리킨다.
 * 열쇠로 부르면 새 문제가 들어올 때마다 그 단계 끝에 판을 붙여도 기존 기록이 그대로다(buildTierStages).
 * 옛 줄번호 기록은 처음 열 때 옮겨 담는다(loadProgress의 legacy).
 */
import { seededOrder } from './game';
import type { Tier } from './tiers';

export const STAGE_SIZE = 5;

/** 맞힌 수로 별 — ★3 다 맞힘 · ★2 하나 틀림 · ★1 셋 이상 · 0 실패(힌트 없는 유형용) */
export function starsByScore(correct: number, total = STAGE_SIZE): 0 | 1 | 2 | 3 {
	if (correct >= total) return 3;
	if (correct === total - 1) return 2;
	if (correct >= 3) return 1;
	return 0;
}

/** 판 열쇠 — 「단계-그 단계 안 몇 번째」 */
export const stageKey = (tier: Tier, inTier: number) => `${tier}-${inTier}`;

/** 판 열쇠 → 최고 별 */
export type StageProgress = Record<string, number>;

export interface StageMeta {
	key: string;
	tier: Tier;
	/** 그 단계 안에서 몇 번째 판인가(1부터) */
	inTier: number;
}

export interface TierStage<Id> extends StageMeta {
	ids: Id[];
}

/**
 * 단계마다 판을 만든다. 단계의 문제 줄 = 고정분(base, 정해진 씨앗으로 섞는다) + 고정 뒤에 들어온 문제(extra, 들어온 순서).
 * 5개씩 자르고 남는 것은 다음 문제가 들어올 때까지 판에 넣지 않는다. extra는 늘 꼬리에만 붙으니 기존 판은 바뀌지 않는다.
 */
export function buildTierStages<Id>(tiers: Tier[], pool: (t: Tier) => { base: Id[]; extra: Id[] }, seed: number): TierStage<Id>[] {
	const out: TierStage<Id>[] = [];
	for (const tier of tiers) {
		const { base, extra } = pool(tier);
		const order = seededOrder(base.length, seed + tier);
		const line = [...order.map((i) => base[i]), ...extra];
		const n = Math.floor(line.length / STAGE_SIZE);
		for (let s = 0; s < n; s++) out.push({ key: stageKey(tier, s + 1), tier, inTier: s + 1, ids: line.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE) });
	}
	return out;
}

/** 10/20 판 수(단계마다, 고정분만) — 옛 줄번호 기록(1, 2, 3 …)을 열쇠로 옮길 때 쓴다 */
export function legacyKeys(perTier: [Tier, number][]): string[] {
	return perTier.flatMap(([tier, n]) => Array.from({ length: n }, (_, i) => stageKey(tier, i + 1)));
}

export function isOpen(stages: StageMeta[], p: StageProgress, key: string): boolean {
	const s = stages.find((x) => x.key === key);
	if (!s) return false;
	return s.inTier === 1 || (p[stageKey(s.tier, s.inTier - 1)] ?? 0) >= 1;
}

/** 이어할 판 — tier를 주면 그 단계 안에서, 아니면 전체에서 아직 못 깬 첫 열린 판. 다 깼으면 마지막 판 */
export function nextOpen(stages: StageMeta[], p: StageProgress, tier?: Tier): string {
	const list = tier ? stages.filter((s) => s.tier === tier) : stages;
	for (const s of list) if (!((p[s.key] ?? 0) >= 1) && isOpen(stages, p, s.key)) return s.key;
	return list[list.length - 1]?.key ?? stages[0].key;
}

/** 단계의 마지막 판인가 — 여기까지 깬 사람은 그 단계 문제를 다 푼 것이다(10/21 계측 *_tier_end) */
export function isTierEnd(stages: StageMeta[], key: string): boolean {
	const s = stages.find((x) => x.key === key);
	return !!s && !stages.some((x) => x.tier === s.tier && x.inTier > s.inTier);
}

/**
 * 진행 읽기. legacy(10/20 줄번호 → 열쇠)를 주면, 줄번호로 남은 옛 기록을 열쇠로 옮겨 담고 바로 다시 저장한다.
 */
export function loadProgress(key: string, legacy?: string[]): StageProgress {
	let p: StageProgress = {};
	try {
		p = JSON.parse(localStorage.getItem(key) || '{}');
	} catch {
		return {};
	}
	if (legacy && Object.keys(p).some((k) => /^\d+$/.test(k))) {
		const moved: StageProgress = {};
		for (const [k, v] of Object.entries(p)) {
			const nk = /^\d+$/.test(k) ? legacy[Number(k) - 1] : k;
			if (nk) moved[nk] = Math.max(moved[nk] ?? 0, v);
		}
		p = moved;
		saveProgress(key, p);
	}
	return p;
}

export function saveProgress(key: string, p: StageProgress): void {
	try {
		localStorage.setItem(key, JSON.stringify(p));
	} catch {
		/* 사생활 보호 창 등 — 진행이 안 남을 뿐 놀이는 막지 않는다 */
	}
}
