import { describe, it, expect } from 'vitest';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import {
	buildDailySet,
	buildDailySetStable,
	MATCH_TOTAL,
	SITE_START_DAY,
	PICK_V2_START_DAY,
	DAILY_SIZE
} from './game';
import { bankSizesAt } from './bankHistory';

/** 안정 뽑기 v2 — 은행이 자라도 세트와 재출제 간격이 흔들리지 않아야 한다 */
describe('buildDailySetStable', () => {
	const fieldOf = (x: { chip: string }) => fieldOfChip(x.chip);
	const catOf = (x: { category?: string }) => x.category ?? '기타';

	it('v2 시작일 전 날짜는 v1(buildDailySet)과 완전히 같다 — 아카이브 불변', () => {
		for (const day of [SITE_START_DAY, 20660, 20670, 20676, 20678, PICK_V2_START_DAY - 1]) {
			const sizes = bankSizesAt(day);
			const v1 = buildDailySet(
				PROBLEMS.slice(0, sizes.discover),
				TRIVIA.slice(0, sizes.trivia),
				MATCH_TOTAL,
				day,
				fieldOf,
				catOf
			);
			const v2 = buildDailySetStable(PROBLEMS, TRIVIA, MATCH_TOTAL, day, fieldOf, catOf, bankSizesAt);
			expect(v2, `day ${day}`).toEqual(v1);
		}
	});

	it('v2 날짜도 하루 10문제, 발견형은 분야가 서로 다르다', () => {
		for (let day = PICK_V2_START_DAY; day < PICK_V2_START_DAY + 60; day++) {
			const set = buildDailySetStable(PROBLEMS, TRIVIA, MATCH_TOTAL, day, fieldOf, catOf, bankSizesAt);
			expect(set.length, `day ${day}`).toBe(DAILY_SIZE);
			const dIdx = set.filter((p) => p.kind === 'discover').map((p) => p.index);
			expect(new Set(dIdx).size, `day ${day} 중복`).toBe(dIdx.length);
			const fields = dIdx.slice(0, 3).map((i) => fieldOf(PROBLEMS[i]));
			expect(new Set(fields).size, `day ${day} 분야 겹침`).toBe(fields.length);
		}
	});

	// 합성 은행: 6분야 × 균등 분포, 자라는 이력
	const FIELDS = ['수·연산', '언어·문자', '달력·시간', '규칙·분류', '도형·전광판', '관찰·추리'];
	const mkDiscover = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 'd' + i, f: FIELDS[i % 6] }));
	const CATS = Array.from({ length: 12 }, (_, i) => 'c' + i);
	const mkTrivia = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 't' + i, c: CATS[i % 12] }));
	const GROW_DAY = PICK_V2_START_DAY + 20;

	it('은행이 자라도 성장 전 날짜의 세트는 그대로다 (append 안정성)', () => {
		const sizesSmall = () => ({ discover: 300, trivia: 400 });
		const sizesGrown = (day: number) =>
			day >= GROW_DAY ? { discover: 330, trivia: 420 } : { discover: 300, trivia: 400 };
		for (let day = PICK_V2_START_DAY; day < GROW_DAY; day++) {
			const before = buildDailySetStable(
				mkDiscover(300), mkTrivia(400), MATCH_TOTAL, day,
				(x) => x.f, (x) => x.c, sizesSmall
			);
			const after = buildDailySetStable(
				mkDiscover(330), mkTrivia(420), MATCH_TOTAL, day,
				(x) => x.f, (x) => x.c, sizesGrown
			);
			expect(after, `day ${day}`).toEqual(before);
		}
	});

	it('성장 경계를 넘어도 발견형이 단기간에 재출제되지 않는다', () => {
		const sizesGrown = (day: number) =>
			day >= GROW_DAY ? { discover: 330, trivia: 420 } : { discover: 300, trivia: 400 };
		const lastSeen = new Map<number, number>();
		// v2 시대 안에서만 본다 — v1→v2 컷오버의 1회성 근접은 별도 초기화 로직이 완화한다
		for (let day = GROW_DAY - 15; day <= GROW_DAY + 25; day++) {
			const set = buildDailySetStable(
				mkDiscover(330), mkTrivia(420), MATCH_TOTAL, day,
				(x) => x.f, (x) => x.c, sizesGrown
			);
			for (const p of set) {
				if (p.kind !== 'discover') continue;
				const prev = lastSeen.get(p.index);
				if (prev !== undefined) {
					expect(day - prev, `문제 ${p.index}가 ${prev}→${day}에 재출제`).toBeGreaterThan(20);
				}
				lastSeen.set(p.index, day);
			}
		}
	});
});
