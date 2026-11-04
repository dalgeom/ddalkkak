import { json } from '@sveltejs/kit';
import { TRIVIA } from '$lib/trivia';
import { categoryBySlug } from '$lib/triviaCategories';
import { assembleDayQueue } from '$lib/dayview';
import { displayChoices, kstDayNumber } from '$lib/game';
import type { RequestHandler } from './$types';

/**
 * 상식 퀴즈 띄우기(/trivia/show)의 문제 묶음 — 분야 · 난이도 · 문제 수를 받아 객관식만 섞어 내린다.
 * 오늘과 내일의 10문제에 든 상식은 뺀다 — 교실에서 먼저 보면 그날 혼자 푸는 재미가 샌다.
 */
export const prerender = false;

const GRADES = ['초등', '중등', '고등', '어른'];
const SIZES = [10, 20, 30];

export const GET: RequestHandler = ({ url, setHeaders }) => {
	const c = url.searchParams.get('c') ?? 'all';
	const g = url.searchParams.get('g') ?? 'all';
	const n = Number(url.searchParams.get('n'));
	const size = SIZES.includes(n) ? n : 10;
	const catName = c === 'all' ? null : (categoryBySlug(c)?.name ?? null);
	const grade = GRADES.includes(g) ? g : null;

	const day = kstDayNumber(Date.now());
	const busy = new Set(
		[day, day + 1].flatMap((d) => assembleDayQueue(d).filter((q) => q.kind === 'trivia').map((q) => q.problem?.id))
	);
	let pool = TRIVIA.filter((t) => t.type === 'choice' && !busy.has(t.id) && (!catName || t.category === catName));
	const graded = grade ? pool.filter((t) => t.grade === grade) : pool;
	if (graded.length >= Math.min(size, 10)) pool = graded;

	const shuffled = [...pool];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	// 뽑은 것 안에서는 쉬운 난이도부터 — 첫 문제에서 교실이 얼어붙지 않게
	const deck = shuffled
		.slice(0, size)
		.sort((a, b) => GRADES.indexOf(a.grade ?? '') - GRADES.indexOf(b.grade ?? ''))
		.map((raw) => {
			const t = displayChoices(raw);
			return {
				id: t.id,
				category: t.category ?? '',
				grade: t.grade ?? '',
				html: t.blocks.find((b) => b.kind === 'text')?.html ?? '',
				choices: t.choices ?? [],
				answerIndex: t.answerIndex ?? 0,
				explain: t.explain ?? ''
			};
		});
	setHeaders({ 'cache-control': 'no-store' });
	return json(deck);
};
