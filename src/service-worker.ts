/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />
import { build, files, prerendered, version } from '$service-worker';

// SvelteKit이 src/service-worker.ts를 자동 등록한다(kit.serviceWorker.register 기본 true).
// 전략: 해시 붙은 빌드 자산은 cache-first(불변), 그 외(네비게이션·SSR 홈/아카이브·prerender
// 페이지)는 network-first — 온라인이면 항상 최신을 받고, 오프라인일 때만 캐시로 폴백한다.
// 이렇게 해야 데일리 콘텐츠가 오래되어 보이는 staleness 없이 오프라인·설치를 지원한다.

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `ddalkkak-${version}`;
/**
 * 프리캐시는 해시 자산(build)만.
 *
 * 예전에는 [...build, ...files, ...prerendered]였다 — 첫 방문마다 192파일 1.50MB를
 * 받고, 배포가 있을 때마다(14일에 50번) 캐시 이름이 바뀌어 통째로 다시 받았다.
 * addAll은 원자적이라 그중 하나만 실패해도 설치가 통째로 무산되고, 그러면 알림
 * 구독도 못 만든다.
 *
 * prerendered·files를 빼도 오프라인은 그대로 된다 — 아래 fetch 핸들러가
 * network-first로 방문한 페이지를 런타임 캐시에 넣기 때문이다. 안 가 본 페이지가
 * 오프라인에서 안 열리는 것은 원래도 마찬가지였다(캐시에 있어도 network-first라
 * 새 내용을 받으러 가고, 실패해야 캐시를 쓴다).
 */
const PRECACHE = [...build];
const HASHED = new Set(build); // content-hash가 붙어 불변인 자산만

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

/* ───────── 알림 ─────────
 * 매일 아침 "오늘 문제가 나왔다"를 알린다. 본문은 발송 쪽에서 만들어 보내고,
 * 못 읽었을 때를 대비해 기본 문구를 둔다. tag를 고정해 두면 며칠 못 본 알림이
 * 쌓이지 않고 마지막 것 하나로 갈린다.
 */
sw.addEventListener('push', (event) => {
	let data: { title?: string; body?: string; url?: string } = {};
	try {
		data = event.data?.json() ?? {};
	} catch {
		/* 형식이 어긋나면 기본 문구로 */
	}
	event.waitUntil(
		sw.registration.showNotification(data.title ?? '딸깍', {
			body: data.body ?? '오늘의 10문제가 나왔어요.',
			icon: '/icon-192.png',
			badge: '/icon-192.png',
			tag: 'ddal-daily',
			data: { url: data.url ?? '/' }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = new URL(event.notification.data?.url ?? '/', location.origin).href;
	event.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
			// 이미 열어둔 탭이 있으면 새 창을 띄우지 않고 그걸 앞으로 가져온다
			for (const c of list) {
				if (c.url.startsWith(location.origin) && 'focus' in c) return c.focus();
			}
			return sw.clients.openWindow(url);
		})
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;

	const url = new URL(req.url);
	if (url.origin !== location.origin) return; // 외부(폰트 CDN 등)는 브라우저 기본 처리

	// 불변 빌드 자산: cache-first
	if (HASHED.has(url.pathname)) {
		event.respondWith(caches.match(req).then((cached) => cached ?? fetch(req)));
		return;
	}

	// 그 외: network-first, 실패 시 캐시, 그래도 없으면 홈으로 폴백
	event.respondWith(
		fetch(req)
			.then((res) => {
				if (res.ok && res.type === 'basic') {
					const copy = res.clone();
					caches.open(CACHE).then((cache) => cache.put(req, copy));
				}
				return res;
			})
			.catch(async () => (await caches.match(req)) ?? (await caches.match('/')) ?? Response.error())
	);
});
