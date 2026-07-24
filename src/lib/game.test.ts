import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	normalize,
	isCorrectText,
	buildRound,
	scoreFor,
	emojiFor,
	seededOrder,
	kstDayNumber,
	dailyIndices,
	buildSession,
	comboScore,
	hintUnlocked,
	editDistance,
	isCloseAnswer,
	wanderBonus,
	displayChoices,
	advanceStreakIfComplete
} from './game';
import { PROBLEMS, type Problem } from './problems';

describe('normalize', () => {
	it('공백과 기호를 제거하고 소문자화한다', () => {
		expect(normalize(' 5 7 4 5 ')).toBe('5745');
		expect(normalize('YAM')).toBe('yam');
		expect(normalize('19+72=91')).toBe('197291');
		expect(normalize('파랑 · 남색')).toBe('파랑남색');
	});

	it('알파벳 x는 정답 문자로 보존한다(곱셈 ×만 제거)', () => {
		expect(normalize('X')).toBe('x');
		expect(normalize('3×4')).toBe('34');
		expect(normalize('six')).toBe('six');
	});
});

describe('isCorrectText', () => {
	const holiday = PROBLEMS.find((p) => p.id === 'holiday')!;
	it('정답을 인정한다', () => {
		expect(isCorrectText(holiday, '815')).toBe(true);
		expect(isCorrectText(holiday, ' 8 1 5 ')).toBe(true);
	});
	it('오답과 빈 입력을 거부한다', () => {
		expect(isCorrectText(holiday, '814')).toBe(false);
		expect(isCorrectText(holiday, '   ')).toBe(false);
	});
});

describe('buildRound', () => {
	it('안 푼 문제만 뽑는다', () => {
		const { round, poolReset } = buildRound(PROBLEMS, [PROBLEMS[0].id]);
		expect(poolReset).toBe(false);
		expect(round.length).toBe(3);
		expect(round.map((p) => p.id)).not.toContain(PROBLEMS[0].id);
	});
	it('전부 풀었으면 풀을 재시작한다', () => {
		const all = PROBLEMS.map((p) => p.id);
		const { round, poolReset } = buildRound(PROBLEMS, all);
		expect(poolReset).toBe(true);
		expect(round.length).toBe(3);
	});
	it('남은 문제가 3개 미만이면 남은 만큼만 낸다', () => {
		const solved = PROBLEMS.slice(0, PROBLEMS.length - 1).map((p) => p.id);
		const { round } = buildRound(PROBLEMS, solved);
		expect(round.length).toBe(1);
	});
});

describe('scoreFor / emojiFor', () => {
	it('힌트 수에 따라 점수가 줄어든다', () => {
		expect(scoreFor(true, 0)).toBe(100);
		expect(scoreFor(true, 1)).toBe(80);
		expect(scoreFor(true, 2)).toBe(50);
		expect(scoreFor(true, 3)).toBe(20);
		expect(scoreFor(false, 0)).toBe(0);
	});
	it('이모지: 노힌트 ✅, 힌트 💡, 공개 🔓', () => {
		expect(emojiFor(true, 0)).toBe('✅');
		expect(emojiFor(true, 2)).toBe('💡');
		expect(emojiFor(false, 0)).toBe('🔓');
	});
});

describe('데일리 출제', () => {
	it('seededOrder는 결정적이고 0~n-1 순열이다', () => {
		const a = seededOrder(100);
		const b = seededOrder(100);
		expect(a).toEqual(b); // 매번 동일
		expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 100 }, (_, i) => i));
	});

	it('kstDayNumber는 KST 자정마다 1씩 증가', () => {
		// 2026-01-01 00:00 KST = 2025-12-31 15:00 UTC
		const kstMidnight = Date.UTC(2025, 11, 31, 15, 0, 0);
		const d0 = kstDayNumber(kstMidnight);
		const d1 = kstDayNumber(kstMidnight + 86400000);
		expect(d1).toBe(d0 + 1);
		// 자정 직전(1초 전)은 아직 전날
		expect(kstDayNumber(kstMidnight - 1000)).toBe(d0 - 1);
	});

	it('dailyIndices: 같은 날은 같은 3문제, 하루 안에 중복 없음', () => {
		const day = 500;
		const a = dailyIndices(100, day);
		const b = dailyIndices(100, day);
		expect(a).toEqual(b);
		expect(a.length).toBe(3);
		expect(new Set(a).size).toBe(3); // 중복 없음
		// 다음 날은 다른 세트
		expect(dailyIndices(100, day + 1)).not.toEqual(a);
	});
});

