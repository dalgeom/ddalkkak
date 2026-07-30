import { writable } from 'svelte/store';

/**
 * 홈 화면 추가(PWA 설치) 지원.
 *
 * 왜 필요한가: 웹에는 '기기 저장소'가 없다. 브라우저마다 격리된 샌드박스를 쓰기 때문에
 * 같은 폰이라도 크롬·사파리·인앱 브라우저의 기록이 서로 안 보인다. 홈 화면에 추가해 두면
 * 매번 같은 자리로 들어오게 돼서, 적어도 기록이 흩어지는 일은 크게 줄어든다.
 * (안드로이드는 설치본이 크롬과 저장소를 공유해 기존 기록이 그대로 이어진다.
 *  iOS는 홈 화면 앱이 사파리와 별도 저장소라 설치 시점부터 새로 쌓인다.)
 */

/** 크롬 계열이 설치 가능 시점에 주는 이벤트 — 기본 배너를 막고 우리가 원하는 때 띄운다 */
type InstallEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const installEvent = writable<InstallEvent | null>(null);

export function captureInstallPrompt(): void {
	if (typeof window === 'undefined') return;
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		installEvent.set(e as InstallEvent);
	});
	window.addEventListener('appinstalled', () => installEvent.set(null));
}

/** 이미 설치본으로 실행 중이면 권유할 이유가 없다 */
export function isStandalone(): boolean {
	if (typeof window === 'undefined') return false;
	if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
	return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * iOS는 설치 API가 없어 사용자가 직접 공유 메뉴를 눌러야 한다 — 안내만 할 수 있다.
 * 인앱 브라우저는 홈 화면 추가 자체가 안 되므로 제외한다(그쪽은 InAppNotice가 맡는다).
 */
export function isIOSInstallable(ua: string): boolean {
	const ios = /iphone|ipad|ipod/i.test(ua);
	const inApp = /kakaotalk|instagram|fban|fbav|line\/|naver|daumapps/i.test(ua);
	return ios && !inApp;
}

/**
 * iOS 브라우저 종류. 공유 버튼 위치가 서로 달라서 안내 문구를 갈라야 한다
 * (사파리는 화면 아래, 크롬은 오른쪽 아래 ⋯ 안에 있다).
 */
export type IOSBrowser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'other';

export function iosBrowser(ua: string): IOSBrowser {
	if (/crios/i.test(ua)) return 'chrome';
	if (/fxios/i.test(ua)) return 'firefox';
	if (/edgios/i.test(ua)) return 'edge';
	if (/safari/i.test(ua)) return 'safari';
	return 'other';
}

/** 브라우저별 '홈 화면에 추가'까지 가는 경로 */
export function iosInstallSteps(b: IOSBrowser): string[] {
	if (b === 'safari') return ['화면 아래 공유 버튼', '홈 화면에 추가'];
	if (b === 'chrome') return ['오른쪽 아래 ⋯', '공유', '홈 화면에 추가'];
	if (b === 'edge') return ['아래 가운데 ⋯', '공유', '홈 화면에 추가'];
	if (b === 'firefox') return ['오른쪽 아래 ⋯', '공유', '홈 화면에 추가'];
	return ['브라우저 메뉴에서 공유', '홈 화면에 추가'];
}
