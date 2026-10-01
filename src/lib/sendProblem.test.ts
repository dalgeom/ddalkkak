import { describe, it, expect } from 'vitest';
import { markParam, parseMark, sendUrl, sendText, compareLine, previewOf, previewTitle } from './sendProblem';
import { PROBLEMS } from './problems';
import { TRIVIA } from './trivia';
import type { Mark } from './game';

describe('문제 보내기 — 링크', () => {
	it('r은 보낸 사람 결과를 한 글자로 싣고, 받은 쪽에서 그대로 읽힌다', () => {
		for (const m of ['clean', 'hinted', 'miss'] as Mark[]) expect(parseMark(markParam(m))).toBe(m);
	});

	it('손으로 고친 r은 버린다', () => {
		expect(parseMark('x')).toBeNull();
		expect(parseMark('')).toBeNull();
		expect(parseMark(null)).toBeNull();
	});

	it('링크는 /q/<id>로 가고 UTM이 붙는다', () => {
		expect(sendUrl('https://ddalkkak.app', 'cal-decimal-clock', 'clean')).toBe(
			'https://ddalkkak.app/q/cal-decimal-clock?r=c&utm_source=share&utm_medium=problem'
		);
		expect(sendUrl('https://ddalkkak.app', 'a', null)).toBe('https://ddalkkak.app/q/a?utm_source=share&utm_medium=problem');
	});

	it('보내는 글에 링크가 들어 있고 정답은 없다', () => {
		const p = PROBLEMS.find((x) => x.id === 'cal-decimal-clock')!;
		const url = sendUrl('https://ddalkkak.app', p.id, 'miss');
		const t = sendText('miss', url);
		expect(t).toContain(url);
		expect(t).not.toContain(p.answers![0]);
	});

	it('모든 문제 id가 링크 경로에 그대로 쓸 수 있는 글자다', () => {
		for (const p of [...PROBLEMS, ...TRIVIA]) expect(p.id, p.id).toMatch(/^[a-z0-9-]+$/);
	});
});

describe('문제 보내기 — 받은 쪽', () => {
	it('맞힌 쪽이 이기고, 정답끼리는 한 번에 맞힌 쪽이 이긴다', () => {
		expect(compareLine('miss', 'hinted')).toContain('잘 풀었어요');
		expect(compareLine('clean', 'hinted')).toContain('친구가 이겼어요');
		expect(compareLine('clean', 'clean')).toContain('비겼어요');
		expect(compareLine(null, 'clean')).toBeNull();
	});

	it('미리보기 제목은 r마다 다르다', () => {
		const titles = new Set([null, 'clean', 'hinted', 'miss'].map((m) => previewTitle(m as Mark | null)));
		expect(titles.size).toBe(4);
	});

	it('미리보기 한 줄은 모든 문제에서 비지 않고 90자를 넘지 않으며 정답 해설을 싣지 않는다', () => {
		for (const p of [...PROBLEMS, ...TRIVIA]) {
			const s = previewOf(p);
			expect(s.length, p.id).toBeGreaterThan(0);
			expect(s.length, p.id).toBeLessThanOrEqual(90);
			expect(s.includes('<'), p.id).toBe(false);
		}
	});

	it('예시 줄을 「 · 」로 잇는다', () => {
		const p = PROBLEMS.find((x) => x.id === 'cal-decimal-clock')!;
		expect(previewOf(p)).toContain('12:00 → 5:00 · 6:00 → 2:50');
	});
});

describe('문제 보내기 — /q 쪽은 광고·색인 밖', () => {
	it('/q/<id>에는 광고 로더가 안 실리고, 다른 콘텐츠 쪽은 그대로 실린다', async () => {
		const { adsAllowed } = await import('../hooks.server');
		expect(adsAllowed('/q/cal-decimal-clock', '/q/[id]')).toBe(false);
		expect(adsAllowed('/discover/pattern', '/discover/[slug]')).toBe(true);
	});
});
