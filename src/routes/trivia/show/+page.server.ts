import { TRIVIA } from '$lib/trivia';
import { TRIVIA_CATEGORIES } from '$lib/triviaCategories';

// 설정 화면과 진행 요령 글은 빌드에 고정된다. 문제는 「띄우기」를 누를 때 deck에서 받아 온다 —
// 상식 문제 파일(약 340KB)을 내려보내지 않고, 그날 출제 중인 문제를 그때그때 빼기 위해서다.
export const prerender = true;

const GRADES = ['초등', '중등', '고등', '어른'] as const;

export function load() {
	const choice = TRIVIA.filter((t) => t.type === 'choice');
	const cats = TRIVIA_CATEGORIES.map((c) => ({
		slug: c.slug,
		name: c.name,
		count: choice.filter((t) => t.category === c.name).length
	})).filter((c) => c.count >= 10);
	const grades = GRADES.map((g) => ({ name: g, count: choice.filter((t) => t.grade === g).length }));
	return { cats, grades, total: choice.length };
}
