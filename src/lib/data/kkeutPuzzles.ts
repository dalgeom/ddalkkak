/**
 * 오늘의 끝말잇기(2026-11-03). 컴퓨터가 start를 내고, 사람이 N수 안에 컴퓨터를 막는다(N = puzzleMoves).
 * line = 정답 길 하나: 사람 · 컴퓨터 · 사람 … (마지막 사람 말 뒤에 컴퓨터가 이을 말이 없다). 해설 쪽이 이 길을 보여 준다.
 * 판정은 line과 대조하지 않는다 — 다른 길로 막아도 성공이다(kkeutGame.ts play).
 * 공개된 날은 고치지 않는다. 고르는 기준: 정답 말을 「아는 사람이 꽤 있을 말」, 3초 룰 · 지식 조회 아님.
 * 2수 이상은 `npx vite-node scripts/kkeut-build.mjs -- --check`를 통과한 것만 넣는다.
 */
export type KkeutPuzzle = { date: string; start: string; line: string[] };

/** 2026-11-05 */
export const KKEUT_FIRST_DAY = 20762;

export const KKEUT_PUZZLES: KkeutPuzzle[] = [
	{ date: '2026-11-05', start: '보름달', line: ['달걀'] },
	{ date: '2026-11-06', start: '노란색', line: ['색깔', '깔개', '개띠'] },
	{ date: '2026-11-07', start: '양옆', line: ['옆쪽', '쪽빛', '빛깔', '깔때기', '기쁨'] },
	{ date: '2026-11-08', start: '대답', line: ['답글', '글라이더', '더빙', '빙어', '어른'] },
	{ date: '2026-11-09', start: '첫눈', line: ['눈썹'] },
	{ date: '2026-11-10', start: '동네', line: ['네티즌'] },
	{ date: '2026-11-11', start: '샴푸', line: ['푸딩'] },
	{ date: '2026-11-12', start: '사과', line: ['과즙'] },
	{ date: '2026-11-13', start: '빵집', line: ['집값', '값어치', '치킨'] },
	{ date: '2026-11-14', start: '월급', line: ['급훈', '훈련', '연못', '못난이', '이름'] },
	{ date: '2026-11-15', start: '차례', line: ['예측', '측간', '간지럼', '넘버', '버튼'] },
	{ date: '2026-11-16', start: '벌꿀', line: ['꿀팁'] },
	{ date: '2026-11-17', start: '강북', line: ['북녘'] },
	{ date: '2026-11-18', start: '개밥', line: ['밥그릇'] },
];

export function puzzleFor(day: number): KkeutPuzzle | null {
	const i = day - KKEUT_FIRST_DAY;
	return i >= 0 ? (KKEUT_PUZZLES[i] ?? null) : null;
}
