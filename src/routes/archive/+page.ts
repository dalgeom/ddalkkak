import { kstDayNumber, archiveDays, dayLabel } from '$lib/game';
import type { PageLoad } from './$types';

// 요청 시점에 '오늘'을 계산해 매일 재배포 없이도 목록이 갱신되게 한다(prerender 시 빌드 날짜에 고정됨).
export const prerender = false;

export const load: PageLoad = () => {
	const today = kstDayNumber(Date.now());
	const days = archiveDays(today).map((d) => ({ day: d, label: dayLabel(d) }));
	return { days };
};
