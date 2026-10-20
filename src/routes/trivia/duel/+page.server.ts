import { TRIVIA } from '$lib/trivia';
import { pickDuel, parseSeed, parseVs, duelOg } from '$lib/duel';
import { formatDuration } from '$lib/game';

// 링크의 씨앗(?s=)마다 다른 10문제다 — 미리 그려 둘 수 없다. 상식 문제 파일(약 300KB)은 서버에만 두고
// 고른 10문제만 내린다(duel.ts).
export const prerender = false;

export function load({ url }) {
	const fromLink = parseSeed(url.searchParams.get('s'));
	const seed = fromLink ?? 1 + Math.floor(Math.random() * 999_999_999);
	const vs = fromLink ? parseVs(url.searchParams.get('n'), url.searchParams.get('t')) : null;
	// 답장 링크(&a=&b=) — 도전장을 보낸 사람의 기록. 친구 기록이 있을 때만 뜻이 있다
	const mine = vs ? parseVs(url.searchParams.get('a'), url.searchParams.get('b')) : null;
	const questions = pickDuel(TRIVIA, seed).map((p) => ({
		id: p.id,
		category: p.category ?? '',
		grade: p.grade ?? '',
		html: p.blocks.find((b) => b.kind === 'text')?.html ?? '',
		choices: p.choices ?? [],
		answerIndex: p.answerIndex ?? 0,
		explain: p.explain
	}));
	// 카카오톡 · 문자 미리보기 — 친구 점수가 보이는 그림 · 제목 · 설명(duel.ts duelOg). ogImage는 레이아웃이 읽는다
	const og = duelOg(vs, formatDuration, mine);
	return { seed, vs, mine, questions, og, ogImage: og.image, ogUrl: url.origin + url.pathname + url.search };
}
