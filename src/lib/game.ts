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

/**
 * 전개도 문제 수.
 *
 * 전개도는 번호만 있으면 만들어져서 이론상 46,080가지(전개도 64종 × 기호 배치 6!)까지
 * 뽑을 수 있다. 그런데 그 숫자를 그대로 쓰니 발견형 200·상식 405·성냥개비 741 옆에서
 * 혼자 튀어 "이것만 왜 이렇게 많아?" 하는 그림이 됐고, 연습 '전체'에서도 화면을 차지했다.
 * 성냥개비와 같은 규모로 끊어 다른 유형과 나란히 놓이게 한다. 모자라면 그때 늘리면 된다.
 */
export const CUBE_TOTAL = 700;

/* ─────────────────────────── 오늘의 딸깍: 하루 10문제 ─────────────────────────── */

/**
 * 하루치 구성.
 *   2026-08-04(20669) 전: 발견형 3 + 상식 3 + 성냥개비 3 + 보너스 1
 *   그 이후          : 발견형 3 + 상식 2 + 성냥개비 2 + 전개도 2 + 보너스 1
 *
 * 구성을 바꾸면 그날의 문제가 통째로 달라진다. 이미 지나간 날과 오늘 풀던 사람의
 * 문제까지 바뀌면 아카이브가 거짓이 되고 진행 중이던 사람은 다른 문제를 만난다.
 * 그래서 새 구성은 정해진 날부터만 적용한다.
 */
export const CUBE_START_DAY = 20669;
export const DAILY_COUNTS_LEGACY = { discover: 3, trivia: 3, match: 3 } as const;
export const DAILY_COUNTS = { discover: 3, trivia: 2, match: 2, cube: 2 } as const;
export const DAILY_SIZE = 10;

export type DailyKind = 'discover' | 'trivia' | 'match' | 'cube';
export type DailyPick = { kind: DailyKind; index: number; bonus?: boolean };

/** 그날 어떤 유형들이 나오는지 — 결과 화면과 아카이브가 이 순서를 그대로 쓴다. */
export function dailyKinds(dayNum: number): DailyKind[] {
	return dayNum >= CUBE_START_DAY
		? ['discover', 'trivia', 'match', 'cube']
		: ['discover', 'trivia', 'match'];
}

/**
 * 그날 10문제가 어떤 유형 순서로 나오는지. 마지막 한 칸은 보너스다.
 *
 * 결과 화면은 다 푼 뒤 새로고침하면 문제은행이 없어 queue가 비는데, 그때도 유형별
 * 집계를 보여줘야 한다. i % 유형수 로 때우면 유형별 개수가 서로 다를 때(3·2·2·2)
 * 마지막 줄에서 어긋난다 — 그래서 실제 배치와 같은 방식으로 만든다.
 * buildDailySet과 같은 결과가 나오는지는 테스트가 지킨다.
 */
export function dailyKindOrder(dayNum: number): DailyKind[] {
	const d = Math.max(0, dayNum);
	const kinds = dailyKinds(d);
	const counts: Record<DailyKind, number> =
		d >= CUBE_START_DAY ? { ...DAILY_COUNTS } : { ...DAILY_COUNTS_LEGACY, cube: 0 };
	const lanes = kinds.map((k) => Array.from({ length: counts[k] }, () => k));
	const out: DailyKind[] = [];
	for (let r = 0; r < Math.max(...lanes.map((l) => l.length)); r++)
		for (const lane of lanes) if (lane[r]) out.push(lane[r]);
	out.push(kinds[d % kinds.length]); // 보너스
	return out;
}

/**
 * 하루치 문제를 고른다. 전 방문자·같은 날이면 항상 같은 결과.
 *
 * keyOf를 주면 그 값이 겹치지 않게 고른다(발견형=분야 중복 금지, 상식=카테고리 중복 금지).
 * 이때 단순히 순열을 걸으며 겹치는 걸 건너뛰면 날짜별 구간이 서로 겹쳐 같은 문제가 금방
 * 재출제되므로, 키별 레인을 만들어 레인을 돌아가며 고르고 각 레인 안에서는 자기 순번대로
 * 소진한다. 이렇게 하면 한 문제가 다시 나오기까지 (레인 크기 × 레인 수 ÷ count)일이 걸린다.
 */
