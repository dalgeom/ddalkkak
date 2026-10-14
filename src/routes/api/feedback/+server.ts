import { json } from '@sveltejs/kit';
import { cleanFeedback, feedbackKey } from '$lib/feedback';
import type { RequestHandler } from './$types';

/**
 * 의견 한 건을 받아 KV에 쌓는다(feedback.ts). 읽는 GET은 일부러 없다 — 사용자가 쓴 글이라
 * 공개 주소로 내보내지 않는다. 확인은 scripts/feedback.mjs(wrangler 로그인)로만.
 *
 * 받는 것: 주제 · 글 · 보낸 화면 주소. IP·기기·이름은 저장하지 않는다.
 * hp는 사람 눈에 안 보이는 칸이다 — 채워져 오면 자동 입력 봇으로 보고 저장 없이 성공처럼 답한다.
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false }, { status: 400 });
	}
	if (typeof body.hp === 'string' && body.hp) return json({ ok: true });
	const fb = cleanFeedback(body);
	if (!fb) return json({ ok: false }, { status: 400 });

	const kv = platform?.env?.STATS;
	if (!kv) return json({ ok: false }, { status: 503 });
	const now = Date.now();
	try {
		await kv.put(feedbackKey(now, crypto.randomUUID().slice(0, 8)), JSON.stringify({ ...fb, t: now }));
	} catch {
		return json({ ok: false }, { status: 503 });
	}
	return json({ ok: true });
};
