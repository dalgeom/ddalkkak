import { error } from '@sveltejs/kit';
import { PROBLEMS } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import matchData from '$lib/data/matchstick-problems.json';
import { kstDayNumber, archiveDays, dailyIndices, dayLabel } from '$lib/game';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

/** 빌드 시점 기준 지난 30일만 정적 생성. 오늘·미래 날짜는 파일이 존재하지 않아 스포일러가 원천 차단된다. */
export const entries: EntryGenerator = () => {
	const today = kstDayNumber(Date.now());
	return archiveDays(today).map((d) => ({ day: String(d) }));
};

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
