import { error } from '@sveltejs/kit';
import { PROBLEMS } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import matchData from '$lib/data/matchstick-problems.json';
import { kstDayNumber, dailyIndices, dayLabel } from '$lib/game';
import type { PageLoad } from './$types';

// 요청 시점에 '오늘'을 계산한다. prerender 하면 빌드 시점 기준으로 고정돼 날짜가 넘어가도
// 새 날짜 페이지가 생기지 않고(진짜 404), 스포일러 가드도 갱신되지 않는다.
export const prerender = false;

export const load: PageLoad = ({ params }) => {
	const day = Number(params.day);
	const today = kstDayNumber(Date.now());
	// 미래·오늘은 answers를 품고 있어 넘기지 않는다. 아카이브 창 밖도 막는다.
	if (!Number.isInteger(day) || day >= today || day < today - 400) throw error(404, 'Not found');

	const discover = dailyIndices(PROBLEMS.length, day, 3).map((i) => PROBLEMS[i]);
	const trivia = dailyIndices(TRIVIA.length, day, 5).map((i) => TRIVIA[i]);
	const matchIdx = dailyIndices(matchData.length, day, 3);
	const match = matchIdx.map((i) => matchData[i]);

	return { day, label: dayLabel(day), discover, trivia, match };
};
