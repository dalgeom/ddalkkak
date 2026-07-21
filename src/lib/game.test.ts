import { describe, it, expect } from 'vitest';
import {
	normalize,
	isCorrectText,
	buildRound,
	scoreFor,
	emojiFor,
	seededOrder,
	kstDayNumber,
	dailyIndices,
	buildSession,
	comboScore
} from './game';
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

describe('데일리 출제', () => {
	it('seededOrder는 결정적이고 0~n-1 순열이다', () => {
		const a = seededOrder(100);
		const b = seededOrder(100);
		expect(a).toEqual(b); // 매번 동일
		expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 100 }, (_, i) => i));
	});

	it('kstDayNumber는 KST 자정마다 1씩 증가', () => {
		// 2026-01-01 00:00 KST = 2025-12-31 15:00 UTC
		const kstMidnight = Date.UTC(2025, 11, 31, 15, 0, 0);
		const d0 = kstDayNumber(kstMidnight);
		const d1 = kstDayNumber(kstMidnight + 86400000);
		expect(d1).toBe(d0 + 1);
		// 자정 직전(1초 전)은 아직 전날
		expect(kstDayNumber(kstMidnight - 1000)).toBe(d0 - 1);
	});

	it('dailyIndices: 같은 날은 같은 3문제, 하루 안에 중복 없음', () => {
		const day = 500;
		const a = dailyIndices(100, day);
		const b = dailyIndices(100, day);
		expect(a).toEqual(b);
		expect(a.length).toBe(3);
		expect(new Set(a).size).toBe(3); // 중복 없음
		// 다음 날은 다른 세트
		expect(dailyIndices(100, day + 1)).not.toEqual(a);
	});
});

describe('연속 모드', () => {
	it('buildSession: 중복 없이 size개, 풀보다 크면 전체', () => {
		const pool = Array.from({ length: 50 }, (_, i) => i);
		const s = buildSession(pool, 10);
		expect(s.length).toBe(10);
		expect(new Set(s).size).toBe(10);
		expect(buildSession(pool, 999).length).toBe(50);
	});
	it('comboScore: 콤보마다 배율 증가, 최대 2배', () => {
		expect(comboScore(100, 0)).toBe(100);
		expect(comboScore(100, 5)).toBe(150);
		expect(comboScore(100, 100)).toBe(200); // 상한
	});
});
