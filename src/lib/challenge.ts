/**
 * 도전장 — 결과 공유 링크에 보낸 사람의 회차·점수·시간을 싣는다.
 *
 * 왜: 공유 링크가 지금 신규를 가장 싸게 데려오는 길이다. 8/01~9/13에 공유한 13명이 신규
 * 18명을 데려왔고(쇼츠는 16편에 신규 1명), 그 18명 중 11명이 시작·8명이 완주·5명이 다시
 * 공유했다. 받은 사람이 또 보내는 고리가 이미 돌고 있다. 그런데 링크는 홈을 가리킬 뿐이라
 * 받은 사람은 「친구가 몇 점이었는지」를 모른 채 들어왔다. 비교할 기록이 있어야 겨루고,
 * 이기거나 지면 되받아 보낼 이유가 생긴다.
 *
 * 형식은 `?c=62-8-192`(회차-맞힌 수-초). 대화방에 붙는 링크라 짧아야 한다.
 * 기록은 보낸 사람이 자기 브라우저에서 만든 값이라 믿을 근거가 없다 — 화면에 「친구 기록」으로
 * 보여 줄 뿐 어디에도 저장하지 않는다. 손으로 고친 값은 형식만 거른다.
 */
export type Challenge = { no: number; correct: number; secs?: number };
export type ChallengeOutcome = 'win' | 'lose' | 'draw';

const MAX_CORRECT = 10;
/** 하루를 넘는 기록은 없다 — 타이머는 탭을 떠나면 멈춘다 */
const MAX_SECS = 86_399;

export function encodeChallenge(c: Challenge): string {
	return c.secs ? `${c.no}-${c.correct}-${c.secs}` : `${c.no}-${c.correct}`;
}

export function parseChallenge(raw: string | null | undefined): Challenge | null {
	const m = /^(\d{1,5})-(\d{1,2})(?:-(\d{1,5}))?$/.exec(raw ?? '');
	if (!m) return null;
	const no = Number(m[1]);
	const correct = Number(m[2]);
	if (no < 1 || correct > MAX_CORRECT) return null;
	if (m[3] === undefined) return { no, correct };
	const secs = Number(m[3]);
	if (secs < 1 || secs > MAX_SECS) return null;
	return { no, correct, secs };
}

/** 많이 맞힌 쪽이 이긴다. 같으면 빠른 쪽 — 어느 한쪽 시간이 없으면 가릴 수 없으니 비김 */
export function judgeChallenge(me: { correct: number; secs?: number }, them: Challenge): ChallengeOutcome {
	if (me.correct !== them.correct) return me.correct > them.correct ? 'win' : 'lose';
	if (!me.secs || !them.secs || me.secs === them.secs) return 'draw';
	return me.secs < them.secs ? 'win' : 'lose';
}
