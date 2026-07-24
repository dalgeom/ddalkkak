import { PROBLEMS } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import { MATCH_TOTAL } from '$lib/game';

// 문제 총 개수는 서버/빌드 시점에만 계산한다. 이렇게 하면 PROBLEMS·TRIVIA 원본 배열이
// 클라이언트 번들에 실리지 않아, 푸터 숫자 하나 때문에 모든 페이지가 ~96KB(gzip)를
// 내려받던 문제가 사라진다.
export function load() {
	return { totalProblems: PROBLEMS.length + TRIVIA.length + MATCH_TOTAL };
}