describe('연속 모드', () => {
	it('buildSession: 중복 없이 size개, 풀보다 크면 전체', () => {
		const pool = Array.from({ length: 50 }, (_, i) => i);
		const s = buildSession(pool, 10);
		expect(s.length).toBe(10);
		expect(new Set(s).size).toBe(10);
		expect(buildSession(pool, 999).length).toBe(50);
	});
	it('comboScore: 콤보마다 배율 증가, 최대 2배', () => {
		expect(comboScore(100, 0)).toBe(100);
		expect(comboScore(100, 5)).toBe(150);
		expect(comboScore(100, 100)).toBe(200); // 상한
	});
});

describe('힌트 게이팅 · 근접 피드백', () => {
	it('힌트1은 항상 열림, 힌트2는 25초 또는 오답1회, 힌트3은 60초 또는 오답2회', () => {
		expect(hintUnlocked(0, 0, 0)).toBe(true);
		expect(hintUnlocked(1, 0, 0)).toBe(false);
		expect(hintUnlocked(1, 25000, 0)).toBe(true);
		expect(hintUnlocked(1, 0, 1)).toBe(true);
		expect(hintUnlocked(2, 25000, 1)).toBe(false);
		expect(hintUnlocked(2, 60000, 0)).toBe(true);
		expect(hintUnlocked(2, 0, 2)).toBe(true);
	});
	it('오답 3회면 모든 단계 무료 해금', () => {
		expect(hintUnlocked(2, 0, 3)).toBe(true);
	});
	it('editDistance', () => {
		expect(editDistance('안중근', '안중근')).toBe(0);
		expect(editDistance('안중근', '안중군')).toBe(1);
		expect(editDistance('abc', 'axc')).toBe(1);
	});
	it('isCloseAnswer: 한 글자 차이·숫자 근접은 "거의"로 인정', () => {
		const p = { id: 'x', chip: '', blocks: [], type: 'text', answers: ['안중근'], explain: '' } as never;
		expect(isCloseAnswer(p, '안중군')).toBe(true);
		expect(isCloseAnswer(p, '김구')).toBe(false);
		const n = { id: 'y', chip: '', blocks: [], type: 'text', answers: ['100'], explain: '' } as never;
		expect(isCloseAnswer(n, '105')).toBe(true);
		expect(isCloseAnswer(n, '500')).toBe(false);
	});
	it('wanderBonus: 힌트 없이 헤맨 뒤 정답이면 +10', () => {
		expect(wanderBonus(0, 0)).toBe(0);
		expect(wanderBonus(0, 2)).toBe(10);
		expect(wanderBonus(1, 2)).toBe(0);
	});
});

describe('신규 배치 정답 판정', () => {
	const byId = (id: string) => PROBLEMS.find((p) => p.id === id)!;

	it('복수 정답 클럽: 순서·구분자가 달라도 인정', () => {
		const c = byId('club-double-letter');
		expect(isCorrectText(c, 'ELEVEN FIFTEEN')).toBe(true);
		expect(isCorrectText(c, 'fifteen, eleven')).toBe(true);
		expect(isCorrectText(c, 'ELEVEN')).toBe(false); // 하나만 쓰면 오답
	});

	it('대소문자 쌍둥이: ZV / V, Z 모두 인정', () => {
		const c = byId('club-case-twin');
		expect(isCorrectText(c, 'ZV')).toBe(true);
		expect(isCorrectText(c, 'V, Z')).toBe(true);
		expect(isCorrectText(c, 'Z')).toBe(false);
	});

	it('시각 표기: 15:45 / 1545 모두 인정', () => {
		const c = byId('subway-board');
		expect(isCorrectText(c, '15:45')).toBe(true);
		expect(isCorrectText(c, '1545')).toBe(true);
		expect(isCorrectText(c, '15시 45분')).toBe(true);
	});

	it('신규 4문제 모두 힌트 3단과 정답을 갖는다', () => {
		const added = ['subway-board', 'fold-sum', 'club-double-letter', 'club-case-twin'];
		for (const id of added) {
			const p = byId(id);
			expect(p.hints?.length, id).toBe(3);
			expect(p.answers?.length, id).toBeGreaterThan(0);
			expect(isCorrectText(p, p.answers![0]), id).toBe(true);
		}
	});
});

