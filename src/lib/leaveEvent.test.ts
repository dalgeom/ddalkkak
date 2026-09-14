import { describe, it, expect } from 'vitest';
import { leaveEventName } from './analytics';

describe('데일리 이탈 지점 — 자리와 상태를 이벤트 이름에 싣는다', () => {
	it('몇 번째 문제인지는 1부터 센다', () => {
		expect(leaveEventName('leave', 0, { judged: false, tried: false })).toBe('leave_p1_open');
		expect(leaveEventName('leave', 9, { judged: false, tried: false })).toBe('leave_p10_open');
	});

	it('아무것도 안 해 봤나 · 해 보다 막혔나 · 답을 내고 결과를 봤나를 가른다', () => {
		expect(leaveEventName('leave', 2, { judged: false, tried: false })).toBe('leave_p3_open');
		expect(leaveEventName('leave', 2, { judged: false, tried: true })).toBe('leave_p3_tried');
		// 답을 냈으면 그 전에 무엇을 했든 결과를 본 뒤다
		expect(leaveEventName('leave', 2, { judged: true, tried: true })).toBe('leave_p3_after');
	});

	it('돌아온 사람은 같은 꼴의 back 이름으로 짝을 맞춘다 — 순수 이탈은 둘의 차이다', () => {
		expect(leaveEventName('back', 4, { judged: false, tried: true })).toBe('back_p5_tried');
	});

	it('자리가 범위를 벗어나도 이름이 망가지지 않는다', () => {
		expect(leaveEventName('leave', -3, { judged: false, tried: false })).toBe('leave_p1_open');
		expect(leaveEventName('leave', 42, { judged: true, tried: false })).toBe('leave_p10_after');
	});
});
