import { describe, expect, it } from 'vitest';
import { parseGrid, checkPuzzle, canOpenDay, cleanEntry } from './crossword';

const ROWS = ['가나■다라', '마■바■사', '아자차■카', '■타■파하', '거너■더러'];

describe('parseGrid', () => {
	it('가로 · 세로 2칸 이상만 낱말로 뽑고 행 우선으로 번호를 매긴다', () => {
		const g = parseGrid(ROWS);
		const list = g.words.map((w) => `${w.num}${w.dir === 'across' ? '가' : '세'}:${w.answer}`);
		expect(list).toEqual([
			'1가:가나', '1세:가마아', '2가:다라', '3세:라사카하러', '4세:바차', '5가:아자차',
			'6세:자타너', '7가:파하', '7세:파더', '8가:거너', '9가:더러'
		]);
		expect(g.numbers[0]).toBe(1);
		expect(g.numbers[1]).toBeNull();
	});
});

describe('checkPuzzle', () => {
	it('정상 판은 통과, 섬이 있으면 걸린다', () => {
		const good = ['가나다라마', '바■■■사', '아자차카타', '파■■■하', '거너더러머'];
		const clues = Object.fromEntries(parseGrid(good).words.map((w) => [w.answer, '열쇠']));
		expect(checkPuzzle({ rows: good, clues })).toEqual([]);
		const island = ['가나■■■', '■■■■■', '■■■다라', '■■■■■', '■■■■■'];
		const c2 = Object.fromEntries(parseGrid(island).words.map((w) => [w.answer, '열쇠']));
		expect(checkPuzzle({ rows: island, clues: c2 })).toContain('떨어진 섬이 있다');
	});
	it('양성 대조 — 열쇠 없음 · 열쇠에 답 · 사전에 없음 · 줄 수가 걸린다', () => {
		const rows = ['가나다라마', '바■■■사', '아자차카타', '파■■■하', '거너더러머'];
		const g = parseGrid(rows);
		const clues = Object.fromEntries(g.words.map((w) => [w.answer, '열쇠']));
		delete clues['가나다라마'];
		clues['아자차카타'] = '아자차카타라는 말';
		const why = checkPuzzle({ rows, clues }, (w) => w !== '거너더러머');
		expect(why).toContain('열쇠 없음: 가나다라마');
		expect(why).toContain('열쇠에 답이 있다: 아자차카타');
		expect(why).toContain('사전에 없음: 거너더러머');
		expect(checkPuzzle({ rows: rows.slice(1), clues })).toEqual(['줄 수 4']);
	});
});

describe('canOpenDay', () => {
	it('운영에서는 앞날을 열지 않고 dev에서만 연다', () => {
		expect(canOpenDay(101, 100, false)).toBe(false);
		expect(canOpenDay(100, 100, false)).toBe(true);
		expect(canOpenDay(99, 100, false)).toBe(true);
		expect(canOpenDay(103, 100, true)).toBe(true);
	});
});

describe('cleanEntry', () => {
	it('공백을 지우고 완성형 한글만 받는다', () => {
		expect(cleanEntry(' 사 과 ')).toBe('사과');
		expect(cleanEntry('사ㄱ')).toBeNull();
		expect(cleanEntry('abc')).toBeNull();
		expect(cleanEntry('')).toBeNull();
	});
});
