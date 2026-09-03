import { json, error } from '@sveltejs/kit';
import { assembleDayQueue } from '$lib/dayview';
import { kstDayNumber, SITE_START_DAY } from '$lib/game';
import type { RequestHandler } from './$types';

/**
 * 그날의 10문제만 내려준다.
 *
 * 홈이 이걸 쓴다. 예전에는 10문제를 위해 문제은행 전체를 동적 import 했고 gz로만
 * 174KB였다(PROBLEMS 92 + TRIVIA 78 + 성냥/전개도 4). 이 응답은 gz 1.9KB다.
 *
 * 프리렌더하지 않는다 — 오늘이 매일 바뀌는데 배포는 매일 있지 않다. 배포가 사흘
 * 없으면 프리렌더된 오늘치가 없다.
 *
 * 답을 함께 내려주는 것은 예전과 같다. 채점이 클라이언트에서 일어나므로 은행을
 * 통째로 받던 시절에도 답은 이미 브라우저에 있었다. 새로 새는 것은 없다.
 */
export const prerender = false;

export const GET: RequestHandler = ({ params, setHeaders }) => {
	const day = Number(params.day);
	const today = kstDayNumber(Date.now());

	// 오늘과 어제만. 자정 경계에서 클라이언트 시계와 하루 어긋날 수 있어 여유를 둔다.
	// 지난 날짜는 /archive/<날짜>가 스포일러 가드를 걸어 맡는다.
	if (!Number.isInteger(day) || day > today || day < today - 1 || day < SITE_START_DAY)
		error(404, 'Not found');

	// 같은 날짜는 같은 답이라 잠깐 캐시해도 된다. 자정에 바뀌는 것보다 짧게 잡는다.
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return json(assembleDayQueue(day));
};
