/**
 * /api/day가 옛 탭(?v=2 없음)과 새 탭에 무엇을 내려주나 — 11/24 새 구성 경계.
 */
import { describe, it, expect } from 'vitest';
import { dayQueueForClient, assembleDayQueue, assembleDayView, NOTICE_ITEM } from './dayview';
import { NEW_SET_DAY } from './game';

describe('/api/day 옛 탭 · 새 탭', () => {
	it('새 구성 날에 v 없이 부르면 안내 한 칸', () => {
		const q = dayQueueForClient(NEW_SET_DAY, null);
		expect(q).toHaveLength(1);
		expect(q[0]).toBe(NOTICE_ITEM);
		expect(q[0].problem?.choices).toEqual(['새로고침']);
		expect(dayQueueForClient(NEW_SET_DAY + 1, '1')).toHaveLength(1);
	});
	it('새 구성 날에 v=2면 10칸, 새 세 유형이 채워져 있다', () => {
		const q = dayQueueForClient(NEW_SET_DAY, '2');
		expect(q).toHaveLength(10);
		expect(q[0].scramble?.word).toBeTruthy();
		expect(q.find((p) => p.kind === 'equation')?.equation?.answer).toBeGreaterThan(0);
		expect(q.find((p) => p.kind === 'sudoku')?.sudoku?.givens.length).toBeGreaterThan(0);
	});
	it('20780까지는 v와 상관없이 옛 그대로(양성 대조)', () => {
		const old = assembleDayQueue(NEW_SET_DAY - 1);
		expect(old).toHaveLength(10);
		expect(dayQueueForClient(NEW_SET_DAY - 1, null)).toEqual(old);
		expect(dayQueueForClient(NEW_SET_DAY - 1, '2')).toEqual(old);
	});
	it('보기용 묶음이 새 유형을 성냥으로 흘리지 않는다', () => {
		const v = assembleDayView(NEW_SET_DAY);
		expect(v.scramble).toHaveLength(1);
		expect(v.equation).toHaveLength(1);
		expect(v.sudoku).toHaveLength(1);
		expect(v.match.every((e) => typeof e.solution === 'string')).toBe(true);
		const old = assembleDayView(NEW_SET_DAY - 1);
		expect(old.scramble).toHaveLength(0);
	});
});
