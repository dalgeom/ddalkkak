import { writable } from 'svelte/store';

/**
 * 홈 화면 추가(PWA 설치) 지원.
 *
 * 왜 중요한가: 설치하지 않으면 다음 날 다시 오려면 브라우저를 열고 주소를 기억해
 * 직접 쳐야 한다. 사실상 재방문이 없다는 뜻이라, 설치가 데일리 서비스의 생명줄이다.
 *
 * 안내 문구는 실기기에서 확인된 것만 위치를 단정한다 — 틀린 위치를 가리키면
 * 사용자가 아예 못 찾아서, 안내가 없느니만 못하다(실제로 겪었다).
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

/** 인앱 브라우저는 홈 화면 추가 자체가 안 된다(그쪽은 InAppGate가 맡는다) */
export function isInAppUA(ua: string): boolean {
	return /kakaotalk|instagram|fban|fbav|line\/|naver|daumapps/i.test(ua);
}

export type Platform = 'iphone' | 'ipad' | 'android' | 'desktop';

export function platformOf(ua: string, maxTouchPoints = 0): Platform {
	if (/iphone|ipod/i.test(ua)) return 'iphone';
	if (/ipad/i.test(ua)) return 'ipad';
	// iPadOS 13+ 사파리는 UA를 Macintosh로 보낸다 — 진짜 맥은 터치포인트가 0이라 이걸로 가른다
	if (/macintosh/i.test(ua) && maxTouchPoints > 1) return 'ipad';
	if (/android/i.test(ua)) return 'android';
	return 'desktop';
}

export type IOSBrowser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'other';

export function iosBrowser(ua: string): IOSBrowser {
	if (/crios/i.test(ua)) return 'chrome';
	if (/fxios/i.test(ua)) return 'firefox';
	if (/edgios/i.test(ua)) return 'edge';
	if (/safari/i.test(ua)) return 'safari';
	return 'other';
}

/** 단계에 붙는 버튼 모양 — 글로만 쓰면 사용자가 못 찾는다 */
export type Step = { icon: 'share' | 'dots' | 'plus' | null; text: string };

/**
 * 수동 설치 경로. 버튼(beforeinstallprompt)이 없는 환경에서 쓴다.
 * 위치를 단정하는 건 확인된 것뿐이고, 나머지는 일부러 뭉뚱그린다.
 */
export function installSteps(p: Platform, b: IOSBrowser): Step[] {
	const add: Step = { icon: 'plus', text: '홈 화면에 추가를 선택하세요' };

	if (p === 'iphone') {
		if (b === 'safari') return [{ icon: 'share', text: '화면 아래 이 버튼을 누르고' }, add];
		// 크롬은 주소창 오른쪽. 아래쪽 ⋯ 안의 'Chrome 공유'는 페이지가 아니라 앱 자체를
		// 공유하는 메뉴라, 그리로 안내하면 앱스토어로 빠진다(실제로 겪었다).
		if (b === 'chrome') return [{ icon: 'share', text: '주소창 오른쪽 이 버튼을 누르고' }, add];
		return [{ icon: 'share', text: '브라우저의 공유 버튼을 누르고' }, add];
	}

	// 아이패드는 도구막대가 위에 있어 공유 버튼도 화면 위쪽이다
	if (p === 'ipad') return [{ icon: 'share', text: '화면 위쪽 공유 버튼을 누르고' }, add];

	// 안드로이드에서 설치 버튼이 뜨지 않는 브라우저(파이어폭스 등)를 위한 수동 경로.
	// 메뉴 위치가 제각각이라 위치는 단정하지 않는다.
	if (p === 'android')
		return [
			{ icon: 'dots', text: '브라우저 메뉴를 열고' },
			{ icon: 'plus', text: "'홈 화면에 추가' 또는 '앱 설치'를 선택하세요" }
		];

	return [];
}

/** 공유 시트·메뉴에서 항목이 첫 화면에 안 보이는 경우가 많다 */
export const INSTALL_NOTE =
	"'홈 화면에 추가'가 안 보이면 목록을 아래로 내리거나 '더 보기'를 누르세요.";

/* ───────── 재노출 정책 ─────────
 * 한 번 닫으면 영영 안 뜨게 두면, 첫날엔 관심 없다가 며칠 뒤 습관이 붙은 사람을
 * 놓친다. 반대로 매번 띄우면 성가시다. 최대 3번, 2일 간격으로 다시 권한다.
 */
const KEY = 'ddal.install.dismiss';
const MAX_SHOWS = 3;
const GAP_DAYS = 2;

type Dismiss = { n: number; at: number };

function readDismiss(): Dismiss {
	if (typeof localStorage === 'undefined') return { n: 0, at: 0 };
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
		if (raw && typeof raw.n === 'number' && typeof raw.at === 'number') return raw;
	} catch {
		/* 무시 */
	}
	return { n: 0, at: 0 };
}

/** 오늘(dayNum) 기준으로 설치 권유를 보여줄 때인가 */
export function shouldOfferInstall(dayNum: number): boolean {
	if (isStandalone()) return false;
	const d = readDismiss();
	if (d.n >= MAX_SHOWS) return false;
	return dayNum - d.at >= GAP_DAYS;
}

export function noteInstallDismissed(dayNum: number): void {
	if (typeof localStorage === 'undefined') return;
	const d = readDismiss();
	try {
		localStorage.setItem(KEY, JSON.stringify({ n: d.n + 1, at: dayNum }));
	} catch {
		/* 무시 */
	}
}

/** 설치했거나 더 볼 필요 없을 때 — 다시 묻지 않는다 */
export function stopOfferingInstall(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify({ n: MAX_SHOWS, at: 0 }));
	} catch {
		/* 무시 */
	}
}
