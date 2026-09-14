import { describe, it, expect } from 'vitest';
import { teaserOf } from './teaser';
import type { Problem } from './problems';

const 문제 = (blocks: Problem['blocks'], chip = '수열'): Problem =>
	({ id: 't', chip, blocks, type: 'text', answers: ['1'], hints: ['a', 'b', 'c'], explain: '' }) as Problem;

describe('내일 예고 — 문제의 첫 예시 한 줄만 흘린다', () => {
	it('예시 블록의 첫 줄을 보여 준다', () => {
		const p = 문제([
			{ kind: 'text', html: '물음표에 들어갈 수는?' },
			{ kind: 'pre', text: '2 → 5\n3 → 10\n4 → ?' }
		]);
		expect(teaserOf(p)).toEqual({ chip: '수열', line: '2 → 5' });
	});

	it('물음표가 든 줄은 절대 내보내지 않는다 — 그 줄이 문제 자체다', () => {
		const p = 문제([{ kind: 'pre', text: '\n1 2 3 ?\n' }]);
		expect(teaserOf(p).line).toBeNull();
	});

	it('글자 블록도 첫 줄을 쓴다', () => {
		const p = 문제([{ kind: 'glyph', lines: ['V = 1 · A = 0', 'ㅂ = ?'] }], '웅덩이');
		expect(teaserOf(p)).toEqual({ chip: '웅덩이', line: 'V = 1 · A = 0' });
	});

	it('안내 문장 줄은 건너뛴다 — 예시가 아니다', () => {
		const p = 문제([{ kind: 'pre', text: '회원을 모두 고르시오.\nAPPLE ○\nMOON ×' }]);
		expect(teaserOf(p).line).toBe('APPLE ○');
	});

	it('그림 문제처럼 한 줄로 못 옮기면 유형 이름만 남긴다', () => {
		const p = 문제([{ kind: 'figure', svg: '<svg></svg>' }], '물길');
		expect(teaserOf(p)).toEqual({ chip: '물길', line: null });
	});

	it('긴 줄은 잘라서 흘린다 — 예고가 문제를 다 말하면 안 된다', () => {
		const p = 문제([{ kind: 'pre', text: '2×2로 깐 4개 위에 2×2로 4개 포개기 → 20\n?' }]);
		const line = teaserOf(p).line!;
		expect(line.length).toBeLessThanOrEqual(22);
		expect(line.endsWith('…')).toBe(true);
	});
});
