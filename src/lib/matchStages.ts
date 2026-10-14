/**
 * 성냥개비 단계 도전(2026-10-14) — 60단계 × 5문제.
 *
 * 성냥개비는 검색 입구 1위인데(9/16~10/13 한국 랜딩 245세션) 들어온 사람이 무한 연습 몇 개
 * 풀고 끝났다. 「몇 단계까지 깼다」는 목표와 진행도로 다시 올 이유를 만든다.
 *
 * 구성은 고정이다. 기기에 「12단계 ★2」로 저장되므로 배포 뒤에 순서가 바뀌면 진행이 다른
 * 문제를 가리킨다 — matchStages.test.ts가 몇 문제를 박아 둔다. 바꿔야 하면 저장 키를 새로 판다.
 */
import problems from './data/matchstick-problems.json';
import variants from './data/matchstick-variants.json';
import { seededOrder } from './game';
import { levelOf } from './matchstickLevels';
import type { MatchProblem, MatchRule } from './matchstick';

export interface StageProblem extends MatchProblem {
	rule: MatchRule;
}

export const STAGE_SIZE = 5;

export const RULE_LABEL: Record<MatchRule, string> = {
	move1: '성냥 1개 옮기기',
	move2: '성냥 2개 옮기기',
	remove1: '성냥 1개 빼기',
	add1: '성냥 1개 더하기'
};

const BANK = problems as MatchProblem[];
const V = variants as Record<'move2' | 'remove1' | 'add1', MatchProblem[]>;
const byLevel = (lv: 'easy' | 'hard' | null) => BANK.filter((p) => levelOf(p.displayed, p.solution) === lv);

/** [단계 수, 규칙, 문제 풀, 섞는 씨앗] — 위에서부터 차례로 쌓는다 */
const PARTS: [number, MatchRule, MatchProblem[], number][] = [
	[10, 'move1', byLevel('easy'), 1401],
	[10, 'move1', byLevel(null), 1402],
	[4, 'remove1', V.remove1, 1403],
	[4, 'add1', V.add1, 1404],
	[10, 'move1', byLevel('hard'), 1405],
	[22, 'move2', V.move2, 1406]
];

export const STAGES: StageProblem[][] = PARTS.flatMap(([n, rule, pool, seed]) => {
	const order = seededOrder(pool.length, seed).slice(0, n * STAGE_SIZE);
	return Array.from({ length: n }, (_, s) =>
		order.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE).map((i) => ({ ...pool[i], rule }))
	);
});

export type StageResult = 'clean' | 'hinted' | 'revealed';

/** ★3 전부 깨끗이 · ★2 전부 풀기(힌트 허용) · ★1 셋 이상 · 0 실패 */
export function starsFor(rs: StageResult[]): 0 | 1 | 2 | 3 {
	const solved = rs.filter((r) => r !== 'revealed').length;
	if (solved === rs.length && rs.every((r) => r === 'clean')) return 3;
	if (solved === rs.length) return 2;
	if (solved >= 3) return 1;
	return 0;
}

/** 단계 번호(1부터) → 최고 별 */
export type StageProgress = Record<number, number>;

export const isUnlocked = (p: StageProgress, no: number) => no === 1 || (p[no - 1] ?? 0) >= 1;

/** 이어할 단계 — 아직 못 깬 첫 단계, 다 깼으면 마지막 단계 */
export function nextStage(p: StageProgress): number {
	for (let no = 1; no <= STAGES.length; no++) if (!((p[no] ?? 0) >= 1)) return no;
	return STAGES.length;
}

const KEY = 'ddal.match.stages';

export function loadStages(): StageProgress {
	try {
		return JSON.parse(localStorage.getItem(KEY) || '{}');
	} catch {
		return {};
	}
}

export function saveStages(p: StageProgress): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(p));
	} catch {
		/* 사생활 보호 창 등 — 진행이 안 남을 뿐 놀이는 막지 않는다 */
	}
}
