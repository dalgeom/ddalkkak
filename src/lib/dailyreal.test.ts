import { describe, it, expect } from 'vitest';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import { bankSizesAt } from './bankHistory';
import { isOpener } from './opener';
import { tierOf } from './discoverTiers';
import {
	buildDailySet,
	buildDailySetStable,
	DAILY_SIZE,
	MATCH_TOTAL,
	CUBE_START_DAY,
	DAILY_COUNTS,
	DAILY_COUNTS_LEGACY,
	dailyKinds,
	dailyKindOrder,
	CUBE_TOTAL,
	TRIVIA_FIRST_DAY,
	EASY_FIRST_DAY
} from './game';

/** 실제 문제은행으로 "오늘의 딸깍" 하루 세트를 검증한다(합성 데이터로는 분포 편향을 못 잡는다). */
describe('오늘의 딸깍 — 실제 문제은행 검증', () => {
	const build = (day: number) =>
		buildDailySet(PROBLEMS, TRIVIA, MATCH_TOTAL, day, (p) => fieldOfChip(p.chip), (t) => t.category ?? '기타');
	const START = 20649;

	it('1년치 어느 날이든 10문제 · 그날 구성대로 · 문제 중복 없음', () => {
		for (let day = START; day < START + 365; day++) {
			const set = build(day);
			expect(set.length, `day ${day}`).toBe(DAILY_SIZE);
			expect(set.filter((p) => p.bonus).length, `day ${day} 보너스`).toBe(1);
			const base = set.filter((p) => !p.bonus);
			const want = day >= CUBE_START_DAY ? DAILY_COUNTS : { ...DAILY_COUNTS_LEGACY, cube: 0 };
			for (const k of ['discover', 'trivia', 'match', 'cube'] as const)
				expect(base.filter((p) => p.kind === k).length, `day ${day} ${k}`).toBe(want[k]);
			const keys = set.map((p) => `${p.kind}:${p.index}`);
			expect(new Set(keys).size, `day ${day} 같은 문제 두 번`).toBe(keys.length);
		}
	});

	/**
	 * 구성을 바꾼 경계. 지나간 날의 문제가 바뀌면 아카이브가 거짓이 되고,
	 * 오늘 풀던 사람은 이어서 풀 때 다른 문제를 만난다.
	 */
	it('전개도는 정해진 날부터만 나오고, 그 전날은 그대로다', () => {
		const before = build(CUBE_START_DAY - 1);
		expect(before.some((p) => p.kind === 'cube')).toBe(false);
		expect(dailyKinds(CUBE_START_DAY - 1)).toEqual(['discover', 'trivia', 'match']);

		const after = build(CUBE_START_DAY);
		expect(after.filter((p) => p.kind === 'cube' && !p.bonus).length).toBe(DAILY_COUNTS.cube);
		expect(dailyKinds(CUBE_START_DAY)).toEqual(['discover', 'trivia', 'match', 'cube']);
	});

	it('지난 날들의 문제 구성이 바뀌지 않았다', () => {
		// 서비스 시작일부터 경계 전날까지는 옛 구성 그대로여야 한다
		for (let day = START; day < CUBE_START_DAY; day++) {
			const base = build(day).filter((p) => !p.bonus);
			expect(base.filter((p) => p.kind === 'discover').length, `day ${day}`).toBe(3);
			expect(base.filter((p) => p.kind === 'trivia').length, `day ${day}`).toBe(3);
			expect(base.filter((p) => p.kind === 'match').length, `day ${day}`).toBe(3);
		}
	});

	it('발견형은 분야가 모두 다르고, 상식은 카테고리가 모두 다르다', () => {
		for (let day = START; day < START + 365; day++) {
			const set = build(day);
			const df = set.filter((p) => p.kind === 'discover' && !p.bonus).map((p) => fieldOfChip(PROBLEMS[p.index].chip));
			expect(new Set(df).size, `day ${day} 분야 중복 ${df}`).toBe(df.length);
			const tc = set.filter((p) => p.kind === 'trivia' && !p.bonus).map((p) => TRIVIA[p.index].category);
			expect(new Set(tc).size, `day ${day} 카테고리 중복 ${tc}`).toBe(tc.length);
		}
	});

	it('인덱스가 실제 배열 범위 안에 있다', () => {
		for (let day = START; day < START + 120; day++)
			for (const p of build(day)) {
				expect(p.index).toBeGreaterThanOrEqual(0);
				const max =
					p.kind === 'discover'
						? PROBLEMS.length
						: p.kind === 'trivia'
							? TRIVIA.length
							: p.kind === 'cube'
								? CUBE_TOTAL
								: MATCH_TOTAL;
				expect(p.index, `day ${day} ${p.kind}`).toBeLessThan(max);
			}
	});

	/**
	 * 전개도는 번호만 있으면 만들어져서 상한을 안 두면 무한정 커진다. 그러면 화면에
	 * 적어 둔 "전개도 700개"가 거짓이 되고, 연습의 문제 수와도 어긋난다.
	 */
	it('전개도 번호가 10년치 내내 700 안에 머문다', () => {
		for (let day = CUBE_START_DAY; day < CUBE_START_DAY + 3650; day++)
			for (const p of build(day))
				if (p.kind === 'cube') {
					expect(p.index, `day ${day}`).toBeGreaterThanOrEqual(0);
					expect(p.index, `day ${day}`).toBeLessThan(CUBE_TOTAL);
				}
		// 3,650일을 세워 로컬 2초 — CI 러너는 2~3배 느려 기본 5초에 걸렸다(9/29 9486a09)
	}, 20000);

	/**
	 * 재출제 주기. 발견형은 가장 작은 분야(규칙·분류)가 이틀에 한 번 나와야 하므로
	 * 그 분야 크기 × 2 가 이론 한계다. 문제은행이 커지면 이 값도 늘어난다.
	 */
	it('같은 문제가 다시 나오기까지 발견형 25일·상식 60일·성냥 200일 이상', () => {
		const limits = { discover: 25, trivia: 60, match: 200 } as const;
		for (const kind of ['discover', 'trivia', 'match'] as const) {
			const seen = new Set<number>();
			let firstRepeat = Infinity;
			for (let day = START; day < START + 400 && firstRepeat === Infinity; day++)
				for (const p of build(day).filter((x) => x.kind === kind)) {
					if (seen.has(p.index)) { firstRepeat = day - START; break; }
					seen.add(p.index);
				}
			expect(firstRepeat, `${kind} 재출제가 ${firstRepeat}일째`).toBeGreaterThanOrEqual(limits[kind]);
		}
	});


	it('10/21(TRIVIA_FIRST_DAY)부터 1번은 상식, 그 전날까지는 발견형 — 나가는 문제는 같다', () => {
		const stable = (day: number) =>
			buildDailySetStable(PROBLEMS, TRIVIA, MATCH_TOTAL, day, (p) => fieldOfChip(p.chip), (t) => t.category ?? '기타', bankSizesAt, isOpener);
		for (let day = TRIVIA_FIRST_DAY - 30; day < TRIVIA_FIRST_DAY; day++) expect(stable(day)[0].kind, `day ${day}`).toBe('discover');
		for (let day = TRIVIA_FIRST_DAY; day < TRIVIA_FIRST_DAY + 60; day++) {
			const set = stable(day);
			expect(set[0].kind, `day ${day}`).toBe('trivia');
			expect(set[0].bonus, `day ${day}`).toBeFalsy();
			expect(set.length, `day ${day}`).toBe(DAILY_SIZE);
		}
	});

	it('계단(10/21~) — 종류마다 쉬운 문제부터, 오늘까지는 그대로, 나가는 문제는 같다', () => {
		const stable = (day: number) =>
			buildDailySetStable(PROBLEMS, TRIVIA, MATCH_TOTAL, day, (p) => fieldOfChip(p.chip), (t) => t.category ?? '기타', bankSizesAt, isOpener);
		let 오른날 = 0;
		for (let day = TRIVIA_FIRST_DAY; day < TRIVIA_FIRST_DAY + 120; day++) {
			const set = stable(day).filter((p) => !p.bonus);
			const dt = set.filter((p) => p.kind === 'discover').map((p) => tierOf(PROBLEMS[p.index]) ?? 3);
			const tt = set.filter((p) => p.kind === 'trivia').map((p) => tierOf(TRIVIA[p.index]) ?? 3);
			for (const ts of [dt, tt]) expect(ts, `day ${day}`).toEqual([...ts].sort((a, b) => a - b));
			if (dt[0] < dt[dt.length - 1]) 오른날++;
		}
		// 양성 대조 — 정렬이 실제로 일을 하는가(발견형 셋이 같은 단계인 날만 있으면 이 시험은 헛돈다)
		expect(오른날).toBeGreaterThan(60);
	});

	it('10/22(EASY_FIRST_DAY)부터 1번은 늘 새싹 · 쉬움 상식, 하루 안에 같은 문제 없음', () => {
		const stable = (day: number) =>
			buildDailySetStable(PROBLEMS, TRIVIA, MATCH_TOTAL, day, (p) => fieldOfChip(p.chip), (t) => t.category ?? '기타', bankSizesAt, isOpener);
		for (let day = EASY_FIRST_DAY; day < EASY_FIRST_DAY + 120; day++) {
			const set = stable(day);
			expect(set[0].kind, `day ${day}`).toBe('trivia');
			expect(tierOf(TRIVIA[set[0].index]), `day ${day} ${TRIVIA[set[0].index].id}`).toBeLessThanOrEqual(2);
			const keys = set.map((p) => `${p.kind}-${p.index}`);
			expect(new Set(keys).size, `day ${day}`).toBe(keys.length);
		}
		// 전날까지는 그대로 — 10/21은 1번이 어른 상식이었다
		expect(tierOf(TRIVIA[stable(EASY_FIRST_DAY - 1)[0].index])).toBe(4);
	});

	/** 결과 화면이 queue 없이 유형을 복원할 때 쓰는 순서 — 실제 배치와 어긋나면 집계가 틀어진다 */
	it('dailyKindOrder가 실제 배치 순서와 같다', () => {
		// 실제로 나가는 세트는 안정 뽑기다(시작일 전은 buildDailySet에 위임) — 10/21부터 상식이 1번이라 v1과는 다르다
		for (let day = START; day < START + 400; day++) {
			const set = buildDailySetStable(PROBLEMS, TRIVIA, MATCH_TOTAL, day, (p) => fieldOfChip(p.chip), (t) => t.category ?? '기타', bankSizesAt, isOpener);
			const actual = set.map((p) => p.kind);
			expect(dailyKindOrder(day), `day ${day}`).toEqual(actual);
			expect(set[set.length - 1].bonus, `day ${day} 마지막이 보너스`).toBe(true);
		}
	});

	it('전 방문자가 같은 날 같은 문제를 푼다(같은 입력 → 같은 출력)', () => {
		for (const day of [START, START + 7, START + 100]) expect(build(day)).toEqual(build(day));
	});
});
