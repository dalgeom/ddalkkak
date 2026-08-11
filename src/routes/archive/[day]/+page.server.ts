import { error } from '@sveltejs/kit';
import { kstDayNumber, dayLabel, SITE_START_DAY } from '$lib/game';
import { assembleDayView } from '$lib/dayview';
import type { PageServerLoad } from './$types';

// 요청 시점의 오늘 날짜로 스포일러 가드를 쳐야 하므로 프리렌더하지 않는다.
// 새 날짜 페이지가 생기지 않고(진짜 404), 스포일러 가드도 갱신되지 않는다.
export const prerender = false;

export const load: PageServerLoad = ({ params }) => {
	const day = Number(params.day);
	const today = kstDayNumber(Date.now());
	// 미래·오늘은 answers를 품고 있어 넘기지 않는다. 아카이브 창 밖도 막는다.
	// 사이트 개설 전 날짜도 404 — 계산은 되지만 실제로 아무도 그날 풀지 않았다.
	// 오늘 것은 /today가 클라이언트에서만(완주자 한정) 조립한다.
	if (!Number.isInteger(day) || day >= today || day < today - 400 || day < SITE_START_DAY)
		throw error(404, 'Not found');

	return { day, label: dayLabel(day), ...assembleDayView(day) };
};
