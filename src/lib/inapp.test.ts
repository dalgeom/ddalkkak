import { describe, it, expect } from 'vitest';
import { detectInApp, isIOS, openWay, externalUrl } from './inapp';
import { iosBrowser, installSteps, platformOf, isInAppUA } from './pwa';

const UA = {
	kakaoAndroid:
		'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.4.3',
	kakaoIOS:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.3',
	instagram:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.113',
	chromeAndroid:
		'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
	safariIOS:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
	// 네이버 웨일은 정식 브라우저다 — 인앱으로 오판하면 멀쩡한 사용자에게 배너가 뜬다
	whale:
		'Mozilla/5.0 (Linux; Android 13; SM-S908N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Whale/3.21.192.18 Mobile Safari/537.36',
	desktop:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

describe('detectInApp', () => {
	it('인앱 브라우저를 잡아낸다', () => {
		expect(detectInApp(UA.kakaoAndroid)).toBe('kakao');
		expect(detectInApp(UA.kakaoIOS)).toBe('kakao');
		expect(detectInApp(UA.instagram)).toBe('instagram');
	});
	it('정식 브라우저는 건드리지 않는다', () => {
		expect(detectInApp(UA.chromeAndroid)).toBe(null);
		expect(detectInApp(UA.safariIOS)).toBe(null);
		expect(detectInApp(UA.whale)).toBe(null);
		expect(detectInApp(UA.desktop)).toBe(null);
	});
});

describe('openWay / externalUrl', () => {
	it('안드로이드는 intent 스킴으로 크롬을 띄우고, 없으면 원래 주소로 되돌린다', () => {
		const way = openWay('kakao', UA.kakaoAndroid);
		expect(way).toBe('android');
		const url = externalUrl(way, 'https://ddalkkak.app/play')!;
		expect(url).toContain('intent://ddalkkak.app/play#Intent;scheme=https;package=com.android.chrome;');
		// 크롬이 없는 기기에서 죽은 버튼이 되지 않도록 폴백을 붙인다
		expect(url).toContain('S.browser_fallback_url=https%3A%2F%2Fddalkkak.app%2Fplay');
		expect(url.endsWith(';end')).toBe(true);
	});
	it('iOS 카카오톡은 외부 브라우저 열기 스킴을 쓴다', () => {
		const way = openWay('kakao', UA.kakaoIOS);
		expect(way).toBe('kakao-ios');
		expect(externalUrl(way, 'https://ddalkkak.app/')).toBe(
			'kakaotalk://web/openExternal?url=https%3A%2F%2Fddalkkak.app%2F'
		);
	});
	it('iOS 기타 인앱은 열 수단이 없어 안내만 한다', () => {
		const way = openWay('instagram', UA.instagram);
		expect(way).toBe('manual');
		expect(externalUrl(way, 'https://ddalkkak.app/')).toBe(null);
	});
	it('isIOS 판별', () => {
		expect(isIOS(UA.kakaoIOS)).toBe(true);
		expect(isIOS(UA.kakaoAndroid)).toBe(false);
	});
});

describe('iOS 홈 화면 추가 안내', () => {
	const chromeIOS =
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1';
	const edgeIOS =
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/120.0.0.0 Mobile/15E148 Safari/604.1';

	it('크롬은 사파리로 오판하지 않는다 (UA에 Safari 문자열이 들어 있다)', () => {
		expect(iosBrowser(chromeIOS)).toBe('chrome');
		expect(iosBrowser(edgeIOS)).toBe('edge');
		expect(iosBrowser(UA.safariIOS)).toBe('safari');
	});

	it('공유 버튼 위치가 브라우저마다 다르게 안내된다', () => {
		expect(installSteps('iphone', 'safari')[0].text).toContain('화면 아래');
		// 크롬은 주소창 오른쪽. 하단 ⋯ 안의 'Chrome 공유'는 페이지가 아니라 앱 자체를
		// 공유하는 메뉴라, 그쪽으로 안내하면 앱스토어로 빠진다.
		expect(installSteps('iphone', 'chrome')[0].text).toContain('주소창 오른쪽');
		// 확인 못 한 브라우저는 위치를 단정하지 않는다
		for (const b of ['edge', 'firefox', 'other'] as const) {
			expect(installSteps('iphone', b)[0].text).not.toMatch(/아래|위쪽|오른쪽/);
		}
	});

	it('아이패드는 도구막대가 위에 있어 공유 버튼 안내가 다르다', () => {
		expect(installSteps('ipad', 'safari')[0].text).toContain('위쪽');
		expect(installSteps('ipad', 'safari')[0].text).not.toContain('아래');
	});

	it('안드로이드도 설치 버튼이 없을 때 쓸 수동 경로가 있다 (아무것도 안 뜨는 게 최악)', () => {
		const s = installSteps('android', 'other');
		expect(s.length).toBeGreaterThan(0);
		expect(s.at(-1)!.text).toContain('홈 화면에 추가');
	});

	it('각 단계 끝에는 홈 화면에 추가와 + 모양이 온다', () => {
		for (const p of ['iphone', 'ipad', 'android'] as const) {
			const last = installSteps(p, 'safari').at(-1)!;
			expect(last.icon).toBe('plus');
			expect(last.text).toContain('홈 화면에 추가');
		}
	});

	it('플랫폼 판별 — iPadOS 사파리는 UA를 Macintosh로 보낸다', () => {
		expect(platformOf(UA.safariIOS)).toBe('iphone');
		expect(platformOf(chromeIOS)).toBe('iphone');
		expect(platformOf(UA.chromeAndroid)).toBe('android');
		// 진짜 맥은 터치포인트 0, 아이패드는 5
		expect(platformOf(UA.desktop, 0)).toBe('desktop');
		expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 0)).toBe(
			'desktop'
		);
		expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 5)).toBe(
			'ipad'
		);
	});

	it('인앱 브라우저에는 홈 화면 추가를 권하지 않는다', () => {
		expect(isInAppUA(UA.safariIOS)).toBe(false);
		expect(isInAppUA(chromeIOS)).toBe(false);
		expect(isInAppUA(UA.kakaoIOS)).toBe(true);
		expect(isInAppUA(UA.instagram)).toBe(true);
	});
});
