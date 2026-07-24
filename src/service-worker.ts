/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />
import { build, files, prerendered, version } from '$service-worker';

// SvelteKit이 src/service-worker.ts를 자동 등록한다(kit.serviceWorker.register 기본 true).
// 전략: 해시 붙은 빌드 자산은 cache-first(불변), 그 외(네비게이션·SSR 홈/아카이브·prerender
// 페이지)는 network-first — 온라인이면 항상 최신을 받고, 오프라인일 때만 캐시로 폴백한다.
// 이렇게 해야 데일리 콘텐츠가 오래되어 보이는 staleness 없이 오프라인·설치를 지원한다.

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `ddalkkak-${version}`;
const PRECACHE = [...build, ...files, ...prerendered];
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
