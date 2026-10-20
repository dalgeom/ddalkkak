import { describe, it, expect } from 'vitest';
import { TRIVIA_STAGES, stageQuestions } from './triviaStages';
import { TRIVIA } from './trivia';
import { starsByScore, isOpen, nextOpen, STAGE_SIZE } from './stages';

describe('상식 단계 도전', () => {
	it('75판 — 새싹 18 · 쉬움 21 · 보통 19 · 어려움 17, 판마다 5문제, 겹침 없음', () => {
		const per = [1, 2, 3, 4].map((t) => TRIVIA_STAGES.filter((s) => s.tier === t).length);
		expect(per).toEqual([18, 21, 19, 17]);
		const all = TRIVIA_STAGES.flatMap((s) => s.ids);
		expect(TRIVIA_STAGES.every((s) => s.ids.length === STAGE_SIZE)).toBe(true);
		expect(new Set(all).size).toBe(all.length);
		expect(TRIVIA_STAGES.map((s) => s.no)).toEqual(TRIVIA_STAGES.map((_, i) => i + 1));
	});
	it('판의 문제는 그 학년의 보기 고르기다', () => {
		const grade = { 1: '초등', 2: '중등', 3: '고등', 4: '어른' } as const;
		const byId = new Map(TRIVIA.map((p) => [p.id, p]));
		for (const s of TRIVIA_STAGES)
			for (const id of s.ids) {
				const p = byId.get(id)!;
				expect(p.type, id).toBe('choice');
				expect(p.grade, id).toBe(grade[s.tier as 1 | 2 | 3 | 4]);
			}
	});
	// 기기에 진행이 남으므로 배포 뒤에 판 구성이 바뀌면 안 된다 — 첫 판과 단계 첫 판을 박아 둔다
	it('판 구성 고정', () => {
		expect(TRIVIA_STAGES[0].ids).toMatchInlineSnapshot(`
			[
			  "tv-262",
			  "tv-2",
			  "tv-355",
			  "tv-84",
			  "tv-342",
			]
		`);
		expect(TRIVIA_STAGES[18].ids).toMatchInlineSnapshot(`
			[
			  "tv-22",
			  "tv-472",
			  "tv-171",
			  "tv-296",
			  "tv-421",
			]
		`);
	});
	it('문제 꼴 — 보기와 정답 번호가 있다', () => {
		const qs = stageQuestions(1)!;
		expect(qs).toHaveLength(5);
		for (const q of qs) {
			expect(q.html.length).toBeGreaterThan(0);
			expect(q.choices.length).toBeGreaterThanOrEqual(2);
			expect(q.answerIndex).toBeLessThan(q.choices.length);
		}
		expect(stageQuestions(999)).toBeNull();
	});
});

describe('단계 공통 규칙', () => {
	it('별 — 5개 ★3 · 4개 ★2 · 3개 ★1 · 2개 이하 0', () => {
		expect([5, 4, 3, 2, 0].map((n) => starsByScore(n))).toEqual([3, 2, 1, 0, 0]);
	});
	it('단계마다 첫 판은 열려 있고, 나머지는 앞 판을 깨야 열린다', () => {
		const firstOfTier2 = TRIVIA_STAGES.find((s) => s.tier === 2)!.no;
		expect(isOpen(TRIVIA_STAGES, {}, 1)).toBe(true);
		expect(isOpen(TRIVIA_STAGES, {}, 2)).toBe(false);
		expect(isOpen(TRIVIA_STAGES, {}, firstOfTier2)).toBe(true);
		expect(isOpen(TRIVIA_STAGES, { 1: 1 }, 2)).toBe(true);
		expect(nextOpen(TRIVIA_STAGES, { 1: 3, 2: 1 })).toBe(3);
		expect(nextOpen(TRIVIA_STAGES, {}, firstOfTier2)).toBe(firstOfTier2);
	});
});
