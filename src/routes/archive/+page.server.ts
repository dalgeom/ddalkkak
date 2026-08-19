import { kstDayNumber, archiveDays, dayLabel, buildDailySetStable, MATCH_TOTAL } from '$lib/game';
import { PROBLEMS, fieldOfChip } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import { bankSizesAt } from '$lib/bankHistory';
import type { PageServerLoad } from './$types';

// 요청 시점에 '오늘'을 계산해 매일 재배포 없이도 목록이 갱신되게 한다(prerender 시 빌드 날짜에 고정됨).
export const prerender = false;

/**
 * 날짜마다 그날 발견형의 chip을 붙인다.
 *
 * 목록이 서른 줄 내내 "매일 10문제 · 보너스 1"로 똑같아서, 아직 기록이 없는
 * 사람에게는 어느 날을 눌러야 할 이유가 하나도 없었다. 답이 아니라 '결'만 흘린다.
 *
 * 서버에서만 계산한다 — 클라이언트로 내리면 문제은행(약 96KB gzip)이 목록 화면까지 따라온다.
 */
export const load: PageServerLoad = () => {
	const today = kstDayNumber(Date.now());
	const days = archiveDays(today).map((d) => ({
		day: d,
		label: dayLabel(d),
		chips: buildDailySetStable(
			PROBLEMS,
			TRIVIA,
			MATCH_TOTAL,
			d,
			(x) => fieldOfChip(x.chip),
			(x) => x.category ?? '기타',
			bankSizesAt
		)
			.filter((p) => p.kind === 'discover')
			.map((p) => PROBLEMS[p.index].chip)
			.slice(0, 3)
	}));
	return { days };
};
