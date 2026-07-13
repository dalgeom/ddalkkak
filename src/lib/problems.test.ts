import { describe, it, expect } from 'vitest';
import { PROBLEMS } from './problems';

describe('문제 은행 무결성', () => {
	it('id가 중복되지 않는다', () => {
		const ids = PROBLEMS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('모든 문제에 힌트가 정확히 3개 있다', () => {
		for (const p of PROBLEMS) expect(p.hints.length).toBe(3);
	});

	it('text형은 정답 목록이, choice형은 유효한 정답 인덱스가 있다', () => {
		for (const p of PROBLEMS) {
			if (p.type === 'text') {
				expect(p.answers && p.answers.length > 0, p.id).toBe(true);
			} else {
				expect(p.choices && p.choices.length >= 2, p.id).toBe(true);
				expect(
					p.answerIndex !== undefined && p.answerIndex >= 0 && p.answerIndex < p.choices!.length,
					p.id
				).toBe(true);
			}
		}
	});

	it('모든 문제에 해설과 카테고리 칩이 있다', () => {
		for (const p of PROBLEMS) {
			expect(p.explain.length > 10, p.id).toBe(true);
			expect(p.chip.length > 0, p.id).toBe(true);
		}
	});

	it('lcd 블록의 숫자는 렌더 가능한 문자만 쓴다', () => {
		for (const p of PROBLEMS) {
			for (const b of p.blocks) {
				if (b.kind === 'lcd') {
					for (const line of b.lines) {
						expect(/^[0-9★+=?\s−-]+$/.test(line), `${p.id}: ${line}`).toBe(true);
					}
				}
			}
		}
	});
});
