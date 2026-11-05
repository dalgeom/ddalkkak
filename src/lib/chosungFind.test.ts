import { describe, it, expect } from 'vitest';
import { parsePattern, matchWords } from './chosungFind';

const WORDS = ['사과', '수건', '시계', '사람', '고양이', '고구마', '까치', '가치', '바지', '사자'];

describe('초성으로 단어 찾기', () => {
	it('초성만 넣으면 길이가 같고 초성이 같은 말', () => {
		expect(matchWords(WORDS, parsePattern('ㅅㄱ'))).toEqual(['사과', '수건', '시계']);
	});
	it('음절이 섞이면 그 자리는 글자가 같아야 한다', () => {
		expect(matchWords(WORDS, parsePattern('사ㄱ'))).toEqual(['사과']);
	});
	it('된소리는 예사소리와 다르다', () => {
		expect(matchWords(WORDS, parsePattern('ㄲㅊ'))).toEqual(['까치']);
		expect(matchWords(WORDS, parsePattern('ㄱㅊ'))).toEqual(['가치']);
	});
	it('띄어쓰기는 무시한다', () => {
		expect(matchWords(WORDS, parsePattern(' ㄱ ㅇ ㅇ '))).toEqual(['고양이']);
	});
	it('초성 자리가 하나도 없으면 찾지 않는다', () => {
		expect(parsePattern('사과')).toBeNull();
		expect(parsePattern('abc')).toBeNull();
		expect(parsePattern('')).toBeNull();
	});
	it('초성이 될 수 없는 겹자음 · 모음 · 영문은 받지 않는다', () => {
		expect(parsePattern('ㄳㄱ')).toBeNull();
		expect(parsePattern('ㅏㄱ')).toBeNull();
		expect(parsePattern('ㅅa')).toBeNull();
	});
	it('없는 조합이면 빈 목록', () => {
		expect(matchWords(WORDS, parsePattern('ㅋㅋㅋ'))).toEqual([]);
	});
});
