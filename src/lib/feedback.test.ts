import { describe, it, expect } from 'vitest';
import { cleanFeedback, feedbackKey, FEEDBACK_MAX } from './feedback';

describe('의견 보내기 — 받은 값 검사', () => {
	it('주제 · 글 · 화면을 다듬어 받는다', () => {
		expect(cleanFeedback({ kind: 'hard', text: '  성냥 15단계가 너무 어려워요\r\n힌트가 더 있으면 ', page: '/matchstick' })).toEqual({
			kind: 'hard',
			text: '성냥 15단계가 너무 어려워요\n힌트가 더 있으면',
			page: '/matchstick'
		});
	});
	it('모르는 주제 · 너무 짧은 글 · 너무 긴 글 · 글 아닌 값은 거절', () => {
		expect(cleanFeedback({ kind: 'spam', text: '안녕하세요', page: '/' })).toBeNull();
		expect(cleanFeedback({ kind: 'etc', text: ' ㅋ ', page: '/' })).toBeNull();
		expect(cleanFeedback({ kind: 'etc', text: '가'.repeat(FEEDBACK_MAX + 1), page: '/' })).toBeNull();
		expect(cleanFeedback({ kind: 'etc', text: 123, page: '/' })).toBeNull();
		expect(cleanFeedback(null)).toBeNull();
	});
	it('화면 주소는 /로 시작하는 것만, 200자까지', () => {
		expect(cleanFeedback({ kind: 'etc', text: '좋아요', page: 'https://evil.example' })?.page).toBe('');
		expect(cleanFeedback({ kind: 'etc', text: '좋아요', page: '/' + 'a'.repeat(300) })?.page.length).toBe(200);
	});
	it('한 번 누른 반응은 글 없이도 받는다 · 일반 의견은 여전히 두 글자부터', () => {
		expect(cleanFeedback({ kind: 'fun', quick: true, page: '/?day=20742' })).toEqual({ kind: 'fun', text: '', page: '/?day=20742', quick: true });
		expect(cleanFeedback({ kind: 'hard', quick: true, text: ' 7번이 어려웠어요 ', page: '/' })?.text).toBe('7번이 어려웠어요');
		expect(cleanFeedback({ kind: 'fun', text: '', page: '/' })).toBeNull();
		expect(cleanFeedback({ kind: 'fun', quick: true, text: '가'.repeat(FEEDBACK_MAX + 1) })).toBeNull();
	});
	it('키는 시각 순으로 정렬된다', () => {
		const a = feedbackKey(Date.UTC(2026, 9, 14, 1), 'x');
		const b = feedbackKey(Date.UTC(2026, 9, 14, 2), 'a');
		expect(a < b).toBe(true);
		expect(a.startsWith('fb:2026-10-14T01:00:00.000Z:')).toBe(true);
	});
});
