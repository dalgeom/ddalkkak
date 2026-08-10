import { kstDayNumber, archiveDays } from '$lib/game';
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
	{ path: '/', freq: 'daily', priority: '1.0' },
	{ path: '/discover', freq: 'monthly', priority: '0.8' },
	{ path: '/trivia', freq: 'monthly', priority: '0.8' },
	{ path: '/play', freq: 'weekly', priority: '0.7' },
	{ path: '/matchstick', freq: 'weekly', priority: '0.7' },
	{ path: '/matchstick/guide', freq: 'monthly', priority: '0.8' },
	{ path: '/cubenet', freq: 'weekly', priority: '0.7' },
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
	const archive = archiveDays(today).map((d) => ({
		path: `/archive/${d}`,
		freq: 'yearly',
		priority: '0.5'
	}));
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
	const all = [...PAGES, ...triviaCats, ...discoverFields, ...matchKinds, ...articles, ...archive];
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
