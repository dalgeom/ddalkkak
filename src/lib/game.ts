import type { Problem } from './problems';

/** 힌트 사용 수(0~3)에 따른 획득 점수 */
export const HINT_SCORES = [100, 80, 50, 20] as const;

export const ROUND_SIZE = 3;

/** 답 비교용 정규화: 소문자화, 공백·구두점·연산 기호 제거 */
export function normalize(s: string): string {
	return String(s)
		.toLowerCase()
		.replace(/[\s.,·×x*=+-]/g, '');
}

export function isCorrectText(p: Problem, value: string): boolean {
	const n = normalize(value);
	if (!n || !p.answers) return false;
	return p.answers.some((a) => normalize(a) === n);
}

/** 안 푼 문제 우선으로 라운드 구성. 다 풀었으면 처음부터 재순환. */
export function buildRound(
	all: Problem[],
	solvedIds: string[],
	size: number = ROUND_SIZE
): { round: Problem[]; poolReset: boolean } {
	let pool = all.filter((p) => !solvedIds.includes(p.id));
	let poolReset = false;
	if (pool.length === 0) {
		pool = all.slice();
		poolReset = true;
	}
	return { round: pool.slice(0, size), poolReset };
}

export function scoreFor(win: boolean, hintsUsed: number): number {
	if (!win) return 0;
	return HINT_SCORES[Math.min(hintsUsed, HINT_SCORES.length - 1)];
}

export function emojiFor(win: boolean, hintsUsed: number): string {
	if (!win) return '🔓';
	return hintsUsed === 0 ? '✅' : '💡';
}
