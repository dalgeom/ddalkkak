/**
 * 인앱 브라우저(카카오톡·인스타 등) 감지.
 *
 * 왜 필요한가: 인앱 브라우저는 앱마다 독립된 WebView라 localStorage가 기기의 Chrome/Safari와
 * 완전히 분리된다. 그래서 ①카톡으로 공유한 링크를 자기가 눌러도 "안 푼 상태"로 보이고,
 * ②거기서 플레이하면 연속 기록이 그 WebView에 갇힌 뒤 앱이 데이터를 비우면 사라진다.
 * 서버 계정 없이 이걸 줄이는 유일한 방법은 기본 브라우저로 넘기는 것이다.
 */

export type InApp =
	| 'kakao'
	| 'instagram'
	| 'threads'
	| 'facebook'
	| 'line'
	| 'naver'
	| 'daum'
	| 'other'
	| null;

export function detectInApp(ua: string): InApp {
	const s = ua.toLowerCase();
	if (s.includes('kakaotalk')) return 'kakao';
	if (s.includes('instagram')) return 'instagram';
	// 스레드는 메타 내부 코드명 barcelona로 나오는 경우가 있다. 이름을 아예 안 붙이기도 해서
	// 여기서 놓치면 아래 isBareWebView가 받는다.
	if (s.includes('barcelona') || s.includes('threads')) return 'threads';
	if (s.includes('fban') || s.includes('fbav')) return 'facebook';
	if (s.includes('line/')) return 'line';
	// 네이버 앱은 'NAVER(inapp; ...' 형태. 'whale'(네이버 웨일 브라우저)은 정식 브라우저라 제외한다.
	if (s.includes('naver(inapp') || s.includes('naver ')) return 'naver';
	if (s.includes('daumapps')) return 'daum';
	return isBareWebView(ua) ? 'other' : null;
}

/**
 * 앱 이름을 UA에 안 남기는 인앱 브라우저를 구조로 잡는다.
 *
 * 스레드가 그랬다. 이름 목록만 늘려서는 새 앱이 나올 때마다 구멍이 다시 생긴다.
 * WebView라는 사실 자체가 localStorage가 분리된다는 뜻이므로 그걸 본다.
 *
 * android — WebView는 UA에 '; wv'를 붙인다. 정식 브라우저에는 없다.
 *           크롬 커스텀탭은 이 표시가 없는데, 그쪽은 크롬과 저장소를 공유하므로 잡을 이유도 없다.
 * ios     — WKWebView에는 'Version/'이 없다. 사파리에는 항상 있다.
 *           크롬(CriOS)·엣지(EdgiOS)·파이어폭스(FxiOS)·오페라(OPiOS)도 Version/이 없는
 *           정식 브라우저라 먼저 빼준다.
 *
 * 주의: 홈 화면에 설치한 PWA도 iOS에서는 UA가 WKWebView와 같다.
 *       그건 UA로 못 가르므로 InAppGate에서 display-mode로 걸러낸다.
 */
function isBareWebView(ua: string): boolean {
	const s = ua.toLowerCase();
	if (s.includes('android')) return /;\s*wv[);]/.test(s);
	if (!isIOS(ua)) return false;
	if (/crios|fxios|edgios|opios|whale/.test(s)) return false;
	return !s.includes('version/');
}

export const isIOS = (ua: string) => /iphone|ipad|ipod/i.test(ua);

export const APP_LABEL: Record<Exclude<InApp, null>, string> = {
	kakao: '카카오톡',
	instagram: '인스타그램',
	threads: '스레드',
	facebook: '페이스북',
	line: '라인',
	naver: '네이버 앱',
	daum: '다음 앱',
	other: '다른 앱'
};

/**
 * 기본 브라우저로 여는 방법. 플랫폼별로 가능한 수단이 다르다.
 * - android: intent 스킴으로 Chrome을 직접 띄울 수 있다
 * - kakao-ios: 카카오톡이 제공하는 외부 브라우저 열기 스킴을 쓴다
 * - manual: iOS의 다른 인앱은 프로그램으로 못 열어서 안내만 한다
 */
export type OpenWay = 'android' | 'kakao-ios' | 'manual';

export function openWay(app: Exclude<InApp, null>, ua: string): OpenWay {
	if (!isIOS(ua)) return 'android';
	return app === 'kakao' ? 'kakao-ios' : 'manual';
}

/** 기본 브라우저로 여는 URL(없으면 null — 안내만 한다) */
export function externalUrl(way: OpenWay, href: string): string | null {
	if (way === 'android') {
		// intent 스킴에는 scheme을 뺀 주소를 넣는다.
		// browser_fallback_url을 붙여 크롬이 없는 기기에서도 죽은 버튼이 되지 않게 한다.
		const bare = href.replace(/^https?:\/\//, '');
		return (
			`intent://${bare}#Intent;scheme=https;package=com.android.chrome;` +
			`S.browser_fallback_url=${encodeURIComponent(href)};end`
		);
	}
	if (way === 'kakao-ios') return `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`;
	return null;
}

/**
 * 버튼으로 못 여는 경우(iOS의 카카오톡 외 인앱)의 수동 경로.
 * 앱마다 메뉴 위치가 달라 아는 것만 구체적으로 적고, 나머지는 일반적으로 안내한다.
 */
export function manualSteps(app: Exclude<InApp, null>): string[] {
	// 스레드는 오른쪽 위 동그란 ⋯ 안에 '외부 브라우저에서 열기'가 그대로 있다(실기기 확인).
	if (app === 'threads' || app === 'instagram' || app === 'facebook')
		return ['오른쪽 위 ⋯ 누르기', '외부 브라우저에서 열기'];
	if (app === 'line') return ['오른쪽 아래 메뉴 누르기', '다른 앱으로 열기'];
	// 어느 앱인지 모를 때. 국내 앱들은 메뉴 항목 이름이 대체로 '외부 브라우저에서 열기'다.
	if (app === 'other') return ['메뉴(⋯) 열기', '외부 브라우저에서 열기'];
	return ['메뉴 열기', 'Safari로 열기'];
}
