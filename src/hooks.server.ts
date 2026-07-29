import type { Handle } from '@sveltejs/kit';

/**
 * 구주소(*.pages.dev)로 들어온 요청을 커스텀 도메인으로 301 이동한다.
 * 색인·공유 링크가 한 주소로 모여야 SEO 신호가 분산되지 않는다.
 * (Cloudflare Pages는 커스텀 도메인을 붙여도 pages.dev 주소를 계속 서빙한다)
 */
const CANONICAL_HOST = 'ddalkkak.app';

export const handle: Handle = async ({ event, resolve }) => {
	const host = event.url.hostname;
	if (host.endsWith('.pages.dev')) {
		return new Response(null, {
			status: 301,
			headers: { location: `https://${CANONICAL_HOST}${event.url.pathname}${event.url.search}` }
		});
	}
	return resolve(event);
};
