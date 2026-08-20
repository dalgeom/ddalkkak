import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * 알림 구독을 받아 KV에 담는다.
 *
 * 담기는 것은 브라우저가 발급한 푸시 주소와 암호화 키뿐이다. 누가 어떤 문제를 풀었는지와
 * 이어붙이지 않는다 — 정답률 집계(p:)와는 접두사부터 다른 자리에 두고, 조회용 GET은
 * p:만 훑으므로 이 값은 밖으로 나가지 않는다.
 *
 * 구독 해지는 발송 쪽에서 정리한다. 푸시 서버가 404나 410을 주면 그 구독은 죽은 것이라
 * 그때 지우는 게 가장 정확하다 — 브라우저는 사용자가 알림을 끈 걸 우리에게 알려주지 않는다.
 */

/** 푸시 주소는 길어서 그대로 키에 쓰지 않는다. 같은 구독이 두 번 들어와도 한 칸을 쓴다. */
async function subKey(endpoint: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
	const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
	return `sub:${hex.slice(0, 32)}`;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const kv = platform?.env?.STATS;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false });
	}

	const sub = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
	if (
		typeof sub?.endpoint !== 'string' ||
		!sub.endpoint.startsWith('https://') ||
		sub.endpoint.length > 512 ||
		typeof sub.keys?.p256dh !== 'string' ||
		typeof sub.keys?.auth !== 'string'
	) {
		return json({ ok: false });
	}
	if (!kv) return json({ ok: false });

	try {
		await kv.put(
			await subKey(sub.endpoint),
			JSON.stringify({
				endpoint: sub.endpoint,
				keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
				at: new Date().toISOString().slice(0, 10)
			})
		);
		return json({ ok: true });
	} catch {
		return json({ ok: false });
	}
};
