// 사자성어 쪽 「속담으로 찾는 사자성어」 구역(11/18) — 짝 목록이 다른 놀이의 정답을 흘리지 않게 막는다.
import { describe, expect, it } from 'vitest';
import { TRIVIA_CATEGORIES } from './triviaCategories';
import { CHOSUNG_CATEGORIES } from './data/chosung';
import { TRIVIA } from './trivia';

const idiom = TRIVIA_CATEGORIES.find((c) => c.slug === 'idiom')!;
const pv = idiom.proverbs ?? [];

describe('사자성어 속담 짝', () => {
	it('9쌍, 성어 · 한자 모두 네 글자, 중복 없음', () => {
		expect(pv.length).toBe(9);
		for (const [w, h] of pv) {
			expect([...w].length, w).toBe(4);
			expect([...h].length, h).toBe(4);
		}
		expect(new Set(pv.map((p) => p[0])).size).toBe(pv.length);
		expect(new Set(pv.map((p) => p[2])).size).toBe(pv.length);
	});

	it('사자성어 초성 퀴즈 정답과 겹치지 않음', () => {
		const words = new Set(CHOSUNG_CATEGORIES.find((c) => c.slug === 'idiom')!.words.map(([w]) => w));
		expect(words.size).toBeGreaterThan(0); // 양성: 초성 정답을 실제로 읽었다
		expect(words.has('적반하장')).toBe(true); // 양성: 빠진 이유가 된 정답이 잡힌다
		for (const [w] of pv) expect(words.has(w), w).toBe(false);
	});

	it('상식 은행 정답과 겹치지 않음', () => {
		const answers = new Set(
			TRIVIA.flatMap((q) => [...(q.answers ?? []), ...(q.choices && q.answerIndex !== undefined ? [q.choices[q.answerIndex]] : [])])
		);
		expect(answers.has('새옹지마')).toBe(true); // 양성: 상식 정답을 실제로 읽었다
		for (const [w] of pv) expect(answers.has(w), w).toBe(false);
	});

	it('다른 분야에는 짝 목록이 없음', () => {
		expect(TRIVIA_CATEGORIES.filter((c) => c.proverbs).map((c) => c.slug)).toEqual(['idiom']);
	});
});
