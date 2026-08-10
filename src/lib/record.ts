/**
 * 날짜별 딸깍 기록 읽기 — 결과 화면의 주간 스트립과 /record 달력이 쓴다.
 *
 * 원본은 ddal.day.<dayNum> (DailyProgress). 완주하며 이미 쌓여 온 키라
 * 이 기능 이전에 푼 날들도 소급해서 달력에 뜬다. 서버는 없다 — 전부
 * localStorage에서 읽고, 기기를 바꾸면 기록이 따라가지 않는 것도
 * 사이트의 다른 기록과 같다.
 *
 * 날짜 수학은 전부 KST 고정이다. dayNum은 kstDayNumber()의 값이라
 * dayNum*86400000 시각의 UTC 달력 날짜가 곧 KST 달력 날짜다 —
 * 그래서 getUTC* 게터만 쓰면 실행 환경의 시간대와 무관하게 맞는다.
 */
import { readDailyProgress, SITE_START_DAY, type Mark } from './game';

export type DayRecord = {
	dayNum: number;
	done: boolean;
	/** 맞춘 수 (clean + hinted) */
	correct: number;
	/** 그날 문제 수 (marks 길이 — 구성 변경 전후로 다를 수 있다) */
	total: number;
	/** 완주 시간(ms). 기록이 없던 시절에 푼 날은 0 */
	elapsedMs: number;
	marks: Mark[];
};

/** 완주한 날만 기록으로 친다. 풀다 만 날은 null. */
export function readDayRecord(dayNum: number): DayRecord | null {
	const p = readDailyProgress(dayNum);
	if (!p.done || p.marks.length === 0) return null;
	return {
		dayNum,
		done: true,
		correct: p.marks.filter((m) => m !== 'miss').length,
		total: p.marks.length,
		elapsedMs: p.elapsedMs ?? 0,
		marks: p.marks
	};
}

/* ───────────── 날짜 수학 (KST 고정) ───────────── */

export type KstDate = { y: number; m: number; d: number; weekday: number };

/** dayNum → KST 달력 날짜. weekday는 월요일 시작 0~6. */
export function dayNumToDate(dayNum: number): KstDate {
	const t = new Date(dayNum * 86400000);
	return {
		y: t.getUTCFullYear(),
		m: t.getUTCMonth() + 1,
		d: t.getUTCDate(),
		weekday: (t.getUTCDay() + 6) % 7
	};
}

/** KST 달력 날짜 → dayNum */
export function dateToDayNum(y: number, m: number, d: number): number {
	return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** dayNum이 속한 주(월~일)의 7개 dayNum */
export function weekOf(dayNum: number): number[] {
	const mon = dayNum - dayNumToDate(dayNum).weekday;
	return Array.from({ length: 7 }, (_, i) => mon + i);
}

export type MonthCell = { dayNum: number; d: number; inMonth: boolean };

/**
 * y년 m월의 달력 그리드(월요일 시작, 7의 배수 길이).
 * 이웃 달 날짜는 inMonth=false로 자리만 채운다.
 */
export function monthGrid(y: number, m: number): MonthCell[] {
	const first = dateToDayNum(y, m, 1);
	const start = first - dayNumToDate(first).weekday;
	const nextFirst = m === 12 ? dateToDayNum(y + 1, 1, 1) : dateToDayNum(y, m + 1, 1);
	const weeks = Math.ceil((nextFirst - start) / 7);
	return Array.from({ length: weeks * 7 }, (_, i) => {
		const dayNum = start + i;
		const dt = dayNumToDate(dayNum);
		return { dayNum, d: dt.d, inMonth: dayNum >= first && dayNum < nextFirst };
	});
}

/* ───────────── 집계 ───────────── */

export type RecordSummary = {
	/** 완주한 날 수 */
	days: number;
	/** 지금 이어지고 있는 연속 (오늘을 아직 안 풀었으면 어제까지로 센다) */
	streak: number;
	/** 최장 연속 */
	bestStreak: number;
	/** 총 맞춘 문제 */
	totalCorrect: number;
	/** 완주 시간이 기록된 날들의 평균(ms). 없으면 0 */
	avgMs: number;
};

/**
 * 서비스 시작일부터 today까지 전부 훑는다. localStorage 조회는 하루 1회라
 * 몇 년치가 쌓여도 수천 번 — 화면 전환 한 번에 감당 못 할 양이 아니다.
 */
export function summarize(today: number): RecordSummary {
	let days = 0;
	let totalCorrect = 0;
	let timeSum = 0;
	let timeCnt = 0;
	let bestStreak = 0;
	let run = 0;
	for (let d = SITE_START_DAY; d <= today; d++) {
		const r = readDayRecord(d);
		if (r) {
			days += 1;
			totalCorrect += r.correct;
			if (r.elapsedMs > 0) {
				timeSum += r.elapsedMs;
				timeCnt += 1;
			}
			run += 1;
			if (run > bestStreak) bestStreak = run;
		} else {
			run = 0;
		}
	}
	// 현재 연속: 오늘부터 뒤로. 오늘을 아직 안 했으면 어제부터 센다.
	let streak = 0;
	let from = readDayRecord(today) ? today : today - 1;
	while (from >= SITE_START_DAY && readDayRecord(from)) {
		streak += 1;
		from -= 1;
	}
	return { days, streak, bestStreak, totalCorrect, avgMs: timeCnt ? Math.round(timeSum / timeCnt) : 0 };
}
