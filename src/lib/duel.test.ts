import { describe, it, expect } from 'vitest';
import { pickDuel, parseSeed, parseVs, duelOutcome, duelOg, DUEL_SIZE, DUEL_PLAN } from './duel';
import { TRIVIA } from './trivia';

describe('상식 대결', () => {
	it('같은 씨앗이면 같은 10문제, 다른 씨앗이면 대개 다르다', () => {
		const a = pickDuel(TRIVIA, 12345).map((p) => p.id);
		expect(pickDuel(TRIVIA, 12345).map((p) => p.id)).toEqual(a);
		expect(pickDuel(TRIVIA, 54321).map((p) => p.id)).not.toEqual(a);
	});
	it('10문제, 겹치지 않고, 쉬운 순서(초등 3 · 중등 3 · 고등 2 · 어른 2), 전부 선택형', () => {
		for (const seed of [1, 7, 99, 123456, 987654321]) {
			const ps = pickDuel(TRIVIA, seed);
			expect(ps).toHaveLength(DUEL_SIZE);
			expect(new Set(ps.map((p) => p.id)).size).toBe(DUEL_SIZE);
			const grades = DUEL_PLAN.flatMap(([g, k]) => Array(k).fill(g));
			expect(ps.map((p) => p.grade)).toEqual(grades);
			for (const p of ps) {
				expect(p.type).toBe('choice');
				expect(p.choices?.[p.answerIndex ?? -1], p.id).toBeTruthy();
			}
		}
	});
	it('링크 값 검사', () => {
		expect(parseSeed('123')).toBe(123);
		expect(parseSeed('0')).toBeNull();
		expect(parseSeed('-1')).toBeNull();
		expect(parseSeed('abc')).toBeNull();
		expect(parseVs('7', '80')).toEqual({ score: 7, secs: 80 });
		expect(parseVs('11', '80')).toBeNull();
		expect(parseVs('7', '0')).toBeNull();
		expect(parseVs(null, '80')).toBeNull();
	});
	it('승패 — 점수 먼저, 같으면 빠른 쪽', () => {
		expect(duelOutcome({ score: 8, secs: 90 }, { score: 7, secs: 30 })).toBe('win');
		expect(duelOutcome({ score: 7, secs: 90 }, { score: 7, secs: 30 })).toBe('lose');
		expect(duelOutcome({ score: 7, secs: 30 }, { score: 7, secs: 30 })).toBe('draw');
	});
});

describe('대결 링크 미리보기', () => {
	const fmt = (ms: number) => `${Math.floor(ms / 60000)}분 ${(ms / 1000) % 60}초`;
	it('점수 없는 링크는 기본 대결 그림', () => {
		expect(duelOg(null, fmt)).toEqual({
			title: '상식 퀴즈 대결 — 같은 10문제로 겨뤄요',
			description: '쉬운 문제부터 10개. 점수가 같으면 빠른 쪽이 이겨요.',
			image: 'https://ddalkkak.app/og/duel.png'
		});
	});
	it('친구 점수에 맞는 그림 · 시간은 설명에', () => {
		const o = duelOg({ score: 7, secs: 80 }, fmt);
		expect(o.image).toBe('https://ddalkkak.app/og/duel-7.png');
		expect(o.title).toBe('친구가 7/10으로 도전장을 보냈어요');
		expect(o.description).toBe('같은 10문제, 1분 20초. 이길 수 있어요?');
	});
	it('만점 · 0점은 문구가 다르다', () => {
		expect(duelOg({ score: 10, secs: 58 }, fmt).description).toBe('이기려면 0분 58초보다 빨리 다 맞혀야 해요.');
		expect(duelOg({ score: 0, secs: 125 }, fmt).description).toBe('같은 10문제, 하나만 맞혀도 이겨요.');
	});
	it('그림 12장이 static/og에 다 있다(scripts/og-duel.mjs)', () => {
		const have = Object.keys(import.meta.glob('/static/og/*.png')).map((p) => p.split('/').pop());
		for (const f of ['duel', ...Array.from({ length: 11 }, (_, i) => `duel-${i}`)]) expect(have, f).toContain(`${f}.png`);
	});
});
