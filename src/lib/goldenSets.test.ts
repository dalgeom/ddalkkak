import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import { buildDailySetStable, MATCH_TOTAL, SITE_START_DAY, kstDayNumber } from './game';
import { bankSizesAt } from './bankHistory';

/**
 * 골든 스냅샷 — 날짜별 세트(인덱스)를 픽스처로 박제한다.
 *
 * 왜: 세트 계산은 v1·v2·bankHistory·컷오버 휴리스틱이라는 "동결된 역사"의 함수다.
 * 성질 테스트(10문제·분야 다름)만으로는 알고리즘을 통째로 바꿔도 통과하면서
 * 과거 아카이브가 조용히 바뀔 수 있다. 이 픽스처가 깨지면 무조건 코드가 잘못이다.
 *
 * 인덱스를 박제한다 — id가 아니라. 자리 교체(같은 인덱스에 새 문제)는 허용된
 * 정책이라 id는 바뀔 수 있지만, 어떤 "자리"가 어느 날 나가는지는 불변이어야 한다.
 *
 * 픽스처 연장(새 날짜 추가)이 필요하면:
 *   GOLDEN_APPEND=1 npx vitest run src/lib/goldenSets.test.ts
 * — 기존 날짜는 절대 덮어쓰지 않고 뒤에만 붙는다.
 */
const FIXTURE = join(__dirname, 'golden-sets.json');
/**
 * 어제까지만 박제한다.
 *
 * 처음에는 석 달 앞까지 미리 계산해 넣었는데, 그러면 은행에 문제를 더하는 순간
 * 반드시 깨진다 — 아직 오지 않은 날의 세트가 바뀌는 것은 고장이 아니라 설계다.
 * 안정 뽑기가 지키기로 한 것은 "이미 나간 날은 그대로"이지 "미래도 그대로"가 아니다.
 * 오늘 것도 넣지 않는다. 자정 직전에 스냅샷을 뜨면 다음 날 아침 것과 엇갈린다.
 */
const END_DAY = kstDayNumber(Date.now()) - 1;

type Golden = Record<string, { d: number[]; t: number[] }>;

function computeDay(day: number): { d: number[]; t: number[] } {
	const picks = buildDailySetStable(
		PROBLEMS,
		TRIVIA,
		MATCH_TOTAL,
		day,
		(x) => fieldOfChip(x.chip),
		(x) => x.category ?? '기타',
		bankSizesAt
	);
	return {
		d: picks.filter((p) => p.kind === 'discover').map((p) => p.index),
		t: picks.filter((p) => p.kind === 'trivia').map((p) => p.index)
	};
}

describe('골든 스냅샷 — 출제 이력은 절대 바뀌지 않는다', () => {
	it('픽스처의 모든 날짜가 현재 코드의 계산과 일치한다', () => {
		if (!existsSync(FIXTURE) || process.env.GOLDEN_APPEND) {
			const golden: Golden = existsSync(FIXTURE)
				? JSON.parse(readFileSync(FIXTURE, 'utf-8'))
				: {};
			for (let day = SITE_START_DAY; day <= END_DAY; day++) {
				if (!(String(day) in golden)) golden[String(day)] = computeDay(day);
			}
			writeFileSync(FIXTURE, JSON.stringify(golden));
		}
		const golden: Golden = JSON.parse(readFileSync(FIXTURE, 'utf-8'));
		// 미래 날짜가 남아 있으면 지운다 — 은행이 자라면 어차피 달라진다
		const days = Object.keys(golden).filter((d) => Number(d) <= END_DAY);
		expect(days.length).toBeGreaterThanOrEqual(END_DAY - SITE_START_DAY);
		for (const day of days) {
			expect(computeDay(Number(day)), `day ${day} 세트가 픽스처와 다르다`).toEqual(golden[day]);
		}
	});
});
