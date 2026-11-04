import { describe, expect, it } from 'vitest';
import {
	best,
	charTable,
	check,
	dueum,
	forcedWin,
	makeDict,
	movesFrom,
	pickMove,
	puzzleMoves,
	startsFor,
	winsWith
} from './kkeut';

describe('두음법칙', () => {
	it('ㄹ은 ㄴ, ㅑㅕㅖㅛㅠㅣ 앞이면 ㅇ', () => {
		expect(dueum('로')).toBe('노');
		expect(dueum('력')).toBe('역');
		expect(dueum('리')).toBe('이');
		expect(dueum('류')).toBe('유');
		expect(dueum('량')).toBe('양');
		expect(dueum('례')).toBe('예');
		expect(dueum('료')).toBe('요');
	});
	it('ㄴ은 ㅑㅕㅖㅛㅠㅣ 앞에서만 ㅇ', () => {
		expect(dueum('녀')).toBe('여');
		expect(dueum('나')).toBeNull();
	});
	it('다른 글자는 없음', () => {
		expect(dueum('가')).toBeNull();
		expect(startsFor('가')).toEqual(['가']);
		expect(startsFor('력')).toEqual(['력', '역']);
	});
});

const d = makeDict(['나비', '비누', '누리', '노력', '역사', '사과', '과자']);

describe('받는 말 판정', () => {
	it('이어지는 사전 명사면 받는다', () => {
		expect(check(d, '나비', '비누', new Set(['나비']))).toEqual({ ok: true, word: '비누' });
	});
	it('띄어쓰기는 지우고 본다', () => {
		expect(check(d, '나비', ' 비 누 ', new Set())).toEqual({ ok: true, word: '비누' });
	});
	it('한 글자 · 첫 글자 틀림 · 사전에 없음 · 이미 나옴', () => {
		expect(check(d, '나비', '비', new Set())).toEqual({ ok: false, why: 'short' });
		expect(check(d, '나비', '누리', new Set())).toEqual({ ok: false, why: 'first' });
		expect(check(d, '나비', '비행', new Set())).toEqual({ ok: false, why: 'notword' });
		expect(check(d, '나비', '비누', new Set(['비누']))).toEqual({ ok: false, why: 'used' });
	});
	it('첫 수는 사전에 있으면 받고, NFD로 붙여 넣어도 받는다', () => {
		expect(check(d, null, '비누'.normalize('NFD'), new Set())).toEqual({ ok: true, word: '비누' });
	});
	it('두음으로 시작해도 받는다', () => {
		expect(check(d, '노력', '역사', new Set())).toEqual({ ok: true, word: '역사' });
	});
});

describe('낼 수 있는 말', () => {
	it('두음 글자까지 모으고 이미 나온 말은 뺀다', () => {
		expect(movesFrom(d, '력')).toEqual(['역사']);
		expect(movesFrom(d, '비', new Set(['비누']))).toEqual([]);
	});
});

// 사과 → 과자 → 자두 → 두부 → (부로 시작하는 말 없음)
const chain = makeDict(['사과', '과자', '자두', '두부']);

describe('이기는 글자 표', () => {
	const t = charTable(chain);
	it('이을 말이 없는 글자는 0수 패', () => expect(t.lose.get('부')).toBe(0));
	it('한 수로 막으면 1수 승, 그 앞은 1수 패', () => {
		expect(t.win.get('두')).toBe(1);
		expect(t.lose.get('자')).toBe(1);
	});
	it('두 수 승 · 두 수 패', () => {
		expect(t.win.get('과')).toBe(2);
		expect(t.lose.get('사')).toBe(2);
	});
	it('두음으로 이어지는 글자는 한방이 아니다', () => {
		// 력 → 역사 → (사로 시작하는 말 없음)
		const t2 = charTable(makeDict(['노력', '역사']));
		expect(t2.lose.get('력')).toBeUndefined();
		expect(t2.win.get('력')).toBe(1);
	});
});

