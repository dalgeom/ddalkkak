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
	const inputNeg = /^\s*-/.test(value);
	return p.answers.some((a) => {
		if (normalize(a) !== n) return false;
		// 음수 정답 보호: normalize가 '-'를 지우므로 정답이 음수인데 입력에 부호가 없으면
		// '1'이 '-1'로 오판정된다. 부호가 규칙의 핵심인 문제(예: jungle=-1)를 지킨다.
		if (/^\s*-/.test(a) && !inputNeg) return false;
		return true;
	});
}

/** 문자열 → 32비트 해시(FNV-1a). 보기 셔플 시드용. */
function hashStr(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
}

/** 객관식 보기 순서를 문제 id로 시드해 고정 셔플한다(정답이 항상 1번에 몰리는 편향 제거).
 *  같은 문제는 항상 같은 순서 → 전 방문자 동일. text형·비객관식은 그대로 반환. */
export function displayChoices<T extends Problem>(p: T): T {
	if (!p || p.type !== 'choice' || !p.choices || p.answerIndex == null) return p;
	const perm = seededOrder(p.choices.length, hashStr(p.id));
	const choices = perm.map((i) => p.choices![i]);
	const answerIndex = perm.indexOf(p.answerIndex);
	return { ...p, choices, answerIndex };
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

/** 데일리 모델 시작일(2026-07-15)의 epoch day. 공유 카드 회차 번호(딸깍 #N)용. */
export const SITE_START_DAY = 20649;
/** 그날이 몇 번째 '딸깍'인지 — Wordle의 회차 번호처럼 SNS 공유·비교를 유도한다. */
export function puzzleNumber(dayNum: number): number {
	return dayNum - SITE_START_DAY + 1;
}

/**
 * 힌트 해금 조건 — '방황'이 재미의 빌드업이므로 즉시 스킵을 막는다.
 * 힌트1은 항상 열려 있고, 2·3은 시간이 지나거나 시도해 본 뒤에 열린다(OR 조건).
 * 오답 3회부터는 다음 단계를 무료로 열어 이탈을 막는다(누를지는 사용자 선택).
 */
export function hintUnlocked(hintIndex: number, elapsedMs: number, wrongAttempts: number): boolean {
	if (hintIndex <= 0) return true;
	if (wrongAttempts >= 3) return true;
	if (hintIndex === 1) return elapsedMs >= 25000 || wrongAttempts >= 1;
	return elapsedMs >= 60000 || wrongAttempts >= 2;
}

/** 편집 거리(레벤슈타인) */
export function editDistance(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	if (!m) return n;
	if (!n) return m;
	let prev = Array.from({ length: n + 1 }, (_, j) => j);
	for (let i = 1; i <= m; i++) {
		const cur = [i];
		for (let j = 1; j <= n; j++) {
			cur[j] = Math.min(
				prev[j] + 1,
				cur[j - 1] + 1,
				prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
			);
		}
		prev = cur;
	}
	return prev[n];
}

/** 아깝게 빗나간 답인가 — "거의 다 왔어요" 피드백용 */
export function isCloseAnswer(p: Problem, value: string): boolean {
	const v = normalize(value);
	if (!v || !p.answers) return false;
	for (const a of p.answers) {
		const t = normalize(a);
		if (!t || t === v) continue;
		const na = Number(t);
		const nv = Number(v);
		if (Number.isFinite(na) && Number.isFinite(nv)) {
			const tol = Math.max(1, Math.abs(na) * 0.1);
			if (Math.abs(na - nv) <= tol) return true;
		} else if (t.length >= 2 && editDistance(t, v) <= 1) {
			return true;
		}
	}
	return false;
}

/** 힌트 없이 헤매다 맞힌 경우의 보너스(찍기 스팸 방지 위해 상한) */
export function wanderBonus(hintsUsed: number, wrongAttempts: number): number {
	if (hintsUsed > 0) return 0;
	return wrongAttempts >= 1 ? 10 : 0;
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

/** 성냥개비 문제 수. 홈에서 45KB짜리 JSON을 통째로 import하지 않으려고 상수로 둔다.
 *  matchstick.test.ts가 실제 데이터 길이와 일치하는지 검사한다. */
export const MATCH_TOTAL = 741;

/** 아카이브에 노출하는 지난 날짜 수. 발견형 재순환 주기(104÷3≈35일)보다 짧게 둬 반복을 피한다. */
export const ARCHIVE_DAYS = 30;

/** 아카이브가 다룰 지난 날짜 목록(오늘 제외, 최신순). 빌드 시점 today 기준. */
export function archiveDays(todayNum: number): number[] {
	const out: number[] = [];
	for (let d = todayNum - 1; d >= todayNum - ARCHIVE_DAYS; d--) out.push(d);
	return out;
}

/** epoch day → "YYYY. M. D" 라벨 (KST 정오 기준으로 안전하게 변환) */
export function dayLabel(dayNum: number): string {
	const ms = dayNum * 86400000 - 9 * 3600 * 1000 + 43200000;
	const d = new Date(ms);
	return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}`;
}

/** 데일리 트랙 정의 — 하루 분량을 개수가 아니라 '유형'으로 늘린다. */
export type TrackKey = 'discover' | 'trivia' | 'match';
export const TRACKS: {
	key: TrackKey;
	name: string;
	desc: string;
	size: number;
	icon: 'search' | 'book' | 'match';
}[] = [
	{ key: 'discover', name: '오늘의 발견', desc: '숨은 규칙을 스스로 찾아냅니다', size: 3, icon: 'search' },
	{ key: 'trivia', name: '오늘의 상식', desc: '18개 분야 · 초등부터 어른까지', size: 5, icon: 'book' },
	{ key: 'match', name: '오늘의 성냥개비', desc: '성냥 하나만 옮겨 식을 참으로', size: 3, icon: 'match' }
];

export function emojiFor(win: boolean, hintsUsed: number): string {
	if (!win) return '🔓';
	return hintsUsed === 0 ? '✅' : '💡';
}

type DailyStats = {
	score: number;
	dayStreak: number;
	maxStreak: number;
	played: number;
	lastDay: number;
};

/**
 * 오늘 3트랙(발견·상식·성냥개비)을 모두 done 했으면 연속(streak)을 갱신한다.
 * localStorage를 직접 읽고 쓰므로 홈·성냥개비 어느 라우트에서 마지막 트랙을 끝내든 동작한다.
 * (기존엔 홈 next() 안에서만 갱신돼, 성냥개비를 마지막에 풀면 스트릭이 영영 안 올랐다.)
 * 갱신이 일어났으면 새 stats를 반환하고, 아니면 null.
 */
export function advanceStreakIfComplete(dayNum: number): DailyStats | null {
	if (typeof localStorage === 'undefined') return null;
	const allDone = TRACKS.every((t) => {
		try {
			const rec = JSON.parse(localStorage.getItem(`ddal.daily.${dayNum}.${t.key}`) || 'null');
			return !!rec && rec.phase === 'done';
		} catch {
			return false;
		}
	});
	if (!allDone) return null;
	let stats: DailyStats;
	try {
		stats = JSON.parse(localStorage.getItem('ddal.stats') || 'null') || {
			score: 0,
			dayStreak: 0,
			maxStreak: 0,
			played: 0,
			lastDay: -1
		};
	} catch {
		stats = { score: 0, dayStreak: 0, maxStreak: 0, played: 0, lastDay: -1 };
	}
	if (stats.lastDay === dayNum) return null; // 오늘 이미 갱신함
	stats.dayStreak = stats.lastDay === dayNum - 1 ? (stats.dayStreak || 0) + 1 : 1;
	stats.maxStreak = Math.max(stats.maxStreak || 0, stats.dayStreak);
	stats.played = (stats.played || 0) + 1;
	stats.lastDay = dayNum;
	try {
		localStorage.setItem('ddal.stats', JSON.stringify(stats));
	} catch {
		/* 저장 실패는 무시 */
	}
	return stats;
}

/** 풀이 통계 — 힌트 사용 분포(0~3단)·정답 수·포기 수. '내 실력' 히스토그램(통계 모달)용. */
export type SolveStats = { hintDist: [number, number, number, number]; solved: number; gaveUp: number };

const EMPTY_SOLVE_STATS = (): SolveStats => ({ hintDist: [0, 0, 0, 0], solved: 0, gaveUp: 0 });

export function readSolveStats(): SolveStats {
	if (typeof localStorage === 'undefined') return EMPTY_SOLVE_STATS();
	try {
		const s = JSON.parse(localStorage.getItem('ddal.solveStats') || 'null');
		if (s && Array.isArray(s.hintDist) && s.hintDist.length === 4)
			return { hintDist: s.hintDist, solved: s.solved || 0, gaveUp: s.gaveUp || 0 };
	} catch {
		/* 무시 */
	}
	return EMPTY_SOLVE_STATS();
}

/** 문제 하나를 끝낼 때마다 호출 — 맞히면 힌트 단계별 카운트+정답 수, 못 맞히면 포기 수를 쌓는다.
 *  홈 데일리·연속 모드 양쪽에서 호출한다. 오늘부터 쌓이므로 히스토그램은 시간이 지나며 채워진다. */
export function recordSolve(win: boolean, hintsUsed: number): void {
	if (typeof localStorage === 'undefined') return;
	const s = readSolveStats();
	if (win) {
		s.solved += 1;
		s.hintDist[Math.min(Math.max(hintsUsed, 0), 3)] += 1;
	} else {
		s.gaveUp += 1;
	}
	try {
		localStorage.setItem('ddal.solveStats', JSON.stringify(s));
	} catch {
		/* 무시 */
	}
}
