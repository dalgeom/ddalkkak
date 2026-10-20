/**
 * 단계 도전 공통 규칙(2026-10-20) — 상식부터 쓰고 발견형 · 초성 · 전개도가 뒤따른다.
 * 성냥 단계 도전(matchStages.ts, 10/14)과 같은 약속이다: 한 단계 5문제, 3문제 이상이면 통과(★1),
 * 통과해야 다음 단계가 열리고 진행은 기기에 남는다.
 *
 * 다른 점 하나 — 단계(새싹~고수)마다 첫 판은 처음부터 열려 있다. 고수는 새싹 20판을 깨지 않고도
 * 자기 실력에서 시작한다(전국민을 아우르려면 잘하는 사람도 바로 재미있어야 한다).
 */
import type { Tier } from './tiers';

export const STAGE_SIZE = 5;

/** 맞힌 수로 별 — ★3 다 맞힘 · ★2 하나 틀림 · ★1 셋 이상 · 0 실패(힌트 없는 유형용) */
export function starsByScore(correct: number, total = STAGE_SIZE): 0 | 1 | 2 | 3 {
	if (correct >= total) return 3;
	if (correct === total - 1) return 2;
	if (correct >= 3) return 1;
	return 0;
}

/** 단계 번호(1부터) → 최고 별 */
export type StageProgress = Record<number, number>;

export interface StageMeta {
	no: number;
	tier: Tier;
	/** 그 단계(tier) 안에서 몇 번째 판인가(1부터) */
	inTier: number;
}

export function isOpen(stages: StageMeta[], p: StageProgress, no: number): boolean {
	const s = stages[no - 1];
	if (!s) return false;
	return s.inTier === 1 || (p[no - 1] ?? 0) >= 1;
}

/** 이어할 판 — 아직 못 깬 첫 판(열린 것 중), 다 깼으면 마지막 판 */
export function nextOpen(stages: StageMeta[], p: StageProgress, from = 1): number {
	for (let no = from; no <= stages.length; no++) if (!((p[no] ?? 0) >= 1) && isOpen(stages, p, no)) return no;
	return stages.length;
}

export function loadProgress(key: string): StageProgress {
	try {
		return JSON.parse(localStorage.getItem(key) || '{}');
	} catch {
		return {};
	}
}

export function saveProgress(key: string, p: StageProgress): void {
	try {
		localStorage.setItem(key, JSON.stringify(p));
	} catch {
		/* 사생활 보호 창 등 — 진행이 안 남을 뿐 놀이는 막지 않는다 */
	}
}
