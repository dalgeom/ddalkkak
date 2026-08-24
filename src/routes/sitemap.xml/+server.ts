import { kstDayNumber } from '$lib/game';
import { TRIVIA_CATEGORIES } from '$lib/triviaCategories';
import { DISCOVER_FIELD_META } from '$lib/discoverFields';
import { MATCH_KINDS } from '$lib/matchstickKinds';
import { ARTICLES } from '$lib/articles';
import type { RequestHandler } from './$types';

// 요청 시점에 오늘 기준 아카이브 30일을 나열한다(prerender 시 빌드 날짜에 고정됨).
export const prerender = false;

const SITE = 'https://ddalkkak.app';

/** 라우트가 늘어도 여기 한 줄만 추가하면 사이트맵이 따라간다. */
const PAGES: { path: string; freq: string; priority: string }[] = [
/* 색인에 올리는 것은 읽을 본문이 있는 페이지만이다.
   빠진 것들:
   · /archive/{날짜} 30개 — 하루치 10문제라 본문이 1,200~1,500자를 못 넘는데 sitemap의 40%를
     차지했다. 내용도 /discover·/trivia에 이미 실린 문제의 재조합이다. 페이지 자체는 남기고
     robots noindex만 걸었다(사람은 지난 문제 링크로 온다 — 3주간 검색 랜딩 0건).
   · /play, /matchstick, /cubenet — 게임 화면. /play는 본문이 200자뿐이고 나머지는 자바스크립트가
     그린다. 크롤러에게는 빈 페이지로 보인다. 각 유형의 읽을거리는 /matchstick/guide,
     /cubenet/guide, /discover가 따로 맡는다.
   애드센스가 가치 없는 콘텐츠로 두 번 반려한 뒤(8/11·8/21) 정리한 것이다. */
	{ path: '/', freq: 'daily', priority: '1.0' },
	{ path: '/discover', freq: 'monthly', priority: '0.8' },
	{ path: '/trivia', freq: 'monthly', priority: '0.8' },
	{ path: '/matchstick/guide', freq: 'monthly', priority: '0.8' },
	{ path: '/cubenet/guide', freq: 'monthly', priority: '0.8' },
	{ path: '/archive', freq: 'daily', priority: '0.8' },
	{ path: '/guide', freq: 'monthly', priority: '0.6' },
	{ path: '/about', freq: 'monthly', priority: '0.4' },
	{ path: '/privacy', freq: 'monthly', priority: '0.3' },
	{ path: '/terms', freq: 'monthly', priority: '0.3' }
];

export const GET: RequestHandler = () => {
	const today = kstDayNumber(Date.now());
	// KST 오늘 날짜(YYYY-MM-DD) — 매일 갱신되는 페이지의 lastmod
	const lastmod = new Date(today * 86400000 - 9 * 3600 * 1000 + 43200000)
		.toISOString()
		.slice(0, 10);
	// 분야별 문제 모음 — 내용이 고정이라 자주 바뀌지 않는다
	const triviaCats = TRIVIA_CATEGORIES.map((c) => ({
		path: `/trivia/${c.slug}`,
		freq: 'monthly',
		priority: '0.7'
	}));
	const discoverFields = DISCOVER_FIELD_META.map((f) => ({
		path: `/discover/${f.slug}`,
		freq: 'monthly',
		priority: '0.7'
	}));
	const matchKinds = MATCH_KINDS.map((k) => ({
		path: `/matchstick/${k.slug}`,
		freq: 'monthly',
		priority: '0.7'
	}));
	const articles = [
		{ path: '/read', freq: 'weekly', priority: '0.7' },
		...ARTICLES.map((a) => ({ path: `/read/${a.slug}`, freq: 'monthly', priority: '0.7' }))
	];
	const all = [...PAGES, ...triviaCats, ...discoverFields, ...matchKinds, ...articles];
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
	.map(
		(p) =>
			`\t<url><loc>${SITE}${p.path}</loc><lastmod>${lastmod}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
	)
	.join('\n')}
</urlset>`;
	return new Response(body, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
