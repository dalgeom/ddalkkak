import { describe, it, expect } from 'vitest';
import { PROBLEMS } from './problems';
import { TRIVIA } from './trivia';
import { MATCH_TOTAL, CUBE_TOTAL, DAILY_COUNTS } from './game';

/**
 * 문제 수를 화면에 숫자로 박아두면, 문제를 추가할 때마다 그 화면만 옛 숫자로 남는다.
 * 실제로 홈에 "발견형 200"이, 소개에 "누적 1,346"이, 성냥개비 title에 741이 남아 있었다.
 * 개수는 반드시 서버 로드가 세어 내려준 값을 쓰고, 여기서 박제된 숫자를 막는다.
 */
const PAGES: Record<string, string> = import.meta.glob(
	['/src/routes/**/*.svelte', '/src/app.html'],
	{ query: '?raw', import: 'default', eager: true }
);
const LAYOUT: Record<string, string> = import.meta.glob('/src/routes/+layout.server.ts', {
	query: '?raw',
	import: 'default',
	eager: true
});
const OG_GEN: Record<string, string> = import.meta.glob('/scripts/og-gen.mjs', {
	query: '?raw',
	import: 'default',
	eager: true
});

describe('문제 수는 화면에 박아두지 않는다', () => {
	it('현재 개수와 같은 숫자가 화면 문구에 박혀 있지 않다', () => {
		const total = PROBLEMS.length + TRIVIA.length + MATCH_TOTAL + CUBE_TOTAL;
		// 지금 값 + 콤마 표기까지 함께 막는다
		const banned = [PROBLEMS.length, TRIVIA.length, MATCH_TOTAL, CUBE_TOTAL, total].flatMap((n) => [
			String(n),
			n.toLocaleString('en-US')
		]);
		const hits: string[] = [];
		for (const [f, src] of Object.entries(PAGES)) {
			for (const line of src.split('\n')) {
				// 개수를 뜻하는 문맥에서만 본다 — 크기·시간 같은 CSS 숫자는 제외
				if (!/문제|개\b|퍼즐|가지/.test(line)) continue;
				if (/px|ms\b|%|width|height|margin|padding|font|delay|duration|rgba?\(/.test(line)) continue;
				for (const b of banned) {
					if (new RegExp(`(?<![0-9.,])${b}(?![0-9.,])`).test(line)) {
						hits.push(`${f}: ${line.trim().slice(0, 90)}`);
					}
				}
			}
		}
		expect(hits, `개수가 박혀 있다 — 서버 로드가 내려주는 값을 쓸 것:\n${hits.join('\n')}`).toEqual([]);
	});

	it('레이아웃이 네 유형의 개수를 모두 내려준다', () => {
		const src = Object.values(LAYOUT)[0];
		expect(src, '+layout.server.ts를 못 읽었다').toBeTruthy();
		for (const k of ['discover', 'trivia', 'match', 'cube'])
			expect(src, `${k}가 counts에 없다`).toContain(k);
		expect(src).toContain('PROBLEMS.length');
		expect(src).toContain('TRIVIA.length');
	});

	/* 공유 카드는 PNG라 위 검사가 못 본다. 유형이 하나 늘었을 때 카드만
	   "발견형·상식·성냥개비"로 남아 있던 적이 있어, 생성기 문구를 대신 센다. */
	it('공유 카드 생성기가 모든 유형을 적고 있다', () => {
		const src = Object.values(OG_GEN)[0];
		expect(src, 'scripts/og-gen.mjs를 못 읽었다').toBeTruthy();
		const line = src.split('\n').find((l) => l.includes('하루 <b>10문제</b>'));
		expect(line, '카드 부제 줄을 못 찾았다').toBeTruthy();
		const listed = line!.split('—')[1].split('·').length;
		expect(listed, `카드에 ${listed}개만 적혀 있다 — node scripts/og-gen.mjs 다시 돌릴 것`).toBe(
			Object.keys(DAILY_COUNTS).length
		);
	});
});
