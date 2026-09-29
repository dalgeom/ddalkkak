import { describe, it, expect } from 'vitest';
import { chosungOf, isCorrect, collisionsOf, chosungOfDay, CHOSUNG_WORDS } from './chosung';
import { CHOSUNG_CATEGORIES } from './data/chosung';

const byWord = (w: string) => CHOSUNG_WORDS.find((x) => x.word === w)!;

describe('초성 뽑기', () => {
	it('음절마다 초성, 된소리도 그대로', () => {
		expect(chosungOf('떡볶이')).toBe('ㄸㅂㅇ');
		expect(chosungOf('짜장면')).toBe('ㅉㅈㅁ');
		expect(chosungOf('고슴도치')).toBe('ㄱㅅㄷㅊ');
	});
});

describe('낱말 데이터', () => {
	it('낱말은 한글 음절만, 분야 안에서 중복 없음', () => {
		for (const c of CHOSUNG_CATEGORIES) {
			const ws = c.words.map((w) => w[0]);
			expect(new Set(ws).size, c.slug).toBe(ws.length);
			for (const w of ws) expect(w, `${c.slug}/${w}`).toMatch(/^[가-힣]{2,}$/);
		}
	});

	it('힌트가 정답 낱말을 그대로 품지 않는다', () => {
		for (const w of CHOSUNG_WORDS) expect(w.hint.includes(w.word), w.word).toBe(false);
	});

	it('분야 페이지의 대표 낱말은 그 분야에 실제로 있다', () => {
		for (const c of CHOSUNG_CATEGORIES) {
			expect(c.featured.length, c.slug).toBe(10);
			for (const f of c.featured) expect(c.words.some((w) => w[0] === f), `${c.slug}/${f}`).toBe(true);
		}
	});

	it('슬러그가 겹치지 않는다', () => {
		const s = CHOSUNG_CATEGORIES.map((c) => c.slug);
		expect(new Set(s).size).toBe(s.length);
	});

	// 사자성어는 전부 네 글자다 — 분야 소개가 그렇게 말한다
	it('사자성어는 네 글자', () => {
		for (const w of CHOSUNG_WORDS.filter((x) => x.category === 'idiom')) expect(w.word.length, w.word).toBe(4);
	});

	it('분야 소개가 예로 든 겹침이 실제로 겹친다', () => {
		const has = (slug: string, a: string, b: string) =>
			collisionsOf(slug).some((g) => g.words.includes(a) && g.words.includes(b));
		expect(has('animal', '고래', '기린')).toBe(true);
		expect(has('animal', '여우', '악어')).toBe(true);
		expect(has('food', '김치', '곱창')).toBe(true);
		expect(has('fruit-vegetable', '감자', '가지')).toBe(true);
		expect(has('fruit-vegetable', '사과', '생강')).toBe(true);
		expect(has('fruit-vegetable', '오이', '우엉')).toBe(true);
		expect(has('country', '미국', '몽골')).toBe(true);
	});
});

describe('채점', () => {
	it('정답·띄어쓰기·다른 표기', () => {
		expect(isCorrect(byWord('떡볶이'), '떡볶이')).toBe(true);
		expect(isCorrect(byWord('떡볶이'), ' 떡 볶이 ')).toBe(true);
		expect(isCorrect(byWord('돈가스'), '돈까스')).toBe(true);
		expect(isCorrect(byWord('떡볶이'), '떡국')).toBe(false);
		expect(isCorrect(byWord('떡볶이'), '')).toBe(false);
	});

	it('같은 분야에서 초성이 같은 낱말도 정답, 다른 분야 낱말은 아니다', () => {
		expect(isCorrect(byWord('고래'), '기린')).toBe(true);
		expect(isCorrect(byWord('감자'), '가지')).toBe(true);
		// 사과(과일·채소)와 초성이 같아도 다른 분야의 낱말이면 받지 않는다 — 양성 대조로 같은 분야 생강은 받는다
		expect(isCorrect(byWord('사과'), '생강')).toBe(true);
		expect(isCorrect(byWord('사자'), '사과')).toBe(false);
	});
});

describe('오늘의 초성', () => {
	it('같은 날은 같은 낱말, 한 바퀴 안에서는 겹치지 않는다', () => {
		const start = 20725;
		expect(chosungOfDay(start)).toBe(chosungOfDay(start));
		const seen = new Set<number>();
		for (let d = start; d < start + CHOSUNG_WORDS.length; d++) seen.add(chosungOfDay(d));
		expect(seen.size).toBe(CHOSUNG_WORDS.length);
	});
});