export function pickDaily<T>(
	items: T[],
	count: number,
	dayNum: number,
	keyOf?: (item: T) => string,
	seed = 20260101
): number[] {
	return pickAtCursor(items, Math.max(0, dayNum) * count, count, keyOf, seed);
}

/**
 * 전역 커서(cursor)에서 count개를 집는다. 커서는 "지금까지 이 유형에서 몇 칸을 썼는가"로,
 * 날짜마다 끊기지 않고 이어져야 같은 문제가 금방 다시 나오지 않는다.
 */
export function pickAtCursor<T>(
	items: T[],
	cursor: number,
	count: number,
	keyOf?: (item: T) => string,
	seed = 20260101
): number[] {
	const n = items.length;
	if (n <= 0 || count <= 0) return [];
	const order = seededOrder(n, seed);
	const base = Math.max(0, Math.floor(cursor));

	// 키 없이 뽑을 때는 순열을 커서만큼 밀며 연속으로 집는다(한 바퀴 돌기 전엔 재출제 없음)
	if (!keyOf) {
		const out: number[] = [];
		for (let i = 0; i < Math.min(count, n); i++) out.push(order[(base + i) % n]);
		return out;
	}

	// 키별 레인 구성(순열 순서를 유지해 레인 내부도 섞여 있게)
	const lanes = new Map<string, number[]>();
	for (const idx of order) {
		const k = keyOf(items[idx]);
		const lane = lanes.get(k);
		if (lane) lane.push(idx);
		else lanes.set(k, [idx]);
	}
	const keys = [...lanes.keys()].sort();
	const laneOrder = seededOrder(keys.length, seed ^ 0x5bf03635).map((i) => keys[i]);
	const G = laneOrder.length;

	// L = dayNum*count + i 는 날짜를 넘어 0,1,2,… 로 이어지는 전역 카운터다.
	// 레인은 L % G, 그 레인 안에서의 순번은 floor(L / G) — 레인마다 고르게 소진된다.
	const out: number[] = [];
	const taken = new Set<number>();
	const want = Math.min(count, n);
	for (let i = 0; out.length < want && i < n + count; i++) {
		const L = base + i;
		const lane = lanes.get(laneOrder[L % G])!;
		const idx = lane[Math.floor(L / G) % lane.length];
		if (taken.has(idx)) continue;
		taken.add(idx);
		out.push(idx);
	}
	return out;
}

/**
 * 그날의 10문제를 만든다. 전 방문자가 같은 날 같은 문제를 푼다.
 * 발견형은 서로 다른 분야, 상식은 서로 다른 카테고리로 뽑는다.
 * 보너스 1문제는 날짜에 따라 세 유형을 돌아가며 하나 더 뽑은 것이라 앞의 9문제와 겹치지 않는다.
 */
