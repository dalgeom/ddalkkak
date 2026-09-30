/**
 * 문체 검사 대상 — 사용자에게 보이는 글을 한곳에 모은다.
 *
 * 키는 「범위/위치」다(예: articles/chosung-tips/body). 개편 전후를 대조할 때(scripts/style-check.ts)와
 * style.test.ts가 같은 목록을 쓴다. 법률 문서(개인정보·약관)는 합니다체가 표준이라 넣지 않는다.
 */
import { ARTICLES } from './articles';
import { TRIVIA_CATEGORIES } from './triviaCategories';
import { DISCOVER_FIELD_META } from './discoverFields';
import { MATCH_KINDS } from './matchstickKinds';
import { MATCH_LEVELS } from './matchstickLevels';
import { CHOSUNG_CATEGORIES } from './data/chosung';
import { PROBLEMS } from './problems';
import { TRIVIA } from './trivia';

export type StyleScope = 'fields' | 'articles' | 'explains' | 'stems';

export function styleTexts(): { scope: StyleScope; key: string; text: string }[] {
	const out: { scope: StyleScope; key: string; text: string }[] = [];
	const add = (scope: StyleScope, key: string, text: string | undefined) => {
		if (text) out.push({ scope, key, text });
	};

	// 1단계 — 분야·유형 페이지 글
	for (const c of TRIVIA_CATEGORIES) {
		add('fields', `trivia/${c.slug}/intro`, c.intro);
		add('fields', `trivia/${c.slug}/desc`, c.desc);
		add('fields', `trivia/${c.slug}/deepDive`, c.deepDive);
		c.featured.forEach((f) => add('fields', `trivia/${c.slug}/why/${f.id}`, f.why));
	}
	for (const f of DISCOVER_FIELD_META) {
		add('fields', `discover/${f.slug}/intro`, f.intro);
		add('fields', `discover/${f.slug}/desc`, f.desc);
		add('fields', `discover/${f.slug}/deepDive`, f.deepDive);
		f.featured.forEach((x) => add('fields', `discover/${f.slug}/why/${x.id}`, x.why));
	}
	for (const k of [...MATCH_KINDS, ...MATCH_LEVELS]) {
		add('fields', `matchstick/${k.slug}/intro`, k.intro);
		k.how.forEach((h, i) => add('fields', `matchstick/${k.slug}/how/${i}`, h));
		k.featured.forEach((f) => add('fields', `matchstick/${k.slug}/why/${f.displayed}`, f.why));
		add('fields', `matchstick/${k.slug}/extra`, k.extra.body);
	}
	for (const c of CHOSUNG_CATEGORIES) {
		add('fields', `chosung/${c.slug}/intro`, c.intro);
		add('fields', `chosung/${c.slug}/deepDive`, c.deepDive);
		add('fields', `chosung/${c.slug}/guide`, c.guide.body);
	}

	// 2단계 — 읽을거리
	for (const a of ARTICLES) {
		add('articles', `articles/${a.slug}/description`, a.description);
		add('articles', `articles/${a.slug}/body`, a.body);
	}

	// 3단계 — 문제 해설·힌트
	for (const p of PROBLEMS) {
		add('explains', `problems/${p.id}/explain`, p.explain);
		p.hints?.forEach((h, i) => add('explains', `problems/${p.id}/hint/${i}`, h));
	}
	for (const t of TRIVIA) add('explains', `trivia/${t.id}/explain`, t.explain);

	// 4단계 — 문제 지문(text 블록). 예시(pre)·전광판·그림은 문장이 아니라 뺀다
	for (const p of [...PROBLEMS, ...TRIVIA])
		p.blocks.forEach((b, i) => {
			if (b.kind === 'text') add('stems', `${p.trivia ? 'trivia' : 'problems'}/${p.id}/stem/${i}`, b.html);
		});

	return out;
}
