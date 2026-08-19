import { describe, it, expect } from 'vitest';
import { PROBLEMS } from './problems';
import { TRIVIA } from './trivia';
import { BANK_HISTORY_ALL, BANK_HISTORY_LAST } from './bankHistory';
import { kstDayNumber } from './game';

/**
 * 문제를 더하고 갈 때 사람이 손으로 지켜야 했던 규칙들을 기계가 지킨다.
 *
 * 지금까지 사고는 늘 같은 자리에서 났다 — 문서에 "다음부터는 조심하자"고 적고,
 * 다음에 똑같이 반복. 규율을 규칙으로 옮기지 않으면 또 난다.
 */
describe('은행 무결성 — 사람 규율을 기계로', () => {
	it('bankHistory 마지막 엔트리가 실제 배열 길이와 같다', () => {
		expect({ discover: BANK_HISTORY_LAST.discover, trivia: BANK_HISTORY_LAST.trivia }).toEqual({
			discover: PROBLEMS.length,
			trivia: TRIVIA.length
		});
	});

	it('bankHistory의 fromDay는 오늘보다 미래거나, 이미 지나간 이력이다', () => {
		// 새 엔트리를 "오늘"로 적으면 낮에 세트가 바뀐다. 미래(내일 이후)로 적어야 한다.
		// 이미 배포돼 지나간 엔트리는 당연히 과거이므로, 마지막 엔트리만 본다.
		const today = kstDayNumber(Date.now());
		const last = BANK_HISTORY_ALL[BANK_HISTORY_ALL.length - 1];
		const isPast = last.fromDay < today;
		const isFuture = last.fromDay > today;
		expect(
			isPast || isFuture,
			`마지막 bankHistory 엔트리(fromDay ${last.fromDay})가 오늘이다 — 내일(${today + 1}) 이후로 적어라`
		).toBe(true);
	});

	it('은행은 줄어들지 않는다 — 삭제는 프리픽스 불변식을 깬다', () => {
		for (let i = 1; i < BANK_HISTORY_ALL.length; i++) {
			const a = BANK_HISTORY_ALL[i - 1];
			const b = BANK_HISTORY_ALL[i];
			expect(b.fromDay, 'fromDay는 증가해야 한다').toBeGreaterThan(a.fromDay);
			expect(b.discover, `discover가 줄었다 (${a.fromDay}→${b.fromDay})`).toBeGreaterThanOrEqual(a.discover);
			expect(b.trivia, `trivia가 줄었다 (${a.fromDay}→${b.fromDay})`).toBeGreaterThanOrEqual(a.trivia);
		}
	});

	it('발견형 문제에 빈 지문·빈 정답이 없다', () => {
		for (const p of PROBLEMS) {
			const hasContent = p.blocks.some((b) =>
				b.kind === 'text' ? b.html.trim().length > 0
				: b.kind === 'pre' ? b.text.trim().length > 0
				: true
			);
			expect(hasContent, `${p.id}: 지문이 비었다`).toBe(true);
			if (p.type === 'text') {
				expect(p.answers?.every((a) => a.trim().length > 0), `${p.id}: 빈 정답이 있다`).toBe(true);
			}
		}
	});

	it('상식 문제의 보기·정답이 온전하다', () => {
		for (const t of TRIVIA) {
			if (t.type !== 'choice') continue;
			expect(t.choices?.length, `${t.id}: 보기가 2개 미만`).toBeGreaterThanOrEqual(2);
			const i = t.answerIndex ?? -1;
			expect(i >= 0 && i < (t.choices?.length ?? 0), `${t.id}: answerIndex 범위 밖`).toBe(true);
			expect(new Set(t.choices).size, `${t.id}: 보기에 중복이 있다`).toBe(t.choices!.length);
		}
	});
});
