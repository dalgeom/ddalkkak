import type { Problem } from './problems';

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

export function isOpener(p: Problem): boolean {
	const { lines, prose } = openerMetrics(p);
	return lines >= MIN_LINES && lines <= MAX_LINES && prose <= MAX_PROSE;
}
