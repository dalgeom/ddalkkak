import { TRIVIA_CATEGORIES } from '$lib/triviaCategories';
import { DISCOVER_FIELD_META } from '$lib/discoverFields';
import { MATCH_KINDS } from '$lib/matchstickKinds';
import { MATCH_LEVELS } from '$lib/matchstickLevels';
import { CHOSUNG_CATEGORIES } from '$lib/data/chosung';
import { ARTICLES } from '$lib/articles';
import { PROBLEMS } from '$lib/problems';
import { TRIVIA } from '$lib/trivia';
import type { RequestHandler } from './$types';

/*
 * AI 검색(ChatGPT · Perplexity · Claude 등)이 사이트를 한 번에 읽는 안내(llmstxt.org 형식, 10/15).
 * 8/1~10/15 AI 유입은 ChatGPT 18 · Bing 10 · Perplexity 3세션으로 적고, ChatGPT는 /matchstick으로 가장 많이 들어왔다.
 * 목록은 sitemap.xml과 같은 데이터에서 만든다 — 분야가 늘면 여기도 따라간다. 게임 화면도 넣는다(AI는 「어디서 풀 수 있나」를 묻는다).
 */
export const prerender = true;

const SITE = 'https://ddalkkak.app';
const one = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const first = (s: string) => one(s).split(/(?<=[.?!요다])\s/)[0];

export const GET: RequestHandler = () => {
	const lines = [
		'# 딸깍',
		'',
		`> 매일 자정(한국 시간)에 새 두뇌 퍼즐 10문제가 열리는 무료 웹사이트예요. 가입이나 설치 없이 브라우저에서 바로 풀어요. 예시 몇 줄을 보고 규칙을 찾는 발견형 퍼즐 ${PROBLEMS.length}문제, 상식 퀴즈 ${TRIVIA.length}문제, 성냥개비 퍼즐, 전개도(정육면체 펼친 그림), 초성 퀴즈가 있어요. 모든 문제에 힌트와 해설이 붙어 있어요.`,
		'',
		'## 바로 풀기',
		`- [오늘의 10문제](${SITE}/): 매일 바뀌는 10문제. 모두가 같은 문제를 풀어요.`,
		`- [성냥개비 퍼즐](${SITE}/matchstick): 성냥 하나를 옮겨 틀린 식을 맞게 고치는 문제. 오늘의 성냥개비, 60단계 도전, 그림 퍼즐(정사각형 만들기)이 있어요.`,
		`- [상식 퀴즈 대결](${SITE}/trivia/duel): 상식 10문제를 풀고 결과 링크를 보내면 친구가 같은 10문제로 겨뤄요.`,
		`- [상식 퀴즈 단계 도전](${SITE}/trivia/stages): 새싹(초등)부터 어려움(어른)까지 75판, 한 판에 5문제. 3문제 이상 맞히면 다음 판이 열려요.`,
		`- [성냥개비 대결](${SITE}/matchstick/duel): 성냥 하나만 옮기는 5문제를 풀고 결과 링크를 보내면 친구가 같은 5문제로 겨뤄요.`,
		`- [초성 퀴즈](${SITE}/chosung): 초성과 뜻풀이를 보고 낱말을 맞혀요.`,
		`- [전개도 퍼즐](${SITE}/cubenet): 펼친 그림을 접으면 어떤 주사위가 되는지 골라요.`,
		`- [지난 문제](${SITE}/archive): 지난 날짜의 10문제를 다시 풀어요.`,
		'',
		'## 상식 퀴즈 (분야별, 정답과 해설)',
		...TRIVIA_CATEGORIES.map((c) => `- [${c.title}](${SITE}/trivia/${c.slug}): ${one(c.desc)}`),
		'',
		'## 발견형 퍼즐 (규칙 찾기)',
		`- [발견형 퍼즐 전체](${SITE}/discover): 숫자, 낱말, 그림 예시에서 숨은 규칙을 찾는 문제 모음.`,
		...DISCOVER_FIELD_META.map((f) => `- [${f.title}](${SITE}/discover/${f.slug}): ${one(f.desc)}`),
		`- [발견형 퍼즐 푸는 법](${SITE}/guide)`,
		'',
		'## 성냥개비 퍼즐 (유형별)',
		`- [성냥개비 문제 푸는 법](${SITE}/matchstick/guide)`,
		...[...MATCH_KINDS, ...MATCH_LEVELS].map((k) => `- [${k.title}](${SITE}/matchstick/${k.slug}): ${first(k.intro)}`),
		'',
		'## 초성 퀴즈 (분야별)',
		...CHOSUNG_CATEGORIES.map((c) => `- [${c.title}](${SITE}/chosung/${c.slug}): ${first(c.intro)}`),
		'',
		'## 전개도',
		`- [전개도 문제 푸는 법](${SITE}/cubenet/guide)`,
		'',
		'## 읽을거리',
		...ARTICLES.map((a) => `- [${a.title}](${SITE}/read/${a.slug}): ${one(a.description)}`),
		'',
		'## 사이트',
		`- [딸깍 소개](${SITE}/about)`,
		''
	];
	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
};
