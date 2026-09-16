import { describe, it, expect } from 'vitest';
import { isOpener, openerMetrics } from './opener';
import { PROBLEMS } from './problems';
import { buildDailySetStable, MATCH_TOTAL, OPENER_START_DAY, PICK_V2_START_DAY } from './game';
import { fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import { bankSizesAt } from './bankHistory';
import { teaserOf } from './teaser';
import type { Problem } from './problems';

const mk = (blocks: Problem['blocks']): Problem => ({
	id: 'x',
	chip: '시험',
	blocks,
	type: 'text',
	answers: ['1'],
	hints: ['a', 'b', 'c'],
	explain: ''
});

const pre = (n: number) => ({ kind: 'pre' as const, text: Array.from({ length: n }, (_, i) => `${i} → ${i}`).join('\n') });
const text = (n: number) => ({ kind: 'text' as const, html: '가'.repeat(n) });

describe('문지기 판정', () => {
	it('예시 줄이 없는 산문 문제는 1번에 못 선다', () => {
		expect(isOpener(mk([text(80)]))).toBe(false);
	});

	it('짧은 지문 + 예시 네 줄이면 선다', () => {
		expect(isOpener(mk([text(12), pre(4)]))).toBe(true);
	});

	it('예시가 한두 줄이면 패턴이 아니다', () => {
		expect(isOpener(mk([pre(2)]))).toBe(false);
		expect(isOpener(mk([pre(3)]))).toBe(true);
	});

	it('예시가 너무 많으면 표가 된다', () => {
		expect(isOpener(mk([pre(8)]))).toBe(true);
		expect(isOpener(mk([pre(9)]))).toBe(false);
	});

	it('예시가 있어도 지문이 길면 읽기부터 시작한다', () => {
		expect(isOpener(mk([text(60), pre(4)]))).toBe(true);
		expect(isOpener(mk([text(61), pre(4)]))).toBe(false);
	});

	it('빈 줄은 예시로 세지 않는다 — 문단을 나눈 pre가 부풀지 않게', () => {
		expect(openerMetrics(mk([{ kind: 'pre', text: '1 → 2\n\n3 → 4' }])).lines).toBe(2);
	});

	it('glyph·lcd·colors도 예시 줄로 센다', () => {
		expect(isOpener(mk([{ kind: 'glyph', lines: ['V = 1', 'A = 0', 'H = ?'] }]))).toBe(true);
		expect(isOpener(mk([{ kind: 'lcd', lines: ['12', '34', '56'] }]))).toBe(true);
		expect(isOpener(mk([{ kind: 'colors', rows: ['RGB', 'GBR', 'BRG'] }]))).toBe(true);
	});

	/**
	 * 양성 대조 — 판정기가 합성 데이터만 보고 통과하는 게 아니라 진짜 은행을 읽는지 본다.
	 * 이 프로젝트는 "검사기가 빈손으로 통과"에 세 번 데였다(CLAUDE.md).
	 */
	it('실제 은행에서 산문 문제와 예시 문제를 갈라낸다', () => {
		const byId = (id: string) => PROBLEMS.find((p) => p.id === id);
		const 산문 = byId('sh-painted-cube'); // 칠한 큐브 — 지문만 84자
		const 예시 = byId('num-hidden-fraction'); // 12 + 13 = 56 … 다섯 줄
		expect(산문, 'sh-painted-cube가 은행에 없다 — 테스트가 헛돌고 있다').toBeTruthy();
		expect(예시, 'num-hidden-fraction이 은행에 없다 — 테스트가 헛돌고 있다').toBeTruthy();
		expect(isOpener(산문!)).toBe(false);
		expect(isOpener(예시!)).toBe(true);

		// 후보가 말라 1번이 늘 같은 문제가 되는 일이 없어야 한다
		const pool = PROBLEMS.filter(isOpener).length;
		expect(pool).toBeGreaterThan(100);
	});
});

describe('1번 자리는 예시가 보이는 문제로 연다', () => {
	const args = [
		PROBLEMS,
		TRIVIA,
		MATCH_TOTAL
	] as const;
	const set = (day: number) =>
		buildDailySetStable(
			...args,
			day,
			(x) => fieldOfChip(x.chip),
			(x) => x.category ?? '기타',
			bankSizesAt,
			isOpener
		);

	it('시작일부터 60일간, 후보가 있는 날은 1번이 문지기다', () => {
		const 실패: string[] = [];
		let 후보없는날 = 0;
		for (let day = OPENER_START_DAY; day < OPENER_START_DAY + 60; day++) {
			const picks = set(day);
			const disc = picks.filter((p) => p.kind === 'discover' && !p.bonus).map((p) => PROBLEMS[p.index]);
			if (!disc.some(isOpener)) {
				후보없는날++;
				continue;
			}
			expect(picks[0].kind, `day ${day} 1번이 발견형이 아니다`).toBe('discover');
			if (!isOpener(PROBLEMS[picks[0].index])) 실패.push(`${day}: ${PROBLEMS[picks[0].index].id}`);
		}
		expect(실패, 실패.join(', ')).toEqual([]);
		// 셋 다 산문인 날은 드물어야 한다 — 흔해지면 은행 쪽 문제다
		expect(후보없는날).toBeLessThan(6);
	});

	/**
	 * 콘텐츠 페이지의 데일리 띠(/api/teaser)가 1번 문제의 예시 한 줄을 그대로 쓴다.
	 * 1번이 산문이면 띠는 예전 문구로 되돌아가니, 문지기가 서면 예고도 같이 살아야 한다.
	 */
	it('1번 문제에서 예고 한 줄이 거의 매일 나온다', () => {
		let 있음 = 0;
		for (let day = OPENER_START_DAY; day < OPENER_START_DAY + 30; day++) {
			if (teaserOf(PROBLEMS[set(day)[0].index]).line) 있음++;
		}
		expect(있음).toBeGreaterThanOrEqual(27);
	});

	it('그날 나가는 문제 자체는 하나도 바뀌지 않는다 — 순서만 돈다', () => {
		for (let day = OPENER_START_DAY; day < OPENER_START_DAY + 30; day++) {
			const withOpener = set(day);
			const without = buildDailySetStable(
				...args,
				day,
				(x) => fieldOfChip(x.chip),
				(x) => x.category ?? '기타',
				bankSizesAt,
				() => false
			);
			const key = (ps: typeof withOpener) =>
				ps.map((p) => `${p.kind}-${p.index}-${p.bonus ? 'b' : ''}`).sort().join('|');
			expect(key(withOpener), `day ${day}`).toBe(key(without));
		}
	});

	it('시작일 전날까지는 순서도 그대로다 — 아카이브 불변', () => {
		for (let day = PICK_V2_START_DAY; day < OPENER_START_DAY; day++) {
			const now = set(day);
			const old = buildDailySetStable(
				...args,
				day,
				(x) => fieldOfChip(x.chip),
				(x) => x.category ?? '기타',
				bankSizesAt,
				() => false
			);
			expect(now, `day ${day}`).toEqual(old);
		}
	});
});
