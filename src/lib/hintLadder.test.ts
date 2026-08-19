import { describe, it, expect } from 'vitest';
import { PROBLEMS } from './problems';
import { normalize } from './game';
import type { Problem } from './problems';

/**
 * 힌트 사다리 검사 (명세 PART 5).
 *
 *   힌트1 = 관찰 유도 → 힌트2 = 조작 지정 → 힌트3 = 규칙 절반 + 예시 하나
 *   정답 공개는 마지막(해설)에서.
 *
 * 이게 무너지면 사다리가 3단이 아니라 2단이 된다. 힌트3을 열었더니 정답이 그대로
 * 적혀 있으면, 힌트를 여는 순간이 곧 포기하는 순간이 되어 '발견'이 사라진다.
 *
 * 기계가 확실히 잴 수 있는 것만 본다 — 정답 문자열이 힌트에 그대로 있는가.
 * "규칙을 너무 많이 알려줬는가"는 판단이라 사람 몫이다.
 */

/** 지문 원문 — 힌트가 문제 문장을 인용하는 건 노출이 아니다 */
function bodyOf(p: Problem): string {
	return normalize(
		p.blocks
			.map((b) =>
				b.kind === 'text' ? b.html
				: b.kind === 'pre' ? b.text
				: b.kind === 'lcd' || b.kind === 'glyph' ? b.lines.join(' ')
				: ''
			)
			.join(' ')
			.replace(/<[^>]+>/g, '')
	);
}

/** 힌트에 정답이 문자 그대로 박혀 있는가 */
function leaksAnswer(hint: string, answers: string[], body: string): string | null {
	const h = normalize(hint.replace(/<[^>]+>/g, ''));
	for (const a of answers) {
		const n = normalize(a);
		// 한두 글자 답(3, ㄹ, X…)은 힌트 문장에 우연히 섞이므로 셀 수 없다
		if (n.length < 3) continue;
		// 지문에 이미 있는 말이면 인용일 뿐이다 ("9마리만 빼고 달아났다")
		if (body.includes(n)) continue;
		if (h.includes(n)) return a;
	}
	return null;
}

/** 객관식 정답 문자열 */
function answersOf(p: Problem): string[] {
	if (p.type === 'choice') {
		const c = p.choices?.[p.answerIndex ?? -1];
		return c ? [c] : [];
	}
	return p.answers ?? [];
}

describe('힌트 사다리', () => {
	const withHints = PROBLEMS.filter((p) => p.hints?.length === 3);

	it('모든 발견형에 힌트가 정확히 3단이다', () => {
		const bad = PROBLEMS.filter((p) => !p.trivia && p.hints?.length !== 3).map((p) => p.id);
		expect(bad, `힌트 3단이 아닌 문제: ${bad.join(', ')}`).toEqual([]);
	});

	it('힌트 1·2단에 정답이 그대로 적혀 있지 않다', () => {
		const bad: string[] = [];
		for (const p of withHints) {
			const answers = answersOf(p);
			if (!answers.length) continue;
			for (const i of [0, 1]) {
				const leak = leaksAnswer(p.hints![i], answers, bodyOf(p));
				if (leak) bad.push(`${p.id} 힌트${i + 1}: "${leak}" 노출`);
			}
		}
		expect(bad, `정답 노출:\n  ${bad.join('\n  ')}`).toEqual([]);
	});

	it('힌트 3단에도 정답이 그대로 적혀 있지 않다 — 규칙 절반까지만', () => {
		const bad: string[] = [];
		for (const p of withHints) {
			const answers = answersOf(p);
			if (!answers.length) continue;
			const leak = leaksAnswer(p.hints![2], answers, bodyOf(p));
			if (leak) bad.push(`${p.id}: "${leak}"`);
		}
		expect(bad, `힌트3이 정답을 그대로 알려준다:\n  ${bad.join('\n  ')}`).toEqual([]);
	});

	it('린터가 실제로 잡는다 — 힌트에 정답을 박으면 걸린다', () => {
		const victim = PROBLEMS.find((p) => (p.answers?.[0]?.length ?? 0) >= 3 && p.hints)!;
		const answer = victim.answers![0];
		const tampered = {
			...victim,
			hints: [victim.hints![0], victim.hints![1], `정답은 ${answer}입니다`] as [string, string, string]
		};
		expect(leaksAnswer(tampered.hints[2], answersOf(tampered), bodyOf(tampered))).toBe(answer);
	});
});
