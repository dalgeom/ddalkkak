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

/**
 * 애드센스 로더는 콘텐츠 페이지에만 싣는다.
 *
 * 전에는 app.html에 박혀 모든 화면에 실렸다 — 본문 0자인 /today 셸, 404, 로딩 화면까지
 * (2026-09-30 실측: 66쪽 전부). 게시자 정책은 게시자 콘텐츠가 없는 화면·막다른 화면에
 * 광고를 금지한다(support.google.com/publisherpolicies/answer/11112688).
 *
 *   /today   ssr=false라 서버 HTML은 빈 셸이다(스포일러 방지)
 *   /record  내 기록 — 브라우저 저장값만 보여 준다
 *   /play    문제는 클라이언트가 불러온다. 서버 HTML은 로딩 문구뿐이고, 풀이 화면은
 *            선택지·버튼이 모여 있어 광고를 둘 자리가 아니다
 *   오류     매칭된 라우트가 없거나(404) 응답이 400 이상이면 뺀다
 *
 * 게시자 ID는 페이지 소스에 그대로 노출되는 공개 식별자다(비밀 아님).
 */
const ADSENSE =
	'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2389523583052577" crossorigin="anonymous"></script>';
const NO_ADS_PATHS = new Set(['/today', '/record', '/play']);

export function adsAllowed(path: string, routeId: string | null): boolean {
	return routeId !== null && !NO_ADS_PATHS.has(path);
}

export const handle: Handle = async ({ event, resolve }) => {
	const host = event.url.hostname;
	if (host.endsWith('.pages.dev')) {
		return new Response(null, {
			status: 301,
			headers: { location: `https://${CANONICAL_HOST}${event.url.pathname}${event.url.search}` }
		});
	}
	const ads = adsAllowed(event.url.pathname, event.route.id);
	let res = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%ddal.adsense%', ads ? ADSENSE : '')
	});
	// 라우트 안에서 error(404) 등으로 떨어진 화면은 route.id가 있어 위에서 못 거른다
	if (ads && res.status >= 400 && res.headers.get('content-type')?.includes('text/html')) {
		const html = (await res.text()).replace(ADSENSE, '');
		const headers = new Headers(res.headers);
		headers.delete('content-length');
		res = new Response(html, { status: res.status, headers });
	}
	if (NOINDEX_PATHS.has(event.url.pathname)) {
		res.headers.set('x-robots-tag', 'noindex, follow');
	}
	return res;
};
