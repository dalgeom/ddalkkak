import { kstDayNumber, archiveDays } from '$lib/game';
import type { RequestHandler } from './$types';

// 요청 시점에 오늘 기준 아카이브 30일을 나열한다(prerender 시 빌드 날짜에 고정됨).
export const prerender = false;

const SITE = 'https://ddalkkak-1c2.pages.dev';

/** 라우트가 늘어도 여기 한 줄만 추가하면 사이트맵이 따라간다. */
const PAGES: { path: string; freq: string; priority: string }[] = [
	{ path: '/', freq: 'daily', priority: '1.0' },
	{ path: '/play', freq: 'weekly', priority: '0.9' },
	{ path: '/matchstick', freq: 'weekly', priority: '0.8' },
	{ path: '/archive', freq: 'daily', priority: '0.7' },
	{ path: '/guide', freq: 'monthly', priority: '0.6' },
	{ path: '/about', freq: 'monthly', priority: '0.4' },
	{ path: '/privacy', freq: 'monthly', priority: '0.3' },
	{ path: '/terms', freq: 'monthly', priority: '0.3' }
];

export const GET: RequestHandler = () => {
	const archive = archiveDays(kstDayNumber(Date.now())).map((d) => ({
		path: `/archive/${d}`,
		freq: 'yearly',
		priority: '0.5'
	}));
	const all = [...PAGES, ...archive];
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
	.map(
		(p) =>
			`\t<url><loc>${SITE}${p.path}</loc><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
	)
	.join('\n')}
</urlset>`;
	return new Response(body, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
