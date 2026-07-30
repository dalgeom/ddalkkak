/**
 * 인앱 브라우저(카카오톡·인스타 등) 감지.
 *
 * 왜 필요한가: 인앱 브라우저는 앱마다 독립된 WebView라 localStorage가 기기의 Chrome/Safari와
 * 완전히 분리된다. 그래서 ①카톡으로 공유한 링크를 자기가 눌러도 "안 푼 상태"로 보이고,
 * ②거기서 플레이하면 연속 기록이 그 WebView에 갇힌 뒤 앱이 데이터를 비우면 사라진다.
 * 서버 계정 없이 이걸 줄이는 유일한 방법은 기본 브라우저로 넘기는 것이다.
 */

export type InApp = 'kakao' | 'instagram' | 'facebook' | 'line' | 'naver' | 'daum' | null;

export function detectInApp(ua: string): InApp {
	const s = ua.toLowerCase();
	if (s.includes('kakaotalk')) return 'kakao';
	if (s.includes('instagram')) return 'instagram';
	if (s.includes('fban') || s.includes('fbav')) return 'facebook';
	if (s.includes('line/')) return 'line';
	// 네이버 앱은 'NAVER(inapp; ...' 형태. 'whale'(네이버 웨일 브라우저)은 정식 브라우저라 제외한다.
	if (s.includes('naver(inapp') || s.includes('naver ')) return 'naver';
	if (s.includes('daumapps')) return 'daum';
	return null;
}

export const isIOS = (ua: string) => /iphone|ipad|ipod/i.test(ua);

export const APP_LABEL: Record<Exclude<InApp, null>, string> = {
	kakao: '카카오톡',
	instagram: '인스타그램',
	facebook: '페이스북',
	line: '라인',
	naver: '네이버 앱',
	daum: '다음 앱'
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
		// intent 스킴에는 scheme을 뺀 주소를 넣는다
		const bare = href.replace(/^https?:\/\//, '');
		return `intent://${bare}#Intent;scheme=https;package=com.android.chrome;end`;
	}
	if (way === 'kakao-ios') return `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`;
	return null;
}
