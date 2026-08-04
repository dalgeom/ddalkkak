import { describe, it, expect } from 'vitest';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import {
	buildDailySet,
	DAILY_SIZE,
	MATCH_TOTAL,
	CUBE_START_DAY,
	DAILY_COUNTS,
	DAILY_COUNTS_LEGACY,
	dailyKinds,
	dailyKindOrder
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
				// 전개도는 번호만 있으면 그 자리에서 만들어지므로 상한이 없다
				if (p.kind === 'cube') continue;
				const max =
					p.kind === 'discover' ? PROBLEMS.length : p.kind === 'trivia' ? TRIVIA.length : MATCH_TOTAL;
				expect(p.index).toBeLessThan(max);
			}
	});

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


	/** 결과 화면이 queue 없이 유형을 복원할 때 쓰는 순서 — 실제 배치와 어긋나면 집계가 틀어진다 */
	it('dailyKindOrder가 실제 배치 순서와 같다', () => {
		for (let day = START; day < START + 400; day++) {
			const set = build(day);
			const actual = set.map((p) => p.kind);
			expect(dailyKindOrder(day), `day ${day}`).toEqual(actual);
			expect(set[set.length - 1].bonus, `day ${day} 마지막이 보너스`).toBe(true);
		}
	});

	it('전 방문자가 같은 날 같은 문제를 푼다(같은 입력 → 같은 출력)', () => {
		for (const day of [START, START + 7, START + 100]) expect(build(day)).toEqual(build(day));
	});
});
