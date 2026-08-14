import { describe, it, expect } from 'vitest';
import { PROBLEMS, DISCOVER_FIELDS, fieldOfChip, isKnownChip } from './problems';
import { TRIVIA } from './trivia';
import { isCorrectText } from './game';

describe('문제 은행 무결성', () => {
	it('id가 중복되지 않는다', () => {
		const ids = PROBLEMS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('상식 퀴즈 id도 중복되지 않는다 (Svelte {#each} 키 충돌 방지)', () => {
		const ids = TRIVIA.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('발견형 문제에 힌트가 정확히 3개 있다 (상식 퀴즈는 힌트 없음)', () => {
		for (const p of PROBLEMS) {
			if (p.trivia) continue;
			expect(p.hints?.length, p.id).toBe(3);
		}
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

	// 정답 문자열을 그대로 입력해도 오답이 나오면 그 문제는 아무도 맞힐 수 없다.
	// (실제로 콜론 시각·복수정답 순열에서 이 사고가 있었다)
	it('text형 문제는 자기 정답을 그대로 써도 정답 처리된다', () => {
		for (const p of PROBLEMS) {
			if (p.type !== 'text' || !p.answers) continue;
			for (const a of p.answers) {
				expect(isCorrectText(p, a), `${p.id}: "${a}"가 오답 처리된다`).toBe(true);
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
					const fragKeys = Object.keys(b.frags ?? {}).join('');
					const re = new RegExp(`^[0-9★+=?→:\\s−${fragKeys}-]+$`);
					for (const line of b.lines) {
						expect(re.test(line), `${p.id}: ${line}`).toBe(true);
					}
				}
			}
		}
	});

	it('lcd frags는 유효한 세그먼트 문자(a~g)만 쓴다', () => {
		for (const p of PROBLEMS) {
			for (const b of p.blocks) {
				if (b.kind === 'lcd' && b.frags) {
					for (const [key, segs] of Object.entries(b.frags)) {
						expect(/^[a-g]*$/.test(segs), `${p.id}: ${key}=${segs}`).toBe(true);
					}
				}
			}
		}
	});
});
describe('발견형 분야 태깅', () => {
	// fieldOfChip은 모르는 chip을 조용히 '관찰·추리'로 떨어뜨리므로,
	// "6개 분야 중 하나냐"는 검사만으로는 오타를 절대 못 잡는다(항상 참).
	it('모든 chip이 CHIP_FIELD에 실제로 등록돼 있다 — 오타는 폴백으로 숨는다', () => {
		for (const p of PROBLEMS) {
			expect(isKnownChip(p.chip), `등록되지 않은 chip: ${p.chip} (${p.id})`).toBe(true);
		}
	});
	it('모든 발견형 chip이 정의된 6개 분야 중 하나로 매핑된다', () => {
		for (const p of PROBLEMS) {
			expect(DISCOVER_FIELDS, p.chip).toContain(fieldOfChip(p.chip));
		}
	});
	it('빈 분야가 없다 — 6개 분야 각각 최소 1문제', () => {
		const counts = new Map<string, number>();
		for (const p of PROBLEMS) {
			const f = fieldOfChip(p.chip);
			counts.set(f, (counts.get(f) ?? 0) + 1);
		}
		for (const f of DISCOVER_FIELDS) expect(counts.get(f) ?? 0, f).toBeGreaterThan(0);
	});
});
