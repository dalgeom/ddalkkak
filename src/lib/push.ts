/**
 * 알림 구독.
 *
 * 지금까지 오늘 푼 사람에게 "내일 또 오세요"라고 말할 방법이 하나도 없었다.
 * 23일간 502명이 왔는데 44명만 돌아왔다(8.8%). 데일리 퍼즐에서 이건 치명적이다.
 *
 * 권한을 언제 묻느냐가 이 기능의 거의 전부다. 브라우저 알림 권한은 한 번 거부당하면
 * 사이트 쪽에서 되살릴 방법이 없다 — 사용자가 직접 설정에서 풀어야 한다. 그래서
 * 첫 화면에서 묻지 않고, 10문제를 다 푼 직후(재미를 방금 느꼈고 연속 기록이 눈앞에
 * 있는 순간)에만 묻는다.
 */

import { isStandalone, platformOf } from './pwa';

/** VAPID 공개키. 이름 그대로 공개용이라 소스에 두어도 된다 — 비밀키만 서버에 있다. */
export const VAPID_PUBLIC_KEY =
	'BBdagXd4yXNvE8XkMT6l890JJ4zGb21tZWUkB3lGP9zUrmYEzCs2aX3lR628fRrDZK5X1gZY86Cpd1JXLxMszms';

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied';

/** base64url로 온 VAPID 키를 applicationServerKey가 받는 바이트 배열로 */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
	const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
		.replace(/-/g, '+')
		.replace(/_/g, '/');
	const raw = atob(padded);
	const out = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
	return out;
}

export function pushSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window
	);
}

export function pushState(): PushState {
	if (!pushSupported()) return 'unsupported';
	return Notification.permission as PushState;
}

/* ───────── 재노출 정책 ─────────
 * 설치 권유와 같은 뼈대지만 한 가지가 다르다. 브라우저에서 '차단'을 누른 사람에게는
 * 두 번 다시 묻지 않는다 — 물어봐야 창조차 뜨지 않고, 성가심만 남는다.
 */
const KEY = 'ddal.push.dismiss';
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

/**
 * 오늘(dayNum) 기준으로 알림을 권할 때인가.
 *
 * iOS는 홈 화면에 추가하지 않으면 푸시 자체가 불가능하다. 그 경우 여기서는 물러나고
 * 설치 권유가 대신 뜬다 — 한 화면에서 둘 다 조르면 둘 다 무시당한다.
 */
/** 알림 권유를 못 거는 이유. 걸 수 있으면 null. */
export type PushSkip =
	| null
	| 'unsupported'
	| 'granted'
	| 'denied'
	| 'ios-browser'
	| 'max-shows'
	| 'gap';

/**
 * 왜 안 뜨는지를 낸다. shouldOfferPush는 이걸 감싼 것이라 둘이 갈라질 수 없다.
 *
 * 이유를 따로 내는 까닭: 완주자의 34%가 알림도 설치도 못 보고 지나가는데
 * (8/19~9/1 완주 35명 중 제안 노출 23명) 어느 조건에서 걸렸는지 기록이 없었다.
 * iOS 브라우저라 못 거는 것과, 이미 거부해서 안 거는 것은 뜻이 전혀 다르다.
 */
export function pushSkipReason(dayNum: number, ua = '', touch = 0): PushSkip {
	if (!pushSupported()) return 'unsupported';
	const state = pushState();
	if (state === 'granted') return 'granted';
	if (state === 'denied') return 'denied';

	const platform = platformOf(ua || navigator.userAgent, touch || navigator.maxTouchPoints || 0);
	if ((platform === 'iphone' || platform === 'ipad') && !isStandalone()) return 'ios-browser';

	const d = readDismiss();
	if (d.n >= MAX_SHOWS) return 'max-shows';
	if (dayNum - d.at < GAP_DAYS) return 'gap';
	return null;
}

export function shouldOfferPush(dayNum: number, ua = '', touch = 0): boolean {
	return pushSkipReason(dayNum, ua, touch) === null;
}

export function notePushDismissed(dayNum: number): void {
	if (typeof localStorage === 'undefined') return;
	const d = readDismiss();
	try {
		localStorage.setItem(KEY, JSON.stringify({ n: d.n + 1, at: dayNum }));
	} catch {
		/* 무시 */
	}
}

/** 구독했거나 차단당했을 때 — 다시 묻지 않는다 */
export function stopOfferingPush(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify({ n: MAX_SHOWS, at: 0 }));
	} catch {
		/* 무시 */
	}
}

/**
 * 권한을 묻고 구독을 서버에 등록한다.
 * 어느 단계에서 실패하든 게임에는 영향이 없어야 하므로 예외를 밖으로 던지지 않는다.
 */
export async function enablePush(): Promise<PushState> {
	if (!pushSupported()) return 'unsupported';
	try {
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') return permission as PushState;

		const reg = await navigator.serviceWorker.ready;
		const sub =
			(await reg.pushManager.getSubscription()) ??
			(await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
			}));

		await fetch('/api/push', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(sub.toJSON())
		});
		return 'granted';
	} catch {
		return 'default';
	}
}
