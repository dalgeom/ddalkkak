import { describe, it, expect } from 'vitest';
import { TRIVIA_FIELDS } from './triviaFields';
import { TRIVIA_CATEGORIES } from './triviaCategories';
import { TRIVIA } from './trivia';

describe('상식 분야 짝', () => {
	it('triviaCategories와 슬러그·이름·순서가 같다', () => {
		expect(TRIVIA_FIELDS).toEqual(TRIVIA_CATEGORIES.map((c) => [c.slug, c.name]));
	});
	it('분야마다 무한 연습에 나올 문제가 있다', () => {
		for (const [, name] of TRIVIA_FIELDS) expect(TRIVIA.filter((t) => t.category === name).length).toBeGreaterThan(0);
	});
});
