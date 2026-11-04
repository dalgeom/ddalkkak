import { version } from '$app/environment';
import { kstDayNumber } from '$lib/game';
import { TRIVIA_CATEGORIES } from '$lib/triviaCategories';
import { DISCOVER_FIELD_META } from '$lib/discoverFields';
import { MATCH_KINDS } from '$lib/matchstickKinds';
import { MATCH_LEVELS } from '$lib/matchstickLevels';
import { MATCH_ANSWERS, answerSlug } from '$lib/matchAnswers';
import { CHOSUNG_CATEGORIES } from '$lib/data/chosung';
import { KKEUT_FIRST_DAY, KKEUT_PUZZLES } from '$lib/data/kkeutPuzzles';
import { ARTICLES } from '$lib/articles';
import { FIX_LOG } from '$lib/fixLog';
import type { RequestHandler } from './$types';

// 요청 시점에 오늘 기준 아카이브 30일을 나열한다(prerender 시 빌드 날짜에 고정됨).
export const prerender = false;

const SITE = 'https://ddalkkak.app';

/** 라우트가 늘어도 여기 한 줄만 추가하면 사이트맵이 따라간다. */
/* lastmod는 실제로 바뀐 날을 아는 쪽에만 적는다(11/4). 전부 「오늘」로 찍었더니 구글이 lastmod를 믿을 수 없어
   새 쪽(/chosung/show 등)이 열흘 넘게 크롤링되지 않았다. 모르는 쪽은 적지 않는 편이 낫다.
   아래 날짜는 그 쪽 파일의 마지막 커밋 날짜다 — 쪽 내용을 고치면 같이 고친다. */
type Entry = { path: string; freq: string; priority: string; lastmod?: string };
const PAGES: Entry[] = [
/* 색인에 올리는 것은 읽을 본문이 있는 페이지만이다.
   빠진 것들:
   · /archive/{날짜} 30개 — 하루치 10문제라 본문이 1,200~1,500자를 못 넘는데 sitemap의 40%를
     차지했다. 내용도 /discover·/trivia에 이미 실린 문제의 재조합이다. 페이지 자체는 남기고
     robots noindex만 걸었다(사람은 지난 문제 링크로 온다 — 3주간 검색 랜딩 0건).
   · /play, /matchstick, /cubenet — 게임 화면. /play는 본문이 200자뿐이고 나머지는 자바스크립트가
     그린다. 각 유형의 읽을거리는 /matchstick/guide, /cubenet/guide, /discover가 따로 맡는다.

     주의: /matchstick·/cubenet을 「크롤러에게 빈 페이지」라고 적어 뒀는데 사실이 아니다.
     /matchstick은 SSR HTML이 18KB이고, 네이버 통합검색에서 「성냥개비 문제」 1위,
     /cubenet은 「전개도 문제」 1위 착지다(2026-09-03 확인). 14일 착지 69·21세션으로
     홈 다음가는 입구다. sitemap에서 뺀 진짜 이유는 얄팍함이 아니라 애드센스 정리
     방향(게임 화면은 색인 자산이 아니다)이었다. 이미 1위라 도로 넣어도 달라질 것이
     없으므로 뺀 상태를 유지한다 — 다만 「빈 페이지라서」라는 근거로 다른 판단을
     하지 마라.
   애드센스가 가치 없는 콘텐츠로 두 번 반려한 뒤(8/11·8/21) 정리한 것이다. */
	{ path: '/', freq: 'daily', priority: '1.0' },
	{ path: '/discover', freq: 'monthly', priority: '0.8' },
	{ path: '/trivia', freq: 'monthly', priority: '0.8' },
	{ path: '/matchstick/guide', freq: 'monthly', priority: '0.8' },
	// 성냥 정답 찾기(10/21) — 식을 검색해 들어오는 사람용 도구. 게임 화면과 달리 설명 글과 자주 찾는 식의 답이 HTML에 있다
	{ path: '/matchstick/solve', freq: 'monthly', priority: '0.7', lastmod: '2026-10-30' },
	// 자주 찾는 성냥 식 정답 모음(10/29) — 식마다 답 그림과 손으로 쓴 풀이가 HTML에 있다
	{ path: '/matchstick/answer', freq: 'monthly', priority: '0.7', lastmod: '2026-10-29' },
	// 초성 퀴즈 띄우기(10/26) — 수업 · 모임 진행 도구. 진행 요령 글이 HTML에 있다
	{ path: '/chosung/show', freq: 'monthly', priority: '0.7', lastmod: '2026-10-26' },
	// 도구 모음(11/4) — 띄우기 · 만들기 · 학습지 · 찾기를 쓰임새별로 묶은 쪽과 그 도구들. 쪽마다 쓰는 법 글이 HTML에 있다
	{ path: '/tools', freq: 'monthly', priority: '0.8', lastmod: '2026-11-04' },
	{ path: '/trivia/show', freq: 'monthly', priority: '0.7', lastmod: '2026-11-04' },
	{ path: '/matchstick/make', freq: 'monthly', priority: '0.7', lastmod: '2026-11-04' },
	{ path: '/print', freq: 'monthly', priority: '0.7', lastmod: '2026-11-04' },
	{ path: '/kkeut/words', freq: 'monthly', priority: '0.7', lastmod: '2026-11-04' },
	{ path: '/cubenet/guide', freq: 'monthly', priority: '0.8' },
	{ path: '/archive', freq: 'daily', priority: '0.8' },
	{ path: '/guide', freq: 'monthly', priority: '0.6' },
	{ path: '/about', freq: 'monthly', priority: '0.4' },
	// 다듬은 기록(10/29) — 미리 풀기로 공개 전에 고친 것을 한 줄씩. 꾸준히 손보는 흔적이 HTML에 있다
	{ path: '/news/fixes', freq: 'weekly', priority: '0.4', lastmod: FIX_LOG[0].date },
	{ path: '/privacy', freq: 'monthly', priority: '0.3' },
	{ path: '/terms', freq: 'monthly', priority: '0.3' }
];

