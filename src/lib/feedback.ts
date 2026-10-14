/**
 * 의견 보내기(2026-10-14). 사용자가 개발자에게 자유롭게 남기는 글 — 헤더 종 옆 말풍선(FeedbackSheet).
 *
 * 저장: KV(STATS) 키 `fb:<ISO 시각>:<난수>`. 받는 것은 고른 주제 · 글 · 보낸 화면 주소 · 시각뿐이다.
 * 이름·연락처·IP는 받지도 저장하지도 않는다(개인정보처리방침 「보낸 의견」).
 * 읽기: 공개 주소 없음. scripts/feedback.mjs가 wrangler 로그인으로 KV를 직접 읽는다.
 */
export const FEEDBACK_KINDS = [
	{ key: 'boring', label: '재미없어요' },
	{ key: 'hard', label: '너무 어려워요' },
	{ key: 'easy', label: '너무 쉬워요' },
	{ key: 'want-puzzle', label: '이런 문제 추가해 주세요' },
	{ key: 'want-feature', label: '이런 기능 원해요' },
	{ key: 'bug', label: '오류가 있어요' },
	{ key: 'etc', label: '그 밖에' }
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]['key'];

export const FEEDBACK_MAX = 1000;
export const FEEDBACK_MIN = 2;

export interface Feedback {
	kind: FeedbackKind;
	text: string;
	/** 보낸 화면 — 경로와 쿼리(예: /trivia/korean-history, /?day=20740) */
	page: string;
}

/** 받은 값을 검사해 저장할 모양으로. 이상하면 null */
export function cleanFeedback(raw: unknown): Feedback | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	const kind = FEEDBACK_KINDS.find((k) => k.key === r.kind)?.key ?? null;
	if (!kind) return null;
	if (typeof r.text !== 'string') return null;
	const text = r.text.replace(/\r\n?/g, '\n').trim();
	if (text.length < FEEDBACK_MIN || text.length > FEEDBACK_MAX) return null;
	const page = typeof r.page === 'string' && r.page.startsWith('/') ? r.page.slice(0, 200) : '';
	return { kind, text, page };
}

export function feedbackKey(nowMs: number, rand: string): string {
	return `fb:${new Date(nowMs).toISOString()}:${rand}`;
}

export const kindLabel = (k: string) => FEEDBACK_KINDS.find((x) => x.key === k)?.label ?? k;
