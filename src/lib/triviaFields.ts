/**
 * 상식 분야 슬러그 → 이름(trivia.ts의 category). 무한 연습 `/play?filter=trivia&field=flag`가 쓴다.
 *
 * triviaCategories.ts는 분야 글(intro · deepDive)이 통째로 들어 있어 /play 번들에 싣기엔 무겁다.
 * 짝만 따로 둔다 — 순서·짝이 어긋나면 triviaFields.test.ts가 잡는다.
 * 11/11 사용자: 「국기 분야를 눌러도 해설만 나오고 그 분야만 푸는 모드가 없다」.
 */
export const TRIVIA_FIELDS: [slug: string, name: string][] = [
	['korean-history', '한국사'],
	['geography', '지리'],
	['general', '상식'],
	['art', '예술'],
	['world-history', '세계사'],
	['science', '과학'],
	['idiom', '사자성어'],
	['literature', '문학'],
	['figures', '위인'],
	['proverb', '속담'],
	['spelling', '맞춤법'],
	['sports', '스포츠'],
	['animal', '동물'],
	['game', '게임'],
	['food', '음식'],
	['music', '음악'],
	['origin', '유래'],
	['space', '우주'],
	['movie-drama', '영화드라마'],
	['capital', '수도'],
	['flag', '국기']
];

export function fieldName(slug: string | null): string | null {
	return TRIVIA_FIELDS.find(([s]) => s === slug)?.[1] ?? null;
}
