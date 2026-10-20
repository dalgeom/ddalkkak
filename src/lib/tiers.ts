/**
 * 딸깍 5단계(2026-10-20 사용자 승인) — 모든 유형이 같은 사다리를 쓴다.
 *
 * 왜: 가족(부모님 · 동생)에게 풀어 보게 했더니 발견형이 「너무 어렵다, 머리 아프다, 포기하게 된다」였다.
 * 숫자도 같았다 — 오늘의 10문제를 시작한 사람의 34%가 1번에서 떠나고, 답이 쌓인 발견형 40개 중 14개는
 * 정답률 30% 미만이다. 전국민이 마음 편히 시작해 고수까지 올라가는 사다리를 둔다.
 *
 * 목표 정답률은 단계를 매기는 눈금이다. 실측이 10건 넘게 쌓이면 실측이 사람 판정보다 앞선다.
 */
export type Tier = 1 | 2 | 3 | 4 | 5;

export const TIERS: { tier: Tier; name: string; who: string; target: number }[] = [
	{ tier: 1, name: '새싹', who: '누구나 바로 풀어요', target: 90 },
	{ tier: 2, name: '쉬움', who: '조금만 생각하면 풀려요', target: 75 },
	{ tier: 3, name: '보통', who: '딸깍 평균 실력', target: 55 },
	{ tier: 4, name: '어려움', who: '매일 푸는 사람도 고민해요', target: 35 },
	{ tier: 5, name: '고수', who: '머리를 제대로 굴려야 해요', target: 15 }
];

export const tierName = (t: Tier) => TIERS[t - 1].name;

/** 상식 문제의 학년 → 단계. 고수는 실측이 쌓이면 어른 문제 중에서 고른다 */
export const TIER_OF_GRADE: Record<string, Tier> = { 초등: 1, 중등: 2, 고등: 3, 어른: 4 };
