// 딸깍 점검(npm run qa)용 헤드리스 크롬. GA·광고는 이름 풀이에서 막고, 우리 서버 기록(/api/stat·/api/push·/api/msolve)은 가짜 204로 가로챈다.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(new URL('../../package.json', import.meta.url));
/** 스크린샷 · 결과 · 브라우저 프로필 — C 드라이브가 늘 모자라 E에 둔다 */
export const OUT = (process.env.QA_TMP || 'E:/tmp/ddal-qa').split('\\').join('/').replace(/\/?$/, '/');
mkdirSync(OUT, { recursive: true });
const { WebSocket } = require('ws');

export const BASE = process.env.QA_BASE || 'https://ddalkkak.app';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(tag) {
	const BIN = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
	if (!BIN) throw new Error('크롬 계열 브라우저를 못 찾았다');
	const PORT = 9300 + Math.floor(Math.random() * 600);
	const prof = join(OUT, 'prof-' + tag + '-' + Date.now());
	mkdirSync(prof, { recursive: true });
	const block = ['www.googletagmanager.com', '*.google-analytics.com', '*.analytics.google.com', '*.googlesyndication.com', '*.doubleclick.net', '*.googleadservices.com', 'adservice.google.com', '*.adtrafficquality.google', 'fundingchoicesmessages.google.com']
		.map((h) => `MAP ${h} 0.0.0.0`).join(', ');
	const proc = spawn(BIN, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu',
		`--host-resolver-rules=${block}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
	let target = null;
	for (let i = 0; i < 40 && !target; i++) {
		try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* 아직 */ }
		if (!target) await sleep(400);
	}
	if (!target) throw new Error('브라우저가 안 떴다');
	const ws = await new Promise((res, rej) => { const w = new WebSocket(target.webSocketDebuggerUrl); w.on('open', () => res(w)); w.on('error', rej); });
	let id = 0;
	const waiters = new Map();
	const listeners = [];
	ws.on('message', (raw) => {
		const x = JSON.parse(raw);
		if (x.id && waiters.has(x.id)) { const w = waiters.get(x.id); waiters.delete(x.id); x.error ? w.rej(new Error(JSON.stringify(x.error))) : w.res(x.result); return; }
		for (const l of listeners) l(x);
	});
	const send = (method, params = {}, ms = 30000) => new Promise((res, rej) => {
		const mid = ++id;
		const to = setTimeout(() => { waiters.delete(mid); rej(new Error('timeout ' + method)); }, ms);
		waiters.set(mid, { res: (v) => { clearTimeout(to); res(v); }, rej: (e) => { clearTimeout(to); rej(e); } });
		ws.send(JSON.stringify({ id: mid, method, params }));
	});
	const errors = [];
	let label = '';
	const IGN = /googletagmanager|google-analytics|googlesyndication|doubleclick|adsbygoogle|ERR_NAME_NOT_RESOLVED|ERR_ADDRESS_INVALID|ERR_CONNECTION_REFUSED|adtrafficquality|fundingchoices/;
	listeners.push((x) => {
		if (x.method === 'Runtime.exceptionThrown') {
			const d = x.params.exceptionDetails;
			const t = (d.exception?.description || d.text || '').split('\n')[0];
			if (!IGN.test(t + (d.url || ''))) errors.push(`[${label}] 예외: ${t}`);
		}
		if (x.method === 'Runtime.consoleAPICalled' && x.params.type === 'error') {
			const t = x.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200);
			if (!IGN.test(t)) errors.push(`[${label}] console.error: ${t}`);
		}
		if (x.method === 'Log.entryAdded' && x.params.entry.level === 'error') {
			const t = x.params.entry.text + ' ' + (x.params.entry.url || '');
			if (!IGN.test(t)) errors.push(`[${label}] 로그: ${t.slice(0, 200)}`);
		}
		if (x.method === 'Network.responseReceived') {
			const r = x.params.response;
			if (r.status >= 400 && r.url.startsWith(BASE)) errors.push(`[${label}] HTTP ${r.status} ${r.url.replace(BASE, '')}`);
		}
		if (x.method === 'Fetch.requestPaused') {
			const u = x.params.request.url;
			stats.push(`${x.params.request.method} ${u.replace(BASE, '')}`);
			send('Fetch.fulfillRequest', { requestId: x.params.requestId, responseCode: 204, responseHeaders: [{ name: 'access-control-allow-origin', value: '*' }] }).catch(() => {});
		}
	});
	const stats = [];
	await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
	await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/stat*' }, { urlPattern: '*/api/push*' }, { urlPattern: '*/api/msolve*' }] });
	const api = {
		send, errors, stats,
		setLabel: (l) => (label = l),
		async viewport(w, h = 844, mobile = true) {
			await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
			await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
		},
		async go(path, wait = 1800) {
			label = path;
			const loaded = new Promise((res) => { const l = (x) => { if (x.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(l), 1); res(); } }; listeners.push(l); setTimeout(res, 15000); });
			await send('Page.navigate', { url: /^(https?|file):/.test(path) ? path : BASE + path });
			await loaded;
			await sleep(wait);
		},
		async ev(expr) {
			const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, returnByValue: true, awaitPromise: true }, 60000);
			if (r.exceptionDetails) throw new Error('평가 오류: ' + String(r.exceptionDetails.exception?.description).slice(0, 300));
			return r.result.value;
		},
		async shot(file) {
			const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 50 });
			const { writeFileSync } = await import('node:fs');
			writeFileSync(file, Buffer.from(r.data, 'base64'));
		},
		async close() {
			try { ws.close(); } catch { /* */ }
			proc.kill();
			await sleep(400);
			try { rmSync(prof, { recursive: true, force: true }); } catch { /* 크롬이 아직 잡고 있으면 다음에 */ }
		}
	};
	return api;
}
