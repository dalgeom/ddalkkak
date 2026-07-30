import { describe, it, expect } from 'vitest';
import { detectInApp, isIOS, openWay, externalUrl } from './inapp';
import { iosBrowser, iosInstallSteps, isIOSInstallable } from './pwa';

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
	it('안드로이드는 intent 스킴으로 크롬을 띄운다', () => {
		const way = openWay('kakao', UA.kakaoAndroid);
		expect(way).toBe('android');
		expect(externalUrl(way, 'https://ddalkkak.app/play')).toBe(
			'intent://ddalkkak.app/play#Intent;scheme=https;package=com.android.chrome;end'
		);
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
		expect(iosInstallSteps('safari')[0]).toContain('화면 아래');
		expect(iosInstallSteps('chrome')[0]).toContain('오른쪽 아래');
		expect(iosInstallSteps('chrome')).toContain('공유');
	});

	it('인앱 브라우저에는 홈 화면 추가를 권하지 않는다', () => {
		expect(isIOSInstallable(UA.safariIOS)).toBe(true);
		expect(isIOSInstallable(chromeIOS)).toBe(true);
		expect(isIOSInstallable(UA.kakaoIOS)).toBe(false);
		expect(isIOSInstallable(UA.chromeAndroid)).toBe(false);
	});
});
