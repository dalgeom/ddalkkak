import type { Problem } from './problems';

/** 힌트 사용 수(0~3)에 따른 획득 점수 */
export const HINT_SCORES = [100, 80, 50, 20] as const;

export const ROUND_SIZE = 3;

/** 답 비교용 정규화: 소문자화, 공백·구두점·연산 기호 제거.
 *  주의: 알파벳 x는 정답 문자일 수 있어 제거하지 않는다(곱셈은 유니코드 ×로 처리). */
export function normalize(s: string): string {
	return String(s)
		.toLowerCase()
		.replace(/[\s.,·×*=+-]/g, '');
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

/** 고정 시드 셔플로 전체 문제의 '섞인 순서'를 만든다(매번 동일한 순열). */
export function seededOrder(n: number, seed = 20260101): number[] {
	const idx = Array.from({ length: n }, (_, i) => i);
	let s = seed >>> 0;
	const rand = () => {
		s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
		return s / 0x7fffffff;
	};
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[idx[i], idx[j]] = [idx[j], idx[i]];
	}
	return idx;
}

/** KST(UTC+9) 기준 epoch day 번호. 자정마다 1씩 증가, 전 세계 방문자 공통. */
export function kstDayNumber(nowMs: number): number {
	return Math.floor((nowMs + 9 * 3600 * 1000) / 86400000);
}

/** 연속 모드 세션: 풀에서 무작위 n개를 중복 없이 뽑는다(풀보다 크면 전체 셔플). */
export function buildSession<T>(pool: T[], size: number): T[] {
	const arr = pool.slice();
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr.slice(0, Math.min(size, arr.length));
}

/** 연속 모드 콤보 점수: 기본 + 콤보 배율(연속 정답마다 +0.1, 최대 2.0배). */
export function comboScore(base: number, comboCount: number): number {
	const mult = Math.min(2, 1 + comboCount * 0.1);
	return Math.round(base * mult);
}

/** 그날의 데일리 문제 인덱스(전 방문자 동일, 매일 다음 세트로 진행). */
export function dailyIndices(total: number, dayNum: number, size: number = ROUND_SIZE): number[] {
	if (total <= 0) return [];
	const order = seededOrder(total);
	const start = ((dayNum % total) + total) % total;
	const out: number[] = [];
	for (let i = 0; i < Math.min(size, total); i++) out.push(order[(start * size + i) % total]);
	return out;
}

export function emojiFor(win: boolean, hintsUsed: number): string {
	if (!win) return '🔓';
	return hintsUsed === 0 ? '✅' : '💡';
}
