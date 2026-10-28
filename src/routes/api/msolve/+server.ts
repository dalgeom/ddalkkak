import { json } from '@sveltejs/kit';
import { parseTally, applyResult, type Tally } from '$lib/stats';
import { RULES } from '$lib/matchSolve';
import type { RequestHandler } from './$types';

/**
 * 성냥 정답 찾기에 사람들이 넣은 식 — 「많이 찾는 식」 순위와 「규칙에 따라 답이 갈리는 식」 글의 재료(10/28).
 *
 * GA 이벤트에는 식이 안 실린다(맞춤 측정기준 없이는 보고서에 안 나온다). 그래서 /api/stat처럼 숫자만 KV에 쌓는다.
 * 키는 m:<규칙>:<식>, 값은 { n: 찾은 횟수, ok: 그 규칙으로 답이 있던 횟수 }. 사람에 대한 것은 받지 않는다.
 * 식은 화면이 고친 모양(12-7=6) 그대로만 받는다 — 숫자와 + − = 뿐이라 글이 섞여 들어올 수 없다.
 */
const TEXT = /^[0-9+\-=]{3,15}$/;

export const POST: RequestHandler = async ({ request, platform }) => {
	const kv = platform?.env?.STATS;
	let text: unknown, rule: unknown, found: unknown;
	try {
		({ text, rule, found } = await request.json());
	} catch {
		return json({ ok: false });
	}
	if (typeof text !== 'string' || !TEXT.test(text) || !RULES.includes(rule as never) || typeof found !== 'boolean') {
		return json({ ok: false });
	}
	if (!kv) return json({ ok: false });
	const key = `m:${rule}:${text}`;
	try {
		await kv.put(key, JSON.stringify(applyResult(parseTally(await kv.get(key)), found)));
		return json({ ok: true });
	} catch {
		return json({ ok: false });
	}
};

/** 쌓인 식을 많이 찾은 순으로 — 읽기만 한다 */
export const GET: RequestHandler = async ({ platform, setHeaders }) => {
	const kv = platform?.env?.STATS;
	setHeaders({ 'cache-control': 'no-store' });
	if (!kv) return json({ items: [] });
	const items: ({ rule: string; text: string } & Tally)[] = [];
	try {
		let cursor: string | undefined;
		do {
			const page = await kv.list({ prefix: 'm:', limit: 1000, cursor });
			for (const k of page.keys) {
				const [, rule, text] = k.name.split(':');
				items.push({ rule, text, ...parseTally(await kv.get(k.name)) });
			}
			cursor = page.list_complete ? undefined : page.cursor;
		} while (cursor);
	} catch {
		return json({ items, partial: true });
	}
	items.sort((a, b) => b.n - a.n);
	return json({ items });
};
