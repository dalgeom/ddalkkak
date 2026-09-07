import type { Handle } from '@sveltejs/kit';

/**
 * 구주소(*.pages.dev)로 들어온 요청을 커스텀 도메인으로 301 이동한다.
 * 색인·공유 링크가 한 주소로 모여야 SEO 신호가 분산되지 않는다.
 * (Cloudflare Pages는 커스텀 도메인을 붙여도 pages.dev 주소를 계속 서빙한다)
 */
const CANONICAL_HOST = 'ddalkkak.app';

/**
 * ssr=false인 페이지는 <svelte:head>가 서버에서 안 그려진다 — noindex가 크롤러에
 * 영영 도달하지 않는다. 헤더로 내보내야 한다.
 *
 * /today는 오늘의 문제와 정답이 실려 있어 스포일러 방지로 ssr을 껐다(today/+page.ts).
 * 그 결과 robots 메타도 같이 사라졌고, 2026-09-07에 네이버 서치어드바이저가
 * 「<meta name="description"> 설명 누락」으로 잡아냈다 — 색인해 놓고 경고를 띄운 것이라
 * 실제로는 「막으려던 페이지가 색인됐다」는 신호였다.
 */
const NOINDEX_PATHS = new Set(['/today']);

export const handle: Handle = async ({ event, resolve }) => {
	const host = event.url.hostname;
	if (host.endsWith('.pages.dev')) {
		return new Response(null, {
			status: 301,
			headers: { location: `https://${CANONICAL_HOST}${event.url.pathname}${event.url.search}` }
		});
	}
	const res = await resolve(event);
	if (NOINDEX_PATHS.has(event.url.pathname)) {
		res.headers.set('x-robots-tag', 'noindex, follow');
	}
	return res;
};
