import { describe, expect, it } from 'vitest';
import { MATCH_ANSWERS, answerBySlug, answerSlug, cellsOf, mainRule } from './matchAnswers';
import { RULES, isTrueText, solve } from './matchSolve';

/** 「」 안에 든 식만 꺼낸다(공백 · − 정리) */
const quoted = (t: string) =>
	[...t.matchAll(/「([^」]*)」/g)]
		.map((m) => m[1].replace(/\s/g, '').replace(/−/g, '-'))
		.filter((s) => /^[\d+\-]+=\d+$/.test(s));

describe('자주 찾는 성냥 식 정답', () => {
	it('풀이 글에 적은 참인 식은 모두 풀이기 답에 있다(손으로 쓴 답이 틀리지 않게)', () => {
		for (const a of MATCH_ANSWERS) {
			const all = new Set(RULES.flatMap((r) => solve(cellsOf(a.q), r).map((s) => s.text)));
			const said = [...a.note.matchAll(/\d+ [+−] \d+ = \d+/g)].map((m) => m[0].replace(/\s/g, '').replace(/−/g, '-'));
			expect(said.length, a.q).toBeGreaterThan(0);
			for (const s of said.filter(isTrueText)) expect(all.has(s), `${a.q} → ${s}`).toBe(true);
		}
	});
	it('글을 읽는 검사가 살아 있다 — 틀린 답을 적으면 잡힌다', () => {
		const all = new Set(solve(cellsOf('12-7=6'), 'move1').map((s) => s.text));
		expect(all.has('12-6=6')).toBe(false);
		expect(isTrueText('12-6=6')).toBe(true);
	});
	it('「먼저 떠오르는 오답」은 충분히 길고, 「」 안에 든 식이 그 규칙의 정답이 아니다', () => {
		for (const a of MATCH_ANSWERS) {
			expect(a.trap.length, a.q).toBeGreaterThanOrEqual(120);
			const ok = new Set(solve(cellsOf(a.q), mainRule(a.q)).map((s) => s.text));
			for (const s of quoted(a.trap)) expect(ok.has(s), `${a.q} → ${s}`).toBe(false);
		}
	});
	it('오답 검사가 살아 있다 — 정답을 「」에 넣으면 잡힌다', () => {
		const ok = new Set(solve(cellsOf('12-7=6'), 'move1').map((s) => s.text));
		expect(quoted('먼저 「13 − 7 = 6」을 떠올린다')).toEqual(['13-7=6']);
		expect(ok.has('13-7=6')).toBe(true);
	});
	it('식마다 답이 있고, 주소 이름이 겹치지 않고 되찾아진다', () => {
		const slugs = MATCH_ANSWERS.map((a) => answerSlug(a.q));
		expect(new Set(slugs).size).toBe(slugs.length);
		expect(answerSlug('12-7=6')).toBe('12-minus-7-6');
		expect(answerSlug('9+1=0')).toBe('9-plus-1-0');
		for (const a of MATCH_ANSWERS) {
			expect(answerBySlug(answerSlug(a.q))).toBe(a);
			expect(solve(cellsOf(a.q), mainRule(a.q)).length, a.q).toBeGreaterThan(0);
		}
	});
});
