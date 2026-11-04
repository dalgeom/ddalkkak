import { describe, expect, it } from 'vitest';
import { charTable, makeDict } from './kkeut';
import { DUEL_LIMIT, firstWord, giveUp, newDuel, newPuzzle, play } from './kkeutGame';

const r0 = () => 0;

describe('퍼즐', () => {
	// 사과 → (사람) 과자 → (컴퓨터) 자두 → (사람) 두부 → 컴퓨터 막힘: 2수 퍼즐
	const d = makeDict(['사과', '과자', '과녁', '녁사', '자두', '두부']);
	const t = charTable(d);
	it('N수 안에 컴퓨터가 막히면 성공', () => {
		const g = newPuzzle('사과', 2);
		expect(play(g, d, t, '과자', r0)).toBeNull();
		expect(g.chain.map((x) => x.word)).toEqual(['사과', '과자', '자두']);
		expect(play(g, d, t, '두부', r0)).toBeNull();
		expect(g.end).toBe('win');
	});
	it('N수째에도 컴퓨터가 받아치면 실패, 받아친 말은 보여 준다', () => {
		const g = newPuzzle('사과', 1);
		play(g, d, t, '과녁', r0);
		expect(g.chain.at(-1)).toEqual({ who: 'cpu', word: '녁사' });
		expect(g.end).toBe('fail');
	});
	it('사람이 더 이을 수 있어도 N수를 다 쓰면 실패', () => {
		const g = newPuzzle('사과', 1);
		play(g, d, t, '과자', r0); // 컴퓨터: 자두, 두부가 남아 있다
		expect(g.chain.at(-1)).toEqual({ who: 'cpu', word: '자두' });
		expect(g.end).toBe('fail');
	});
	it('N수 전이라도 컴퓨터 말 뒤에 사람이 막히면 실패', () => {
		const g = newPuzzle('사과', 2);
		play(g, d, t, '과녁', r0); // 컴퓨터: 녁사, 사과는 이미 나왔다
		expect(g.end).toBe('fail');
	});
	it('끝난 판에서 낸 말은 받지 않는다', () => {
		const g = newPuzzle('사과', 2);
		giveUp(g, d);
		expect(play(g, d, t, '과자', r0)).toBeNull();
		expect(g.chain).toHaveLength(1);
	});
	it('틀린 말은 이유만 돌려주고 판은 그대로', () => {
		const g = newPuzzle('사과', 2);
		expect(play(g, d, t, '바다', r0)).toBe('first');
		expect(g.chain).toHaveLength(1);
		expect(g.end).toBeNull();
	});
});

describe('퍼즐 정답 길', () => {
	// 과 → 자로 끝나는 말 뒤 컴퓨터의 최선 수가 자두 · 자루로 동점이다
	const d = makeDict(['사과', '과자', '과학자', '자두', '자루', '두부', '루비']);
	const t = charTable(d);
	const line = ['과자', '자루', '루비'];
	const r1 = () => 0.99;
	it('정답 길을 따라가면 rand와 상관없이 길의 컴퓨터 말을 낸다', () => {
		for (const r of [r0, r1]) {
			const g = newPuzzle('사과', 2, line);
			play(g, d, t, '과자', r);
			expect(g.chain.at(-1)?.word).toBe('자루');
		}
	});
	it('길을 벗어나면 지금처럼 최선 수 중에서 고른다', () => {
		const g = newPuzzle('사과', 2, line);
		play(g, d, t, '과학자', r0);
		expect(g.chain.at(-1)?.word).toBe('자두');
	});
	it('길의 컴퓨터 말이 최선 수가 아니면 최선 수를 낸다', () => {
		const d2 = makeDict(['사과', '과자', '자두', '자바', '두부', '바다', '다리']);
		const g = newPuzzle('사과', 2, ['과자', '자두', '두부']); // 자바 → 바다 → 다리로 컴퓨터가 이긴다
		play(g, d2, charTable(d2), '과자', r0);
		expect(g.chain.at(-1)?.word).toBe('자바');
	});
});

