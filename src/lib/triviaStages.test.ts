import { describe, it, expect } from 'vitest';
import { TRIVIA_STAGES, TRIVIA_LEGACY, stageQuestions } from './triviaStages';
import { TRIVIA } from './trivia';
import { starsByScore, isOpen, nextOpen, isTierEnd, loadProgress, buildTierStages, STAGE_SIZE } from './stages';

describe('상식 단계 도전', () => {
	it('새싹 19 · 쉬움 21 · 보통 19 · 어려움 17 · 고수 6(10/22 새싹 5 · 고수 10 추가), 판마다 5문제, 겹침 없음', () => {
		const per = [1, 2, 3, 4, 5].map((t) => TRIVIA_STAGES.filter((s) => s.tier === t).length);
		expect(per).toEqual([20, 21, 19, 17, 8]);
		const all = TRIVIA_STAGES.flatMap((s) => s.ids);
		expect(TRIVIA_STAGES.every((s) => s.ids.length === STAGE_SIZE)).toBe(true);
		expect(new Set(all).size).toBe(all.length);
		expect(new Set(TRIVIA_STAGES.map((s) => s.key)).size).toBe(TRIVIA_STAGES.length);
	});
	it('판의 문제는 그 학년의 보기 고르기다', () => {
		const grade = { 1: '초등', 2: '중등', 3: '고등', 4: '어른', 5: '어른' } as const; // 고수(5)는 어른 문제 중 tier: 5를 단 것
		const byId = new Map(TRIVIA.map((p) => [p.id, p]));
		for (const s of TRIVIA_STAGES)
			for (const id of s.ids) {
				const p = byId.get(id)!;
				expect(p.type, id).toBe('choice');
				expect(p.grade, id).toBe(grade[s.tier as 1 | 2 | 3 | 4 | 5]);
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
		// 쉬움 1판 — 줄번호가 아니라 열쇠로 찾는다(새싹에 판이 붙으면 줄번호가 밀린다, 10/22)
		expect(TRIVIA_STAGES.find((s) => s.key === '2-1')!.ids).toMatchInlineSnapshot(`
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
		const qs = stageQuestions('1-1')!;
		expect(qs).toHaveLength(5);
		for (const q of qs) {
			expect(q.html.length).toBeGreaterThan(0);
			expect(q.choices.length).toBeGreaterThanOrEqual(2);
			expect(q.answerIndex).toBeLessThan(q.choices.length);
		}
		expect(stageQuestions('9-9')).toBeNull();
	});
});

describe('단계 공통 규칙', () => {
	it('별 — 5개 ★3 · 4개 ★2 · 3개 ★1 · 2개 이하 0', () => {
		expect([5, 4, 3, 2, 0].map((n) => starsByScore(n))).toEqual([3, 2, 1, 0, 0]);
	});
	it('단계마다 첫 판은 열려 있고, 나머지는 앞 판을 깨야 열린다', () => {
		expect(isOpen(TRIVIA_STAGES, {}, '1-1')).toBe(true);
		expect(isOpen(TRIVIA_STAGES, {}, '1-2')).toBe(false);
		expect(isOpen(TRIVIA_STAGES, {}, '2-1')).toBe(true);
		expect(isOpen(TRIVIA_STAGES, { '1-1': 1 }, '1-2')).toBe(true);
		expect(nextOpen(TRIVIA_STAGES, { '1-1': 3, '1-2': 1 })).toBe('1-3');
		expect(nextOpen(TRIVIA_STAGES, {}, 2)).toBe('2-1');
	});
	it('단계 끝 판 — 그 단계에 뒤 판이 없으면 끝', () => {
		expect(isTierEnd(TRIVIA_STAGES, '1-20')).toBe(true);
		expect(isTierEnd(TRIVIA_STAGES, '1-19')).toBe(false);
	});
});

describe('판 열쇠 — 새 판을 붙여도 기록이 안 밀린다(10/21)', () => {
	it('10/20 줄번호 → 열쇠: 1번 = 1-1, 19번 = 2-1, 60번 = 4-2, 75번 = 4-17', () => {
		expect([1, 19, 60, 75].map((n) => TRIVIA_LEGACY[n - 1])).toEqual(['1-1', '2-1', '4-2', '4-17']);
		expect(TRIVIA_LEGACY).toHaveLength(75);
	});
	it('옛 줄번호 기록을 처음 열 때 열쇠로 옮기고 다시 저장한다', () => {
		const store: Record<string, string> = { k: JSON.stringify({ 1: 3, 60: 2, '2-3': 1 }) };
		globalThis.localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) } as unknown as Storage;
		expect(loadProgress('k', TRIVIA_LEGACY)).toEqual({ '1-1': 3, '4-2': 2, '2-3': 1 });
		expect(JSON.parse(store.k)).toEqual({ '1-1': 3, '4-2': 2, '2-3': 1 });
	});
	it('단계 끝에 새 문제가 붙어도 기존 판은 그대로다', () => {
		const base = Array.from({ length: 12 }, (_, i) => `b${i}`);
		const before = buildTierStages([1, 2], (t) => ({ base: t === 1 ? base : ['x1', 'x2', 'x3', 'x4', 'x5'], extra: [] }), 7);
		const after = buildTierStages([1, 2], (t) => ({ base: t === 1 ? base : ['x1', 'x2', 'x3', 'x4', 'x5'], extra: t === 1 ? ['n1', 'n2', 'n3'] : [] }), 7);
		expect(before.map((s) => s.key)).toEqual(['1-1', '1-2', '2-1']);
		expect(after.map((s) => s.key)).toEqual(['1-1', '1-2', '1-3', '2-1']);
		for (const s of before) expect(after.find((x) => x.key === s.key)!.ids).toEqual(s.ids);
	});
});
