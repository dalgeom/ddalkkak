import problems from '$lib/data/matchstick-problems.json';
import { parseSeed, parseVs } from '$lib/duel';
import { pickMatchDuel, matchDuelOg, MDUEL_SIZE } from '$lib/matchDuel';
import { formatDuration } from '$lib/game';

// 링크의 씨앗(?s=)마다 다른 5문제다 — 미리 그려 둘 수 없다. 고른 5문제만 내린다(matchDuel.ts).
export const prerender = false;

export function load({ url }) {
	const fromLink = parseSeed(url.searchParams.get('s'));
	const seed = fromLink ?? 1 + Math.floor(Math.random() * 999_999_999);
	const vs = fromLink ? parseVs(url.searchParams.get('n'), url.searchParams.get('t'), MDUEL_SIZE) : null;
	// 답장 링크(&a=&b=) — 도전장을 보낸 사람의 기록(상식 대결과 같다)
	const mine = vs ? parseVs(url.searchParams.get('a'), url.searchParams.get('b'), MDUEL_SIZE) : null;
	const items = pickMatchDuel(problems, seed);
	const og = matchDuelOg(vs, formatDuration, mine);
	return { seed, vs, mine, items, og, ogImage: og.image, ogUrl: url.origin + url.pathname + url.search };
}