describe('대결', () => {
	const words = ['가나', '나라', '라디오', '오리', '이사', '사자', '자두'];
	const d = makeDict(words, words);
	const t = charTable(d);
	it('컴퓨터가 막히면 사람 승리', () => {
		const g = newDuel(3, '오리');
		play(g, d, t, '이사', r0); // 컴퓨터: 사자
		expect(g.chain.at(-1)?.word).toBe('사자');
		play(g, d, t, '자두', r0); // 두로 시작하는 말 없음
		expect(g.end).toBe('win');
	});
	it('새싹 · 쉬움에서 쉬운 말 중에 낼 말이 없으면 사람 승리', () => {
		const d2 = makeDict(['가나', '나비', '비누'], ['가나', '나비']);
		const g = newDuel(1, '가나');
		expect(play(g, d2, charTable(d2), '나비', r0)).toBeNull(); // 비누는 쉬운 말이 아니다
		expect(g.chain.at(-1)).toEqual({ who: 'me', word: '나비' });
		expect(g.end).toBe('win');
	});
	it('컴퓨터 말 뒤에 사람이 낼 말이 없으면 사람 패', () => {
		const d2 = makeDict(['가나', '나비', '비녁'], ['가나', '나비', '비녁']);
		const g = newDuel(3, '가나');
		play(g, d2, charTable(d2), '나비', r0); // 컴퓨터: 비녁, 녁으로 시작하는 말 없음
		expect(g.end).toBe('lose');
	});
	it(`사람이 ${DUEL_LIMIT}수를 버티면 사람 승리`, () => {
		const g = newDuel(3, '가나');
		for (let i = 0; i < DUEL_LIMIT - 1; i++) g.chain.push({ who: 'me', word: `x${i}` }, { who: 'cpu', word: `y${i}오` });
		g.chain.push({ who: 'cpu', word: '라디오' });
		expect(play(g, d, t, '오리', r0)).toBeNull();
		expect(g.end).toBe('win');
	});
	it(`${DUEL_LIMIT - 1}수째에는 아직 끝나지 않는다`, () => {
		const g = newDuel(3, '가나');
		for (let i = 0; i < DUEL_LIMIT - 2; i++) g.chain.push({ who: 'me', word: `x${i}` }, { who: 'cpu', word: `y${i}오` });
		g.chain.push({ who: 'cpu', word: '라디오' });
		play(g, d, t, '오리', r0); // 컴퓨터: 이사
		expect(g.chain.at(-1)?.word).toBe('이사');
		expect(g.end).toBeNull();
	});
	it('기권 힌트는 쉬운 말 먼저, 셋까지', () => {
		const d2 = makeDict(['가나', '나무', '나비', '나이', '나라', '나방'], ['나라', '나방']);
		const g = newDuel(3, '가나');
		expect(giveUp(g, d2)).toEqual(['나라', '나방', '나무']);
	});
	it('첫 단어는 이을 쉬운 말이 다섯 개 넘는 쉬운 말에서 고른다', () => {
		const ws = ['다가', '나가', '가나', '가다', '가라', '가마', '가방', '가수'];
		const d2 = makeDict(ws, ws.slice(1));
		expect(firstWord(d2, charTable(d2), 1, r0)).toBe('나가');
	});
	it('기권하면 낼 수 있었던 말을 셋까지 돌려준다', () => {
		const g = newDuel(3, '나라');
		const hints = giveUp(g, d);
		expect(g.end).toBe('giveup');
		expect(hints).toEqual(['라디오']);
	});
	it('첫 단어는 사람이 처음부터 지는 글자로 끝나지 않는다', () => {
		const w = firstWord(d, t, 1, r0);
		expect(t.lose.has(w.at(-1)!)).toBe(false);
	});
});