describe('컴퓨터 수 고르기', () => {
	// 과 다음: 과자(→자, 1수 패 글자) · 과녁(→녁, 이을 말 없음 = 한방)
	const d2 = makeDict(['사과', '과자', '과녁', '자두', '두부'], ['과자']);
	const t2 = charTable(d2);
	const r0 = () => 0;
	it('새싹(1)은 쉬운 말만, 한방은 피한다', () => {
		expect(pickMove(d2, t2, 1, '과', new Set(), r0)).toBe('과자');
	});
	it('어려움(4)은 한방이 있으면 낸다', () => {
		expect(pickMove(d2, t2, 4, '과', new Set(), r0)).toBe('과녁');
	});
	it('고수(5)는 상대가 가장 빨리 지는 글자로', () => {
		expect(best(t2, ['과자', '과녁'], r0)).toBe('과녁');
	});
	it('낼 말이 없으면 null', () => {
		expect(pickMove(d2, t2, 3, '부', new Set(), r0)).toBeNull();
		expect(pickMove(d2, t2, 1, '자', new Set(), r0)).toBeNull(); // 자두는 쉬운 말이 아니다
		expect(best(t2, [], r0)).toBeNull();
	});
	// 과녁이 앞에 있어 아무렇게나 고르면 과녁이 나온다
	const words3 = ['사과', '과녁', '과자', '자두', '두부'];
	it('새싹(1)은 쉬운 한방 말이 있어도 피한다', () => {
		const d3 = makeDict(words3, ['과녁', '과자']);
		expect(pickMove(d3, charTable(d3), 1, '과', new Set(), r0)).toBe('과자');
	});
	it('쉬움(2)은 쉬운 말 밖의 말을 내지 않는다', () => {
		const d3 = makeDict(words3, ['과자']);
		expect(pickMove(d3, charTable(d3), 2, '과', new Set(), r0)).toBe('과자');
	});
	it('고수(5)는 pickMove에서도 표대로 최선을 낸다', () => {
		expect(pickMove(d2, t2, 5, '과', new Set(), r0)).toBe('과녁');
	});
	it('상대가 반드시 이기는 글자보다 미정 글자, 그중엔 오래 버티는 쪽', () => {
		// 나 ↔ 무는 돌기만 해 미정, 두는 1수 승, 과는 2수 승
		const d4 = makeDict(['가나', '가두', '가과', '나무', '무나', '과자', '자두', '두부']);
		const t4 = charTable(d4);
		expect(best(t4, ['가두', '가과', '가나'], r0)).toBe('가나');
		expect(best(t4, ['가두', '가과'], r0)).toBe('가과');
	});
});

describe('요일별 수', () => {
	it('월~목 1 · 금 2 · 토일 3', () => {
		expect(puzzleMoves(20760)).toBe(1); // 2026-11-03 화
		expect(puzzleMoves(20763)).toBe(2); // 11-06 금
		expect(puzzleMoves(20764)).toBe(3); // 11-07 토
		expect(puzzleMoves(20765)).toBe(3); // 11-08 일
		expect(puzzleMoves(20766)).toBe(1); // 11-09 월
	});
});

describe('다시 쓰기 금지까지 넣은 검증', () => {
	it('과 차례면 과자로 2수 안에 이긴다, 1수로는 못 이긴다', () => {
		expect(forcedWin(chain, '과', 2, new Set(['사과']))).toBe('과자');
		expect(forcedWin(chain, '과', 1, new Set(['사과']))).toBeNull();
		expect(winsWith(chain, '과자', 2, new Set(['사과']))).toBe(true);
	});
	it('표를 넘겨 가지쳐도 같은 답', () => {
		expect(forcedWin(chain, '과', 2, new Set(['사과']), charTable(chain))).toBe('과자');
	});
	it('같은 말을 다시 써야만 이어지면 진다', () => {
		// 나무 → 무나 → (나무는 이미 나옴) → 사람이 막힌다
		const loop = makeDict(['나무', '무나']);
		expect(forcedWin(loop, '나', 3, new Set())).toBeNull();
	});
});
