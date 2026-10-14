import { TRIVIA } from '$lib/trivia';
import { pickDuel, parseSeed, parseVs } from '$lib/duel';

// 링크의 씨앗(?s=)마다 다른 10문제다 — 미리 그려 둘 수 없다. 상식 문제 파일(약 300KB)은 서버에만 두고
// 고른 10문제만 내린다(duel.ts).
export const prerender = false;

export function load({ url }) {
	const fromLink = parseSeed(url.searchParams.get('s'));
	const seed = fromLink ?? 1 + Math.floor(Math.random() * 999_999_999);
	const vs = fromLink ? parseVs(url.searchParams.get('n'), url.searchParams.get('t')) : null;
	const questions = pickDuel(TRIVIA, seed).map((p) => ({
		id: p.id,
		category: p.category ?? '',
		grade: p.grade ?? '',
		html: p.blocks.find((b) => b.kind === 'text')?.html ?? '',
		choices: p.choices ?? [],
		answerIndex: p.answerIndex ?? 0,
		explain: p.explain
	}));
	return { seed, vs, questions };
}
