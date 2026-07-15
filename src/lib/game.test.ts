import { describe, it, expect } from 'vitest';
import { normalize, isCorrectText, buildRound, scoreFor, emojiFor } from './game';
import { PROBLEMS } from './problems';

describe('normalize', () => {
	it('공백과 기호를 제거하고 소문자화한다', () => {
		expect(normalize(' 5 7 4 5 ')).toBe('5745');
		expect(normalize('YAM')).toBe('yam');
		expect(normalize('19+72=91')).toBe('197291');
		expect(normalize('파랑 · 남색')).toBe('파랑남색');
	});

	it('알파벳 x는 정답 문자로 보존한다(곱셈 ×만 제거)', () => {
		expect(normalize('X')).toBe('x');
		expect(normalize('3×4')).toBe('34');
		expect(normalize('six')).toBe('six');
	});
});

describe('isCorrectText', () => {
	const holiday = PROBLEMS.find((p) => p.id === 'holiday')!;
	it('정답을 인정한다', () => {
		expect(isCorrectText(holiday, '815')).toBe(true);
		expect(isCorrectText(holiday, ' 8 1 5 ')).toBe(true);
	});
	it('오답과 빈 입력을 거부한다', () => {
		expect(isCorrectText(holiday, '814')).toBe(false);
		expect(isCorrectText(holiday, '   ')).toBe(false);
	});
});

describe('buildRound', () => {
	it('안 푼 문제만 뽑는다', () => {
		const { round, poolReset } = buildRound(PROBLEMS, [PROBLEMS[0].id]);
		expect(poolReset).toBe(false);
		expect(round.length).toBe(3);
		expect(round.map((p) => p.id)).not.toContain(PROBLEMS[0].id);
	});
	it('전부 풀었으면 풀을 재시작한다', () => {
		const all = PROBLEMS.map((p) => p.id);
		const { round, poolReset } = buildRound(PROBLEMS, all);
		expect(poolReset).toBe(true);
		expect(round.length).toBe(3);
	});
	it('남은 문제가 3개 미만이면 남은 만큼만 낸다', () => {
		const solved = PROBLEMS.slice(0, PROBLEMS.length - 1).map((p) => p.id);
		const { round } = buildRound(PROBLEMS, solved);
		expect(round.length).toBe(1);
	});
});

describe('scoreFor / emojiFor', () => {
	it('힌트 수에 따라 점수가 줄어든다', () => {
		expect(scoreFor(true, 0)).toBe(100);
		expect(scoreFor(true, 1)).toBe(80);
		expect(scoreFor(true, 2)).toBe(50);
		expect(scoreFor(true, 3)).toBe(20);
		expect(scoreFor(false, 0)).toBe(0);
	});
	it('이모지: 노힌트 ✅, 힌트 💡, 공개 🔓', () => {
		expect(emojiFor(true, 0)).toBe('✅');
		expect(emojiFor(true, 2)).toBe('💡');
		expect(emojiFor(false, 0)).toBe('🔓');
	});
});
