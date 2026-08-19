import { json } from '@sveltejs/kit';
import { tallyKey, parseTally, applyResult, accuracyOf } from '$lib/stats';
import type { RequestHandler } from './$types';

/**
 * 문제 하나의 결과를 받아 누적하고, 지금까지의 정답률을 돌려준다.
 *
 * 저장하는 것은 시도 수와 정답 수뿐이다 — 누가 풀었는지는 받지도 저장하지도 않는다.
 * KV가 없거나(로컬 개발) 실패해도 게임은 그대로 돌아가야 하므로, 어떤 경우에도
 * 200과 null을 돌려준다. 정답률은 곁가지지 본 기능이 아니다.
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const kv = platform?.env?.STATS;
	let id: unknown, correct: unknown;
	try {
		({ id, correct } = await request.json());
	} catch {
		return json({ accuracy: null });
	}
	if (typeof id !== 'string' || !id || id.length > 64 || typeof correct !== 'boolean') {
		return json({ accuracy: null });
	}
	if (!kv) return json({ accuracy: null });

	const key = tallyKey(id);
	try {
		const next = applyResult(parseTally(await kv.get(key)), correct);
		await kv.put(key, JSON.stringify(next));
		return json({ accuracy: accuracyOf(next) });
	} catch {
		// KV가 흔들려도 사용자는 아무것도 못 느껴야 한다
		return json({ accuracy: null });
	}
};
