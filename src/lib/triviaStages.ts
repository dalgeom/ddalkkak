/**
 * 상식 단계 도전(2026-10-20, 「딸깍 5단계」 첫 유형) — 학년을 단계로: 초등 새싹 · 중등 쉬움 · 고등 보통 · 어른 어려움.
 * 문제에 tier를 적으면 그 단계로 간다(고수는 그렇게 연다 — 10/21).
 *
 * 보기 고르기만 쓴다. 직접 쓰는 문제는 오타 · 띄어쓰기로 틀리기 쉬워 「마음 편히」와 맞지 않는다.
 *
 * 판은 단계마다 「10/20 은행(471)의 고정 순서 + 그 뒤에 들어온 문제」를 5개씩 자른다(stages.ts buildTierStages).
 * 새 상식을 넣으면 그 단계 끝에 판이 붙고 기존 판은 그대로다. triviaStages.test.ts가 몇 판을 박아 둔다.
 */
import { TRIVIA } from './trivia';
import { buildTierStages, legacyKeys, type TierStage } from './stages';
import { TIER_OF_GRADE, type Tier } from './tiers';
import type { Problem } from './problems';

const FROZEN = 471;

const tierOfTrivia = (p: Problem): Tier | undefined => p.tier ?? (TIER_OF_GRADE[p.grade ?? ''] as Tier | undefined);
const ids = (list: Problem[], t: Tier) => list.filter((p) => p.type === 'choice' && tierOfTrivia(p) === t).map((p) => p.id);

export const TRIVIA_STAGES: TierStage<string>[] = buildTierStages(
	[1, 2, 3, 4, 5],
	(t) => ({ base: ids(TRIVIA.slice(0, FROZEN), t), extra: ids(TRIVIA.slice(FROZEN), t) }),
	2026101
);

/** 10/20의 줄번호(1~75) → 열쇠. 그날 기기에 남은 기록을 옮길 때만 쓴다 */
export const TRIVIA_LEGACY = legacyKeys([
	[1, 18],
	[2, 21],
	[3, 19],
	[4, 17]
]);

const BY_ID = new Map(TRIVIA.map((p) => [p.id, p]));

/** 화면에 내리는 꼴 — 상식 대결(trivia/duel)과 같다 */
export function stageQuestions(key: string) {
	const st = TRIVIA_STAGES.find((s) => s.key === key);
	if (!st) return null;
	return st.ids.map((id) => {
		const p = BY_ID.get(id) as Problem;
		return {
			id: p.id,
			category: p.category ?? '',
			html: p.blocks.find((b) => b.kind === 'text')?.html ?? '',
			choices: p.choices ?? [],
			answerIndex: p.answerIndex ?? 0,
			explain: p.explain
		};
	});
}

export const TRIVIA_STAGE_KEY = 'ddal.trivia.stages';
