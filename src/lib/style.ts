/**
 * 문체 검사 — 사용자에게 보이는 글이 해요체로 통일돼 있는지 본다. 규칙은 docs/문체.md.
 *
 * 2026-09-29 실측: 상식 분야 소개글 369문장 중 267(72%), 발견형 분야 소개글 148문장 중 123(83%)이
 * 한다체였고, 같은 페이지 위쪽은 합니다체였다. 한 화면 안에서 말투가 갈아탔다.
 * 사용자가 해요체로 통일하기로 했다(9/29).
 *
 * 여기 있는 것은 두 가지다.
 *   styleIssues  — 말투 위반(「~다.」로 끝나는 문장)과 대시(—)
 *   factsOf      — 글 속 숫자와 HTML 태그. 말투를 고치기 전후로 같아야 한다(사실 보존)
 */

/** 예시·그림은 문장이 아니다 — 검사에서 뺀다 */
function proseOf(html: string): string {
	return html
		.replace(/<pre[\s\S]*?<\/pre>/g, ' ')
		.replace(/<svg[\s\S]*?<\/svg>/g, ' ')
		.replace(/<code[\s\S]*?<\/code>/g, ' ')
		.replace(/<[^>]+>/g, '\n')
		.replace(/&nbsp;/g, ' ');
}

/** 문장 단위로 쪼갠다. 줄바꿈(태그 경계)과 마침표·물음표·느낌표 뒤 공백에서 끊는다 */
export function sentencesOf(html: string): string[] {
	return proseOf(html)
		.split(/\n+|(?<=[.!?])\s+/)
		.map((s) => s.trim())
		.filter((s) => /[가-힣]/.test(s));
}

/**
 * 해요체가 아닌 종결인가 — 「~다」로 끝나면 합니다체(~습니다)든 한다체(~었다)든 위반이다.
 * 인용(」)이나 괄호로 끝나는 문장은 종결이 안 보이므로 보지 않는다.
 */
export function isOffTone(sentence: string): boolean {
	const raw = sentence.trim();
	const s = raw.replace(/[.!?…]+$/, '').trim();
	if (/[」)\]』"']$/.test(s)) return false;
	if (/다$/.test(s) || /니까$/.test(s)) return true;
	// 반말 질문(「누구인가?」「몇 개일까?」) — 9/29 지문 개편 때 「~다.」만 보다가 80개를 놓쳤다.
	// 「물음표는?」「몇 등?」 같은 명사형 질문은 괜찮다
	if (/\?$/.test(raw) && /(까|는가|인가|은가|던가|했나|았나|었나|니|냐)$/.test(s)) return true;
	// 명령·청유(「찾아라」「풀어 보자」). 「보라」는 색 이름(답 보라)과 겹쳐서 넣지 않는다
	return /(아라|어라|해라|하라|보자|하자)$/.test(s);
}

export type StyleIssue = { kind: 'tone' | 'dash'; text: string };

export function styleIssues(html: string): StyleIssue[] {
	const out: StyleIssue[] = [];
	for (const s of sentencesOf(html)) {
		if (isOffTone(s)) out.push({ kind: 'tone', text: s });
		if (s.includes('—')) out.push({ kind: 'dash', text: s });
	}
	return out;
}

/** 사실 보존용 지문 — 숫자(1,000 → 1000)와 태그 이름을 순서대로 */
export function factsOf(html: string): { nums: string[]; tags: string[] } {
	const nums = (html.replace(/<[^>]+>/g, ' ').match(/\d[\d,.]*/g) ?? []).map((n) =>
		n.replace(/,/g, '').replace(/\.$/, '')
	);
	const tags = (html.match(/<\/?[a-z][a-z0-9]*/gi) ?? []).map((t) => t.toLowerCase());
	return { nums, tags };
}
