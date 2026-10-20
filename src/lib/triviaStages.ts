/**
 * 상식 단계 도전(2026-10-20, 「딸깍 5단계」 첫 유형) — 학년을 단계로: 초등 새싹 · 중등 쉬움 · 고등 보통 · 어른 어려움.
 * 고수는 아직 없다 — 실측이 쌓이면 어른 문제 중 정답률 낮은 것으로 연다.
 *
 * 보기 고르기만 쓴다(381개 → 75판). 직접 쓰는 문제는 오타 · 띄어쓰기로 틀리기 쉬워 「마음 편히」와 맞지 않는다.
 *
 * 구성은 고정이다. 기기에 「12판 ★2」로 저장되므로 은행이 자라도 판이 바뀌면 안 된다 — 그래서 10/20의
 * 은행 크기(471)에서 자른다. 상식을 더 넣어도 이 판들은 그대로고, 새 판은 뒤에 따로 붙인다.
 * triviaStages.test.ts가 몇 판을 박아 둔다.
 */
import { TRIVIA } from './trivia';
import { seededOrder } from './game';
import { STAGE_SIZE, type StageMeta } from './stages';
import { TIER_OF_GRADE, type Tier } from './tiers';
import type { Problem } from './problems';

const FROZEN = 471;
const BANK = TRIVIA.slice(0, FROZEN);

const GRADES = ['초등', '중등', '고등', '어른'] as const;

export interface TriviaStage extends StageMeta {
	ids: string[];
}

export const TRIVIA_STAGES: TriviaStage[] = (() => {
	const out: TriviaStage[] = [];
	GRADES.forEach((grade, gi) => {
		const pool = BANK.filter((p) => p.grade === grade && p.type === 'choice');
		const order = seededOrder(pool.length, 2026102 + gi);
		const n = Math.floor(pool.length / STAGE_SIZE);
		const tier = TIER_OF_GRADE[grade] as Tier;
		for (let s = 0; s < n; s++) {
			out.push({
				no: out.length + 1,
				tier,
				inTier: s + 1,
				ids: order.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE).map((i) => pool[i].id)
			});
		}
	});
	return out;
})();

const BY_ID = new Map(BANK.map((p) => [p.id, p]));

/** 화면에 내리는 꼴 — 상식 대결(trivia/duel)과 같다 */
export function stageQuestions(no: number) {
	const st = TRIVIA_STAGES[no - 1];
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
