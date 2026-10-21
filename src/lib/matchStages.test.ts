import { describe, it, expect } from 'vitest';
import { STAGES, STAGE_SIZE, starsFor, isUnlocked, nextStage, RULE_LABEL } from './matchStages';
import { parseEq, isTrue, moveDiff, RULE_DIFF } from './matchstick';

describe('matchStages', () => {
	it('100단계 × 5문제(10/21에 61~100 추가), 문제가 겹치지 않는다', () => {
		expect(STAGES).toHaveLength(100);
		for (const s of STAGES) expect(s).toHaveLength(STAGE_SIZE);
		const keys = STAGES.flat().map((p) => `${p.rule}|${p.displayed}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('구성 — 1단계 옮기기, 21단계 빼기, 25단계 더하기, 29단계 옮기기, 39단계부터 2개 옮기기', () => {
		const rules = STAGES.map((s) => s[0].rule);
		expect(STAGES.every((s) => s.every((p) => p.rule === s[0].rule))).toBe(true);
		expect(rules.slice(0, 20).every((r) => r === 'move1')).toBe(true);
		expect(rules.slice(20, 24).every((r) => r === 'remove1')).toBe(true);
		expect(rules.slice(24, 28).every((r) => r === 'add1')).toBe(true);
		expect(rules.slice(28, 38).every((r) => r === 'move1')).toBe(true);
		expect(rules.slice(38, 60).every((r) => r === 'move2')).toBe(true);
		// 61~100 두 번째 바퀴: 쉬움 8 · 보통 8 · 빼기 4 · 더하기 4 · 어려움 8 · 2개 옮기기 8
		expect(rules.slice(60, 76).every((r) => r === 'move1')).toBe(true);
		expect(rules.slice(76, 80).every((r) => r === 'remove1')).toBe(true);
		expect(rules.slice(80, 84).every((r) => r === 'add1')).toBe(true);
		expect(rules.slice(84, 92).every((r) => r === 'move1')).toBe(true);
		expect(rules.slice(92).every((r) => r === 'move2')).toBe(true);
	});

	it('모든 단계 문제는 자기 규칙대로 풀린다', () => {
		for (const p of STAGES.flat()) {
			const o = parseEq(p.displayed);
			const s = parseEq(p.solution);
			expect(isTrue(s), p.displayed).toBe(true);
			expect(moveDiff(o, s), p.displayed).toEqual(RULE_DIFF[p.rule]);
		}
	});

	it('구성은 고정이다 — 배포 뒤 바뀌면 기기에 저장된 진행이 다른 문제를 가리킨다', () => {
		expect(STAGES[0][0].displayed).toBe('9 - 2 = 4');
		expect(STAGES[20][0].displayed).toBe('6 - 9 = 1');
		expect(STAGES[38][0].displayed).toBe('9 + 0 = 14');
		expect(STAGES[59][4].displayed).toBe('5 - 7 = 16');
	});

	it('별 — ★3 전부 깨끗이 · ★2 전부 풀기 · ★1 셋 이상 · 0 실패', () => {
		expect(starsFor(['clean', 'clean', 'clean', 'clean', 'clean'])).toBe(3);
		expect(starsFor(['clean', 'hinted', 'clean', 'clean', 'clean'])).toBe(2);
		expect(starsFor(['clean', 'revealed', 'clean', 'hinted', 'revealed'])).toBe(1);
		expect(starsFor(['revealed', 'revealed', 'revealed', 'clean', 'clean'])).toBe(0);
	});

	it('해금과 이어하기', () => {
		expect(isUnlocked({}, 1)).toBe(true);
		expect(isUnlocked({}, 2)).toBe(false);
		expect(isUnlocked({ 1: 1 }, 2)).toBe(true);
		expect(nextStage({})).toBe(1);
		expect(nextStage({ 1: 3, 2: 1 })).toBe(3);
		expect(nextStage(Object.fromEntries(STAGES.map((_, i) => [i + 1, 3])))).toBe(100);
	});

	it('규칙 이름', () => {
		expect(RULE_LABEL.move2).toBe('성냥 2개 옮기기');
		expect(RULE_LABEL.remove1).toBe('성냥 1개 빼기');
	});
});
