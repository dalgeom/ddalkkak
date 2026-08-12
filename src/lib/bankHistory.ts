/**
 * 날짜별 문제은행 크기 — 그날의 세트는 그날 자정 시점의 은행으로 계산한다.
 *
 * 왜 있나: buildDailySet의 순열은 은행 크기(n)로 섞인다. 문제를 추가해 은행이
 * 자라면 순열이 통째로 재편되어 "오늘의 문제"가 낮에 바뀌고, 지난 아카이브도
 * 소급 재편된다. 8/11 GN 피드백(아침에 푼 1번 문제가 오후에 사라짐)으로
 * 발각됐다. 각 날을 그날의 크기로 고정하면 언제 계산해도 같은 세트가 나온다.
 *
 * 규칙:
 *   - 새 문제는 반드시 배열 끝에 붙인다(프리픽스 슬라이스의 전제).
 *   - 문제를 추가하는 PR은 { fromDay: 내일, ... } 엔트리를 여기 함께 추가한다.
 *     bankHistory.test.ts가 마지막 엔트리와 실제 배열 길이의 일치를 강제한다.
 *   - 삭제는 금지다. 빼야 하면 문제를 교체(내용 수정)로 처리한다 — 길이가
 *     줄면 과거 날짜의 프리픽스가 어긋난다.
 *
 * 값의 출처: scripts/bank-history.mjs가 git 이력에서 복원했다. 8/4 이후는
 * 순수 append-only라 정확하고, 그 전(삭제 2건이 있던 7월)은 재현이 불가능해
 * 7/30 정리 직후 값으로 접었다 — 그 시기 방문자는 사실상 0명이었다.
 * 복원의 검증: 20676(8/11)을 20676 시점 크기로 계산하면 그날 아침 GN
 * 댓글러가 본 문제(sh-sym-vertical)가 정확히 나온다.
 */
import { SITE_START_DAY } from './game';

export type BankSizes = { discover: number; trivia: number };

const BANK_HISTORY: ({ fromDay: number } & BankSizes)[] = [
	{ fromDay: SITE_START_DAY, discover: 200, trivia: 405 }, // 7월 상태로 접음
	{ fromDay: 20670, discover: 303, trivia: 405 }, // 8/4 배포분, 다음 날부터
	{ fromDay: 20671, discover: 306, trivia: 408 }, // 8/5
	{ fromDay: 20672, discover: 309, trivia: 411 }, // 8/6
	{ fromDay: 20673, discover: 312, trivia: 414 }, // 8/7
	{ fromDay: 20676, discover: 315, trivia: 417 }, // 8/10
	{ fromDay: 20677, discover: 318, trivia: 420 }, // 8/11
	{ fromDay: 20678, discover: 321, trivia: 423 } // 8/12 배포분, 8/13부터 출제
];

/** day의 세트를 계산할 때 쓸 은행 크기 — fromDay가 day 이하인 마지막 엔트리 */
export function bankSizesAt(day: number): BankSizes {
	let cur = BANK_HISTORY[0];
	for (const h of BANK_HISTORY) {
		if (h.fromDay > day) break;
		cur = h;
	}
	return { discover: cur.discover, trivia: cur.trivia };
}

/** 테스트가 마지막 엔트리를 실제 배열 길이와 대조할 때 쓴다 */
export const BANK_HISTORY_LAST = BANK_HISTORY[BANK_HISTORY.length - 1];
export const BANK_HISTORY_ALL: readonly ({ fromDay: number } & BankSizes)[] = BANK_HISTORY;
