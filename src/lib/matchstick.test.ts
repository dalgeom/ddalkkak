import { describe, it, expect } from 'vitest';
import { parseEq, isTrue, isSolved, eqString, moveDiff } from './matchstick';
import problems from './data/matchstick-problems.json';
import { MATCH_TOTAL } from './game';

describe('matchstick 로직', () => {
	it('파싱과 문자열 왕복', () => {
		expect(eqString(parseEq('8 - 0 = 8'))).toBe('8 - 0 = 8');
		expect(eqString(parseEq('1 + 5 = 18'))).toBe('1 + 5 = 18');
	});

	it('등식 판정', () => {
		expect(isTrue(parseEq('8 - 0 = 8'))).toBe(true);
		expect(isTrue(parseEq('2 + 6 = 8'))).toBe(true);
		expect(isTrue(parseEq('0 + 0 = 8'))).toBe(false);
	});
});

describe('문제 은행 무결성 (741문제 전수)', () => {
	it('모든 문제: 표시식은 거짓, 해답식은 참, 정확히 성냥 하나 차이', () => {
		for (const p of problems) {
			const disp = parseEq(p.displayed);
			const sol = parseEq(p.solution);
			expect(isTrue(disp), `표시식이 참임: ${p.displayed}`).toBe(false);
			expect(isTrue(sol), `해답식이 거짓임: ${p.solution}`).toBe(true);
			const { removed, added } = moveDiff(disp, sol);
			expect(removed === 1 && added === 1, `이동량 오류: ${p.displayed} → ${p.solution}`).toBe(
				true
			);
			expect(isSolved(disp, sol), `isSolved 실패: ${p.displayed}`).toBe(true);
		}
	});
});

/**
 * 유일해 검증.
 * 위 테스트는 "제시된 해가 성립하는가"만 보고, 다른 해가 또 있는지는 보지 않는다.
 * 해가 둘이면 정답을 맞혀도 오답 처리되는 문제가 된다.
 * 생성기·앱의 구현을 재사용하지 않고 세그먼트 집합으로 독립 구현해,
 * 같은 버그가 양쪽에서 함께 통과하는 일을 막는다.
 */
const SEG: Record<number, string[]> = {
	0: ['a', 'b', 'c', 'd', 'e', 'f'],
	1: ['b', 'c'],
	2: ['a', 'b', 'd', 'e', 'g'],
	3: ['a', 'b', 'c', 'd', 'g'],
	4: ['b', 'c', 'f', 'g'],
	5: ['a', 'c', 'd', 'f', 'g'],
	6: ['a', 'c', 'd', 'e', 'f', 'g'],
	7: ['a', 'b', 'c'],
	8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
	9: ['a', 'b', 'c', 'd', 'f', 'g']
};
const ALL = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const segKey = (s: Iterable<string>) => [...s].sort().join('');
const SEG2D = new Map(Object.entries(SEG).map(([d, s]) => [segKey(s), Number(d)]));

type Parts = { a: string; op: string; b: string; c: string };
const split = (s: string): Parts | null => {
	const m = s.match(/^(\d) ([+-]) (\d) = (\d+)$/);
	return m ? { a: m[1], op: m[2], b: m[3], c: m[4] } : null;
};
const holds = (e: Parts) => (e.op === '+' ? +e.a + +e.b : +e.a - +e.b) === Number(e.c);

/** 성냥 1개를 떼어 다른 빈 자리에 붙여 도달 가능한 모든 등식 ('=' 는 불변) */
function reachable(e: Parts): Set<string> {
	const digits = [e.a, e.b, ...e.c.split('')].map((d) => new Set(SEG[Number(d)]));
	const plus0 = e.op === '+';
	const cLen = e.c.length;

	const rem: [number | 'OP', string][] = [];
	const add: [number | 'OP', string][] = [];
	digits.forEach((set, i) => {
		for (const s of ALL) (set.has(s) ? rem : add).push([i, s]);
	});
	if (plus0) rem.push(['OP', '']);
	else add.push(['OP', '']);

	const out = new Set<string>();
	for (const [ri, rs] of rem) {
		for (const [ai, as] of add) {
			if (ri === ai && rs === as) continue;
			const next = digits.map((s) => new Set(s));
			let plus = plus0;
			if (ri === 'OP') plus = false;
			else next[ri as number].delete(rs);
			if (ai === 'OP') plus = true;
			else next[ai as number].add(as);

			const ds: number[] = [];
			let ok = true;
			for (const s of next) {
				const d = SEG2D.get(segKey(s));
				if (d === undefined) {
					ok = false;
					break;
				}
				ds.push(d);
			}
			if (!ok) continue;
			const c = cLen === 1 ? `${ds[2]}` : `${ds[2]}${ds[3]}`;
			out.add(`${ds[0]} ${plus ? '+' : '-'} ${ds[1]} = ${c}`);
		}
	}
	return out;
}

describe('유일해 (독립 구현 재검산)', () => {
	it('성냥 1개를 옮겨 참이 되는 식은 제시된 해 하나뿐이다', () => {
		for (const p of problems) {
			const trues = [...reachable(split(p.displayed)!)].filter((x) => holds(split(x)!));
			expect(trues, `${p.displayed} 의 참인 해`).toEqual([p.solution]);
		}
	});

	it('해에 0으로 시작하는 두 자리 수가 없다', () => {
		for (const p of problems) {
			expect(/^0\d/.test(split(p.solution)!.c), `선행 0: ${p.solution}`).toBe(false);
		}
	});

	it('표시식이 중복되지 않는다', () => {
		const seen = new Set(problems.map((p) => p.displayed));
		expect(seen.size).toBe(problems.length);
	});

	it('game.ts의 MATCH_TOTAL이 실제 데이터 개수와 같다', () => {
		// 홈은 45KB JSON을 import하지 않고 이 상수만 쓴다 — 어긋나면 화면에 틀린 수가 뜬다
		expect(MATCH_TOTAL).toBe(problems.length);
	});
});