export function buildDailySet<D, T>(
	discover: D[],
	trivia: T[],
	matchTotal: number,
	dayNum: number,
	fieldOf: (d: D) => string,
	catOf: (t: T) => string
): DailyPick[] {
	const d = Math.max(0, dayNum);
	const kinds = dailyKinds(d);
	const counts: Record<DailyKind, number> =
		d >= CUBE_START_DAY
			? { ...DAILY_COUNTS }
			: { ...DAILY_COUNTS_LEGACY, cube: 0 };

	// 보너스는 유형을 하루씩 돌아가며 붙는다
	const bonusKind = kinds[d % kinds.length];

	/**
	 * 유형별 커서 = 지금까지 그 유형에서 쓴 칸 수 = 정규 칸/일 + 그 유형이 보너스였던 날 1칸.
	 * 이렇게 이어 붙여야 순열을 한 칸도 건너뛰거나 겹치지 않고 소비해 재출제가 최대한 늦춰진다.
	 * 구성이 바뀐 날(CUBE_START_DAY) 전후로 칸 수가 다르므로 두 구간을 나눠 더한다.
	 */
	// 보너스로 한 칸 더 쓴 날 세기 — 네 유형을 한 번에 센다(유형마다 훑으면 같은 일을 네 번 한다)
	const bonusUsed: Record<string, number> = { discover: 0, trivia: 0, match: 0, cube: 0 };
	for (let e = 0; e < d; e++) {
		const ks = dailyKinds(e);
		bonusUsed[ks[e % ks.length]] += 1;
	}
	const cursorOf = (kind: DailyKind): number => {
		const legacyDays = Math.min(d, CUBE_START_DAY);
		const newDays = Math.max(0, d - CUBE_START_DAY);
		const legacyPer = (DAILY_COUNTS_LEGACY as Record<string, number>)[kind] ?? 0;
		return legacyPer * legacyDays + DAILY_COUNTS[kind] * newDays + bonusUsed[kind];
	};

	const matchIdx = Array.from({ length: matchTotal }, (_, i) => i);
	const take = (kind: DailyKind) => counts[kind] + (bonusKind === kind ? 1 : 0);

	const dAll = pickAtCursor(discover, cursorOf('discover'), take('discover'), fieldOf);
	const tAll = pickAtCursor(trivia, cursorOf('trivia'), take('trivia'), catOf, 20260202);
	const mAll = pickAtCursor(matchIdx, cursorOf('match'), take('match'), undefined, 20260303);
	// 전개도는 번호만 있으면 만들어지지만, 다른 유형과 같은 규모(CUBE_TOTAL)로 끊어 돈다
	const cStart = cursorOf('cube');
	const cAll = Array.from({ length: take('cube') }, (_, i) => (cStart + i) % CUBE_TOTAL);

	const picked: Record<DailyKind, number[]> = {
		discover: dAll,
		trivia: tAll,
		match: mAll,
		cube: cAll
	};

	const extra = picked[bonusKind][counts[bonusKind]];
	const bonus: DailyPick | null =
		extra === undefined ? null : { kind: bonusKind, index: extra, bonus: true };

	// 한 유형이 몰리면 지루하므로 유형을 번갈아 배치한다
	const lanes: DailyPick[][] = kinds.map((kind) =>
		picked[kind].slice(0, counts[kind]).map((index) => ({ kind, index }))
	);
	const out: DailyPick[] = [];
	for (let r = 0; r < Math.max(...lanes.map((l) => l.length)); r++) {
		for (const lane of lanes) if (lane[r]) out.push(lane[r]);
	}
	if (bonus) out.push(bonus);
	return out;
}

/** 아카이브에 노출하는 지난 날짜 수. 발견형 재순환 주기(104÷3≈35일)보다 짧게 둬 반복을 피한다. */
export const ARCHIVE_DAYS = 30;

/**
 * 아카이브가 다룰 지난 날짜 목록(오늘 제외, 최신순).
 * 사이트 개설(SITE_START_DAY) 이전으로는 내려가지 않는다 — 문제 선택이 날짜 결정론적이라
 * 개설 전 날짜도 계산은 되지만, 아무도 그날 풀지 않았으므로 "지난 문제"라고 내보내면 거짓이다.
 */
