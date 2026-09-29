import { PROBLEMS } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import { MATCH_TOTAL, CUBE_TOTAL } from '$lib/game';
import { CHOSUNG_CATEGORIES } from '$lib/data/chosung';

// 문제 총 개수는 서버/빌드 시점에만 계산한다. 이렇게 하면 PROBLEMS·TRIVIA 원본 배열이
// 클라이언트 번들에 실리지 않아, 푸터 숫자 하나 때문에 모든 페이지가 ~96KB(gzip)를
// 내려받던 문제가 사라진다.
export function load() {
	// 초성 퀴즈는 매일 10문제에 안 나오는 별도 놀이지만 준비한 문제이긴 하다(9/29 추가)
	const chosung = CHOSUNG_CATEGORIES.reduce((n, c) => n + c.words.length, 0);
	return {
		totalProblems: PROBLEMS.length + TRIVIA.length + MATCH_TOTAL + CUBE_TOTAL + chosung,
		counts: { discover: PROBLEMS.length, trivia: TRIVIA.length, match: MATCH_TOTAL, cube: CUBE_TOTAL, chosung }
	};
}
