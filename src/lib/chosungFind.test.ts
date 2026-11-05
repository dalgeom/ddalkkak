import { describe, it, expect } from 'vitest';
import { parsePattern, matchWords, fieldOf } from './chosungFind';

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

describe('fieldOf — 뜻풀이 끝말로 분야 가르기', () => {
	it('동물 · 과일 · 나라 이름은 잡는다', () => {
		expect(fieldOf('토끼', '귀가 길고 뒷다리가 앞다리보다 발달하였으며 꼬리는 짧은 동물.')).toBe('animal');
		expect(fieldOf('참새', '주로 사람이 사는 곳 근처에 살며, 몸은 갈색이고 배는 회백색인 작은 새.')).toBe('animal');
		expect(fieldOf('사과', '모양이 둥글고 맛이 새콤달콤한 빨간 과일.')).toBe('fruit-vegetable');
		expect(fieldOf('가나', '아프리카 서부에 있는 나라.')).toBe('country');
	});
	it('냄새 · 생김새 · 「아이나 동물」 · 묶음 말은 뺀다', () => {
		expect(fieldOf('고린내', '고약하고 불쾌한 냄새.')).toBeNull();
		expect(fieldOf('관상', '사람의 운명이나 수명, 성격 등과 관련이 있는 얼굴의 생김새.')).toBeNull();
		expect(fieldOf('귀염둥이', '예쁘고 사랑스러운 행동으로 사람들에게 귀염을 받는 아이나 동물.')).toBeNull();
		expect(fieldOf('가축', '사람이 생활에 도움을 얻으려고 집에서 기르는 짐승.')).toBeNull();
		expect(fieldOf('사자', '죽은 사람.')).toBeNull();
		expect(fieldOf('망명지', '… 몰래 자기 나라를 떠나 살고 있는 다른 나라.')).toBeNull();
	});
});