export function archiveDays(todayNum: number): number[] {
	const out: number[] = [];
	const oldest = Math.max(todayNum - ARCHIVE_DAYS, SITE_START_DAY);
	for (let d = todayNum - 1; d >= oldest; d--) out.push(d);
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

/**
 * 랜딩에 띄울 '오늘의 맛보기' 한 문제를 고른다.
 * 오늘의 10문제와 겹치면 세션 전에 답을 알아버리므로 exclude에 든 인덱스는 건너뛴다.
 * 날짜마다 한 칸씩 전진해 매일 다른 문제가 걸린다.
 */
export function dailySample(
	total: number,
	dayNum: number,
	exclude: number[] = [],
	seed = 20260505
): number {
	if (total <= 0) return -1;
	const order = seededOrder(total, seed);
	const skip = new Set(exclude);
	const start = Math.max(0, dayNum);
	for (let k = 0; k < total; k++) {
		const idx = order[(start + k) % total];
		if (!skip.has(idx)) return idx;
	}
	return order[start % total];
}

/* ───────────── 오늘의 딸깍 진행 상태(10문제 한 세션) ───────────── */

/** 문제 하나의 결과. 기호는 이 세 가지 + 보너스뿐이다(예전엔 상태 표기가 6종이라 아무도 못 읽었다). */
export type Mark = 'clean' | 'hinted' | 'miss';
export const MARK_EMOJI: Record<Mark, string> = { clean: '🟩', hinted: '🟨', miss: '⬜' };

/** elapsedMs는 화면을 보고 있던 시간의 누적치. 이 기능 이전에 푼 날에는 없다(undefined). */
export type DailyProgress = { pos: number; marks: Mark[]; done: boolean; elapsedMs?: number };

export function dailyProgressKey(dayNum: number): string {
	return `ddal.day.${dayNum}`;
}

export function readDailyProgress(dayNum: number): DailyProgress {
	const empty: DailyProgress = { pos: 0, marks: [], done: false };
	if (typeof localStorage === 'undefined') return empty;
	try {
		const raw = JSON.parse(localStorage.getItem(dailyProgressKey(dayNum)) || 'null');
		if (!raw || typeof raw.pos !== 'number' || !Array.isArray(raw.marks)) return empty;
		const p: DailyProgress = { pos: raw.pos, marks: raw.marks, done: !!raw.done };
		if (typeof raw.elapsedMs === 'number' && Number.isFinite(raw.elapsedMs) && raw.elapsedMs >= 0) {
			p.elapsedMs = raw.elapsedMs;
		}
		return p;
	} catch {
		return empty;
	}
}

/** ms → '10분 32초'. 1분 미만은 초만, 1시간 넘으면 분까지만 읽는다. */
export function formatDuration(ms: number): string {
	const total = Math.max(0, Math.round(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
	if (m > 0) return s > 0 ? `${m}분 ${s}초` : `${m}분`;
	return `${s}초`;
}

/**
 * 오늘 이전에 완주한 날 중 가장 빨랐던 기록(ms). 없으면 null.
 * 기록이 없던 시절에 푼 날은 elapsedMs가 없어 자연히 제외된다.
 */
export function bestDailyTime(todayNum: number): number | null {
	if (typeof localStorage === 'undefined') return null;
	const prefix = 'ddal.day.';
	let best: number | null = null;
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (!k?.startsWith(prefix)) continue;
			const d = Number(k.slice(prefix.length));
			if (!Number.isFinite(d) || d >= todayNum) continue;
			const p = readDailyProgress(d);
			if (!p.done || !p.elapsedMs) continue;
			if (best === null || p.elapsedMs < best) best = p.elapsedMs;
		}
	} catch {
		/* 저장소 접근이 막히면 비교할 기록이 없는 것으로 본다 */
	}
	return best;
}

/**
 * 오늘 이전에 푼 흔적이 있는가 = 재방문자인가.
 * 연속 일수(dayStreak)는 10문제를 완주해야 올라가서, 며칠째 들어와 몇 문제만 풀고
 * 나가는 사람을 재방문자로 못 잡는다. 그런 사람에게야말로 홈 화면 추가가 필요하다.
 */
export function hasPlayedBefore(todayNum: number): boolean {
	if (typeof localStorage === 'undefined') return false;
	const prefix = 'ddal.day.';
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (!k?.startsWith(prefix)) continue;
			const d = Number(k.slice(prefix.length));
			if (Number.isFinite(d) && d < todayNum) return true;
		}
	} catch {
		/* 저장소 접근이 막히면 재방문 여부를 알 수 없다 */
	}
	return false;
}

export function writeDailyProgress(dayNum: number, p: DailyProgress): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(dailyProgressKey(dayNum), JSON.stringify(p));
	} catch {
		/* 저장 실패는 무시 — 진행은 메모리로 이어진다 */
	}
}

/**
 * 오늘 10문제를 끝냈을 때 연속 일수를 갱신한다.
 * 하루에 한 번만 반영되며, 어제도 완주했으면 이어지고 아니면 1일부터 다시 센다.
 */
export function completeDailySession(dayNum: number): DailyStats | null {
	if (typeof localStorage === 'undefined') return null;
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
	if (stats.lastDay === dayNum) return stats; // 오늘 이미 반영됨
	stats.dayStreak = stats.lastDay === dayNum - 1 ? (stats.dayStreak || 0) + 1 : 1;
	stats.maxStreak = Math.max(stats.maxStreak || 0, stats.dayStreak);
	stats.played = (stats.played || 0) + 1;
	stats.lastDay = dayNum;
	try {
		localStorage.setItem('ddal.stats', JSON.stringify(stats));
	} catch {
		/* 무시 */
	}
	return stats;
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
