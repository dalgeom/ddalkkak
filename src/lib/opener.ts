import type { Problem } from './problems';
import { OPENER_SCORES } from './openerScores';

/**
 * 문지기 — 그날 **1번 자리**에 세울 수 있는 발견형인가.
 *
 * 왜 1번만 따로 보나. KV 집계(8/19~9/13)로 잰 깔때기가 이렇다.
 *
 *     시작 143 → 1번 제출 124 → 2번 107 → … → 완주 74
 *
 * 1번을 **한 번도 내보지 않고** 떠난 사람이 19명, 1번만 내고 떠난 사람이 17명이다.
 * 시작한 사람의 25%가 첫 문제에서 빠진다. 9/14에 새로 붙인 이탈 계측도 이틀 내내
 * 떠난 자리가 1번뿐이었다(9/14 처음 봄 4명 · 9/15 처음 봄 2명 · 막힘 1명).
 *
 * 무엇이 1번에 오고 있었나 — 앞뒤 한 달의 1번을 뽑아 보니 절반이 **예시 한 줄 없는
 * 산문 문제**였다(배와 사다리 · 아버지와 아들 · 칠한 큐브 · 말 수수께끼).
 * 은행 357개 중 123개(34%)가 산문만으로 된 문제라 그럴 수밖에 없다.
 * 규칙을 찾는 사이트인데 처음 온 사람의 첫 화면에 **찾을 예시가 없다.**
 *
 * 그래서 은행을 갈지 않고 **자리만 고른다.** 예시 줄이 눈에 보이는 문제를 1번에
 * 세우고 산문 문제는 같은 날 뒤로 민다 — 그날 나가는 열 문제 자체는 하나도 바뀌지
 * 않는다(game.ts의 OPENER_START_DAY 주석 참고). 초기 은행의 낡은 문제를 교체하지
 * 않기로 한 9/15 결정과도 어긋나지 않는다. 교체가 아니라 순서다.
 */

/** 예시가 이만큼은 있어야 규칙을 찾을 거리가 된다. 1~2줄은 패턴이 아니라 한 조각이다. */
const MIN_LINES = 3;
/** 이보다 길면 첫 화면이 표로 보인다 — 은행에서 9줄 이상은 한 문제뿐이라 잘리는 것도 거의 없다. */
const MAX_LINES = 8;
/** 지문이 이보다 길면 예시가 있어도 읽기부터 시작한다. 산문 함정 문제가 대개 70~100자다. */
const MAX_PROSE = 60;

/** 화면에 보이는 예시 줄 수와 설명 글자 수. 판정 근거를 눈으로 볼 수 있게 따로 뽑는다. */
export function openerMetrics(p: Problem): { lines: number; prose: number } {
	let lines = 0;
	let prose = 0;
	for (const b of p.blocks) {
		if (b.kind === 'pre') lines += b.text.split('\n').filter((l) => l.trim()).length;
		else if (b.kind === 'glyph' || b.kind === 'lcd') lines += b.lines.length;
		else if (b.kind === 'colors') lines += b.rows.length;
		else if (b.kind === 'text') prose += b.html.replace(/<[^>]*>/g, '').length;
		// figure(SVG)는 줄로 셀 수 없다 — 세지 않으면 예시 0줄이라 문지기에서 빠진다
	}
	return { lines, prose };
}

/**
 * 쉬운 문지기가 서는 날 — 2026-10-08(KST)부터. 오늘(20733) 세트는 건드리지 않는다.
 *
 * 왜: 모양만 보는 위 규칙은 난이도를 안 본다. 10/3의 1번 color-alpha(색 → 영어 이름
 * 알파벳 순 → 두 자리 덧셈)는 시작한 3명이 모두 1번을 보자마자 떠났고, 사이트가 열린
 * 뒤 답이 한 번도 안 들어온 문제였다. 9/14~10/6 데일리 이탈 82건 중 58건이 「아무것도
 * 안 해 보고」였고 그중 49건이 1번이었다.
 *
 * 이 날부터 day와 maxScore를 함께 받으면 OPENER_SCORES가 maxScore 이하인 문제만 문지기로
 * 본다. game.ts가 1점 → 2점 → 3점 → 4점 순으로 찾고, 없으면 day 없이 모양 규칙으로 한 번 더 찾는다.
 * 그래서 그날 세 문제 중 가장 쉬운 문지기가 1번에 선다.
 */
export const OPENER_EASY_START_DAY = 20734;

export function isOpener(p: Problem, day?: number, maxScore = 2): boolean {
	const { lines, prose } = openerMetrics(p);
	const shaped = lines >= MIN_LINES && lines <= MAX_LINES && prose <= MAX_PROSE;
	if (day === undefined || day < OPENER_EASY_START_DAY) return shaped;
	const score = OPENER_SCORES[p.id];
	return shaped && score !== undefined && score <= maxScore;
}