describe('isCorrectText 음수 정답 가드', () => {
	// normalize가 '-'를 지우므로 정답이 음수인데 부호 없이 입력하면 오답이어야 한다(jungle=-1).
	const neg = { id: 'neg', chip: '', blocks: [], type: 'text', answers: ['-1'], explain: '' } as Problem;
	it("부호 없는 '1'은 오답", () => {
		expect(isCorrectText(neg, '1')).toBe(false);
	});
	it("'-1'은 정답", () => {
		expect(isCorrectText(neg, '-1')).toBe(true);
		expect(isCorrectText(neg, ' -1 ')).toBe(true);
	});
});

describe('displayChoices (객관식 보기 셔플)', () => {
	const q = {
		id: 'shuf-q',
		chip: '',
		blocks: [],
		type: 'choice',
		choices: ['정답', 'B', 'C', 'D'],
		answerIndex: 0,
		explain: ''
	} as Problem;

	it('셔플 후에도 answerIndex가 원래 정답 텍스트를 가리킨다', () => {
		const d = displayChoices(q);
		expect(d.choices![d.answerIndex!]).toBe('정답');
	});
	it('같은 id는 항상 같은 순서 — 전 방문자 동일', () => {
		expect(displayChoices(q).choices).toEqual(displayChoices(q).choices);
	});
	it('편향 제거: 여러 문제에서 정답이 항상 0번에 몰리지 않는다', () => {
		const positions = new Set<number>();
		for (let i = 0; i < 12; i++) {
			const p = { ...q, id: `shuf-${i}` } as Problem;
			positions.add(displayChoices(p).answerIndex!);
		}
		expect(positions.size).toBeGreaterThan(1);
	});
	it('text형은 손대지 않고 그대로 반환한다', () => {
		const t = { id: 't', chip: '', blocks: [], type: 'text', answers: ['x'], explain: '' } as Problem;
		expect(displayChoices(t)).toBe(t);
	});
});

describe('advanceStreakIfComplete (연속 기록)', () => {
	function mockLS() {
		const store = new Map<string, string>();
		return {
			getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
			setItem: (k: string, v: string) => void store.set(k, String(v)),
			removeItem: (k: string) => void store.delete(k),
			clear: () => store.clear(),
			key: () => null,
			length: 0
		};
	}
	beforeEach(() => vi.stubGlobal('localStorage', mockLS()));
	afterEach(() => vi.unstubAllGlobals());

	function finishAll(day: number) {
		for (const k of ['discover', 'trivia', 'match'])
			localStorage.setItem(`ddal.daily.${day}.${k}`, JSON.stringify({ phase: 'done' }));
	}

	it('3트랙 모두 done이면 streak가 1로 시작한다', () => {
		finishAll(100);
		expect(advanceStreakIfComplete(100)?.dayStreak).toBe(1);
	});
	it('한 트랙이라도 안 끝나면 갱신하지 않는다', () => {
		localStorage.setItem('ddal.daily.100.discover', JSON.stringify({ phase: 'done' }));
		expect(advanceStreakIfComplete(100)).toBeNull();
	});
	it('오늘 이미 갱신했으면 중복 증가하지 않는다', () => {
		finishAll(100);
		advanceStreakIfComplete(100);
		expect(advanceStreakIfComplete(100)).toBeNull();
	});
	it('연속된 다음 날이면 +1, 하루라도 건너뛰면 1로 리셋', () => {
		finishAll(100);
		advanceStreakIfComplete(100);
		finishAll(101);
		expect(advanceStreakIfComplete(101)?.dayStreak).toBe(2);
		finishAll(105);
		expect(advanceStreakIfComplete(105)?.dayStreak).toBe(1);
	});
});