export const GET: RequestHandler = () => {
	const today = kstDayNumber(Date.now());
	// KST 오늘 날짜(YYYY-MM-DD) — 매일 문제가 바뀌는 홈 · 아카이브의 lastmod
	const todayIso = new Date(today * 86400000 - 9 * 3600 * 1000 + 43200000)
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
	const matchKinds = [...MATCH_KINDS, ...MATCH_LEVELS].map((k) => ({
		path: `/matchstick/${k.slug}`,
		freq: 'monthly',
		priority: '0.7'
	}));
	// 초성 퀴즈 분야 모음 — /chosung(게임 화면)은 /matchstick과 같은 이유로 뺀다
	const chosungCats = CHOSUNG_CATEGORIES.map((c) => ({
		path: `/chosung/${c.slug}`,
		freq: 'monthly',
		priority: '0.7'
	}));
	const matchAnswers = MATCH_ANSWERS.map((a) => ({
		path: `/matchstick/answer/${answerSlug(a.q)}`,
		freq: 'monthly',
		priority: '0.6',
		lastmod: '2026-10-29'
	}));
	// 지난 오늘의 끝말잇기 해설(11/3) — 오간 말과 뜻풀이가 HTML에 있다. /kkeut(게임 화면)는 /matchstick과 같은 이유로 뺀다
	// 해설 쪽은 빌드한 날까지만 구워지므로 요청 날짜(today)가 아니라 빌드 날짜로 거른다 — version 기본값이 빌드 시각(Date.now())이다
	const kkeutAnswers = KKEUT_PUZZLES.filter((_, i) => KKEUT_FIRST_DAY + i < kstDayNumber(Number(version))).map((p) => ({
		path: `/kkeut/answer/${p.date}`,
		freq: 'yearly',
		priority: '0.5',
		lastmod: p.date
	}));
	const articles: Entry[] = [
		{ path: '/read', freq: 'weekly', priority: '0.7', lastmod: ARTICLES.map((a) => a.date).sort().at(-1) },
		...ARTICLES.map((a) => ({ path: `/read/${a.slug}`, freq: 'monthly', priority: '0.7', lastmod: a.date }))
	];
	const daily = new Set(['/', '/archive']);
	const all: Entry[] = [...PAGES, ...triviaCats, ...discoverFields, ...matchKinds, ...matchAnswers, ...kkeutAnswers, ...chosungCats, ...articles];
	for (const p of all) if (daily.has(p.path)) p.lastmod = todayIso;
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
	.map(
		(p) =>
			`\t<url><loc>${SITE}${p.path}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}<changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
	)
	.join('\n')}
</urlset>`;
	return new Response(body, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
