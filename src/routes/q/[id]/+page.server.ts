import { error } from '@sveltejs/kit';
import { PROBLEMS } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import { parseMark, previewOf } from '$lib/sendProblem';

/**
 * 친구가 보낸 문제 하나(sendProblem.ts). 받은 사람이 홈을 거치지 않고 그 문제로 바로 들어온다.
 *
 * 프리렌더하지 않는다 — 링크의 r(보낸 사람이 어떻게 풀었나)이 미리보기 제목에 들어가야
 * 카톡 미리보기가 「친구는 한 번에 맞혔어요」로 뜬다. 800쪽을 미리 구울 이유도 없다.
 * 색인도 막는다(hooks.server.ts) — 문제 한 개짜리 쪽 800개는 애드센스가 반려한
 * 「목록만 늘어놓은 쪽」과 같은 꼴이다(discover/[slug] 주석).
 */
export const prerender = false;

export function load({ params, url }) {
	const problem = PROBLEMS.find((p) => p.id === params.id) ?? TRIVIA.find((p) => p.id === params.id);
	if (!problem) error(404, '없는 문제예요');
	return {
		problem,
		friend: parseMark(url.searchParams.get('r')),
		preview: previewOf(problem)
	};
}
