import { describe, it, expect } from 'vitest';
import problems from './data/matchstick-problems.json';
import { pickMatchDuel, matchDuelOg, MDUEL_SIZE } from './matchDuel';
import { parseVs } from './duel';
import { levelOf } from './matchstickLevels';
import { parseEq, judgeRule } from './matchstick';

describe('성냥 대결', () => {
	it('같은 씨앗이면 같은 5문제, 다른 씨앗이면 대개 다르다', () => {
		const a = pickMatchDuel(problems, 12345).map((p) => p.displayed);
		expect(pickMatchDuel(problems, 12345).map((p) => p.displayed)).toEqual(a);
		expect(pickMatchDuel(problems, 54321).map((p) => p.displayed)).not.toEqual(a);
	});
	it('5문제, 겹치지 않고, 쉬움 2 · 중간 2 · 어려움 1 순서', () => {
		for (const seed of [1, 7, 99, 123456, 987654321]) {
			const ps = pickMatchDuel(problems, seed);
			expect(ps).toHaveLength(MDUEL_SIZE);
			expect(new Set(ps.map((p) => p.displayed)).size).toBe(MDUEL_SIZE);
			expect(ps.map((p) => levelOf(p.displayed, p.solution))).toEqual(['easy', 'easy', null, null, 'hard']);
		}
	});
	// 화면은 저장된 정답이 아니라 judgeRule로 채점한다 — 뽑히는 문제마다 정답 배치가 실제로 「풀림」으로 판정되는지
	it('뽑히는 문제는 정답 배치가 하나 옮기기로 풀린다(씨앗 200개)', () => {
		for (let seed = 1; seed <= 200; seed++) {
			for (const p of pickMatchDuel(problems, seed * 7919)) {
				expect(judgeRule(parseEq(p.displayed), parseEq(p.solution), 'move1'), `${seed}: ${p.displayed}`).toBe('solved');
			}
		}
	});
	it('친구 기록은 0~5만 받는다', () => {
		expect(parseVs('5', '80', MDUEL_SIZE)).toEqual({ score: 5, secs: 80 });
		expect(parseVs('6', '80', MDUEL_SIZE)).toBeNull();
	});
});

describe('성냥 대결 링크 미리보기', () => {
	const fmt = (ms: number) => `${Math.floor(ms / 60000)}분 ${(ms / 1000) % 60}초`;
	it('점수 없는 링크 · 친구 점수 · 답장', () => {
		expect(matchDuelOg(null, fmt).image).toBe('https://ddalkkak.app/og/mduel.png');
		const o = matchDuelOg({ score: 3, secs: 80 }, fmt);
		expect(o.image).toBe('https://ddalkkak.app/og/mduel-3.png');
		expect(o.title).toBe('친구가 성냥 3/5로 도전장을 보냈어요');
		const r = matchDuelOg({ score: 3, secs: 80 }, fmt, { score: 4, secs: 50 });
		expect(r.image).toBe('https://ddalkkak.app/og/mduel-reply-4.png');
		expect(r.description).toBe('나 4/5 · 0분 50초. 친구는 몇 개 풀었을까요?');
	});
	it('그림 13장이 static/og에 다 있다(scripts/og-duel.mjs)', () => {
		const have = Object.keys(import.meta.glob('/static/og/*.png')).map((p) => p.split('/').pop());
		const want = ['mduel', ...Array.from({ length: 6 }, (_, i) => `mduel-${i}`), ...Array.from({ length: 6 }, (_, i) => `mduel-reply-${i}`)];
		for (const f of want) expect(have, f).toContain(`${f}.png`);
	});
});
