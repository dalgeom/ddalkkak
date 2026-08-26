import { describe, it, expect } from 'vitest';
import { ARTICLES, articleBySlug } from './articles';
import { DISCOVER_FIELD_META } from './discoverFields';

describe('읽을거리', () => {
	it('슬러그가 중복되지 않고 URL에 그대로 쓸 수 있다', () => {
		const slugs = ARTICLES.map((a) => a.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const s of slugs) expect(/^[a-z][a-z0-9-]*[a-z0-9]$/.test(s), s).toBe(true);
	});

	it('본문이 산문 분량이다 (1,200자 이상)', () => {
		// '가치 없는 콘텐츠'를 반박하는 코너다 — 얇은 글이 섞이면 목적이 무너진다
		for (const a of ARTICLES) {
			const text = a.body.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
			expect(text.length, `${a.slug}: ${text.length}자`).toBeGreaterThan(1200);
		}
	});

	it('제목·설명이 서로 다르다 (복제 페이지로 보이지 않게)', () => {
		expect(new Set(ARTICLES.map((a) => a.title)).size).toBe(ARTICLES.length);
		expect(new Set(ARTICLES.map((a) => a.description)).size).toBe(ARTICLES.length);
		for (const a of ARTICLES) expect(a.description.length, a.slug).toBeGreaterThan(30);
	});

	it('본문 SVG가 유효한 등식을 그린다', () => {
		// boardSvg가 던지면 모듈 로드 자체가 실패하니 여기 오면 이미 통과지만,
		// aria-label에 등식이 박혔는지로 렌더 결과를 한 번 더 확인한다
		const match = ARTICLES.find((a) => a.slug === 'matchstick-tips')!;
		for (const eq of ['0 - 1 = 8', '9 - 1 = 8', '0 + 2 = 6', '8 - 2 = 6']) {
			expect(match.body).toContain(`aria-label="${eq}"`);
		}
	});

	it('cta 링크가 실제 경로다', () => {
		// 분야 페이지(/discover/calendar 등)는 discoverFields가 정하는 실제 라우트다.
		// 손으로 적은 목록에 두면 분야가 늘 때마다 멀쩡한 링크가 오답으로 잡힌다.
		const valid = [
			'/',
			'/matchstick',
			'/cubenet',
			'/discover',
			'/play',
			'/trivia',
			...DISCOVER_FIELD_META.map((f) => `/discover/${f.slug}`)
		];
		for (const a of ARTICLES) expect(valid, a.slug).toContain(a.cta.href);
	});

	it('슬러그로 되찾을 수 있다', () => {
		for (const a of ARTICLES) expect(articleBySlug(a.slug)).toBe(a);
		expect(articleBySlug('없는글')).toBeUndefined();
	});

	it('날짜 형식이 YYYY-MM-DD다', () => {
		for (const a of ARTICLES) expect(/^\d{4}-\d{2}-\d{2}$/.test(a.date), a.slug).toBe(true);
	});
});
