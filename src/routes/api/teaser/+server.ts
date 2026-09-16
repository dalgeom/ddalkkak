import { json } from '@sveltejs/kit';
import { assembleDayQueue } from '$lib/dayview';
import { kstDayNumber } from '$lib/game';
import { teaserOf } from '$lib/teaser';
import type { RequestHandler } from './$types';

/**
 * 오늘 1번 문제의 **예시 한 줄**만 내려준다 — 콘텐츠 페이지의 데일리 띠가 쓴다.
 *
 * 왜 따로 파나. 띠가 붙는 /matchstick·/cubenet은 프리렌더라 빌드 때 오늘을 모른다.
 * `/api/day/<날짜>`를 쓰려면 클라이언트가 날짜를 계산해야 하고 그러자고 game.ts를
 * 콘텐츠 페이지 번들에 끌어들이게 된다. 여기서 {chip, line} 두 글자만 내리면 끝난다.
 *
 * 왜 1번인가 — 띠를 누른 사람이 홈에서 곧장 시작하면(markGoDaily) 처음 만나는 문제가
 * 그 문제다. 예고와 실물이 어긋나지 않는다. 물음표가 든 줄은 teaserOf가 빼므로
 * 문제 자체가 새지는 않는다.
 */
export const prerender = false;

export const GET: RequestHandler = ({ setHeaders }) => {
	const day = kstDayNumber(Date.now());
	const first = assembleDayQueue(day)[0];
	// 같은 날이면 같은 답이다. 자정에 바뀌는 것보다 짧게 잡는다(/api/day와 같은 기준).
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return json(first?.problem ? teaserOf(first.problem) : { chip: '', line: null });
};
