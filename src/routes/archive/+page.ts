import { kstDayNumber, archiveDays, dayLabel } from '$lib/game';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
	// 빌드 시점의 '오늘'. 배포마다 갱신된다.
	const today = kstDayNumber(Date.now());
	const days = archiveDays(today).map((d) => ({ day: d, label: dayLabel(d) }));
	return { days };
};
