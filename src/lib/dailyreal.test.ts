import { describe, it, expect } from 'vitest';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import { buildDailySet, DAILY_SIZE, MATCH_TOTAL } from './game';

/** 실제 문제은행으로 "오늘의 딸깍" 하루 세트를 검증한다(합성 데이터로는 분포 편향을 못 잡는다). */
describe('오늘의 딸깍 — 실제 문제은행 검증', () => {
	const build = (day: number) =>
		buildDailySet(PROBLEMS, TRIVIA, MATCH_TOTAL, day, (p) => fieldOfChip(p.chip), (t) => t.category ?? '기타');
	const START = 20649;

	it('1년치 어느 날이든 10문제 · 유형 3/3/3+보너스1 · 문제 중복 없음', () => {
		for (let day = START; day < START + 365; day++) {
			const set = build(day);
			expect(set.length, `day ${day}`).toBe(DAILY_SIZE);
			expect(set.filter((p) => p.bonus).length, `day ${day} 보너스`).toBe(1);
			const base = set.filter((p) => !p.bonus);
			for (const k of ['discover', 'trivia', 'match'] as const)
				expect(base.filter((p) => p.kind === k).length, `day ${day} ${k}`).toBe(3);
			const keys = set.map((p) => `${p.kind}:${p.index}`);
			expect(new Set(keys).size, `day ${day} 같은 문제 두 번`).toBe(keys.length);
		}
	});

	it('발견형 3문제는 분야가 모두 다르고, 상식 3문제는 카테고리가 모두 다르다', () => {
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
				const max = p.kind === 'discover' ? PROBLEMS.length : p.kind === 'trivia' ? TRIVIA.length : MATCH_TOTAL;
				expect(p.index).toBeGreaterThanOrEqual(0);
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

	it('전 방문자가 같은 날 같은 문제를 푼다(같은 입력 → 같은 출력)', () => {
		for (const day of [START, START + 7, START + 100]) expect(build(day)).toEqual(build(day));
	});
});
