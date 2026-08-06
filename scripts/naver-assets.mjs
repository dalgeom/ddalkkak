/**
 * 네이버 블로그 자산을 만든다.
 *
 *   node scripts/naver-assets.mjs
 *
 *   promo/naver/프로필.png  800x800    가로 161px 썸네일로 줄어든다
 *   promo/naver/커버.png    1200x1600  모바일앱 커버
 *
 * 커버는 기기 해상도에 맞춰 잘린다. 어느 쪽이 잘릴지 정해져 있지 않아서
 * 글자는 전부 가운데 세로 900px 안에 넣고, 바깥은 배경 무늬만 둔다.
 * 위아래가 잘려도 가운데는 남는다.
 *
 * 전구는 og-gen.mjs, youtube-assets.mjs와 같은 좌표 수식(Bulb.svelte)을 쓴다.
 * 넷 중 하나만 고치면 로고가 따로 논다.
 */
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT_DIR = 'promo/naver';

/* ── 색: +layout.svelte의 토큰과 같은 값 ── */
const C = {
	bg: '#efe7d8',
	panel: '#fdfbf6',
	border: '#ddd0ba',
	text: '#2c2822',
	muted: '#6b6258',
	accent: '#2f8f5b',
	gold: '#f6d34e'
};

/**
 * 웃는 전구 하나. youtube-assets.mjs의 face()와 같다.
 *
 * 입은 유리 안쪽(r=13.5)으로 잘라낸다. 안 그러면 입 끝이 전구 밖으로 삐져나온다.
 */
const face = (size, id = 'f') => `
<svg viewBox="0 2 46 46" width="${size}" height="${size}">
  <defs><mask id="glass${id}"><circle cx="23" cy="22" r="13.5" fill="white"/></mask></defs>
  <circle cx="23" cy="22" r="16" fill="${C.gold}"/>
  <g mask="url(#glass${id})">
    <path d="M 13 22 Q 15.2 21.4 17.1 22.3 Q 18.2 24.1 19.7 25.8 Q 21.5 26.9 23 27.2
             Q 24.5 26.9 26.3 25.8 Q 27.8 24.1 28.9 22.3 Q 30.8 21.4 33 22"
          fill="none" stroke="${C.text}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <circle cx="18.5" cy="17" r="1.9" fill="${C.text}"/>
  <circle cx="27.5" cy="17" r="1.9" fill="${C.text}"/>
  <circle cx="23" cy="22" r="16" fill="none" stroke="${C.text}" stroke-width="4"/>
  <rect x="16" y="39" width="14" height="6" rx="1.5" fill="${C.text}"/>
</svg>`;

const FONT = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">`;
const FAMILY = `'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif`;

/** 배경 무늬. 배너와 같은 점 격자. */
const DOTS = `background:${C.bg};
	background-image:radial-gradient(${C.border} 2px, transparent 2px);
	background-size:34px 34px`;

/* ═══════════ 두 장의 판 ═══════════ */

const PAGES = [
	{
		파일: '프로필.png',
		w: 800,
		h: 800,
		/* 161px으로 줄어들므로 글자는 넣지 않는다 — 뭉개진다.
		   별명이 프로필 옆에 항상 같이 나와서 글자를 넣을 이유도 없다. */
		html: `<div style="width:800px;height:800px;${DOTS};display:flex;
			align-items:center;justify-content:center">
			${face(470, 'p')}
		</div>`
	},
	{
		파일: '커버.png',
		w: 1200,
		h: 1600,
		/* 글자는 가운데 900px 안에만. 위아래는 잘려도 되는 여백이다. */
		html: `<div style="width:1200px;height:1600px;${DOTS};display:flex;
			align-items:center;justify-content:center">
			<div style="width:1200px;height:900px;display:flex;flex-direction:column;
				align-items:center;justify-content:center;text-align:center;
				padding:0 80px;box-sizing:border-box">

				${face(240, 'c')}

				<div style="margin-top:34px;font-size:132px;font-weight:800;
					letter-spacing:-.05em;color:${C.text};line-height:1">딸깍</div>

				<div style="margin-top:38px;font-size:52px;font-weight:700;
					letter-spacing:-.035em;color:${C.text};line-height:1.4">
					매일 두뇌를 깨우는<br>
					<em style="font-style:normal;color:${C.accent}">10분의 딸깍</em>
				</div>

				<div style="margin-top:46px;width:220px;height:3px;background:${C.border}"></div>

				<div style="margin-top:46px;font-size:34px;font-weight:600;line-height:1.7;
					letter-spacing:-.02em;color:${C.muted}">
					발견형 퍼즐 · 상식 퀴즈<br>성냥개비 · 전개도
				</div>

				<div style="margin-top:54px;font-size:38px;font-weight:800;
					letter-spacing:-.01em;color:${C.text};
					border-bottom:6px solid ${C.gold};padding-bottom:4px">
					ddalkkak.app
				</div>
			</div>
		</div>`
	}
];

/* ═══════════ 찍는다 ═══════════ */

const CANDIDATES = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium'
];
const bin = CANDIDATES.find((p) => existsSync(p));
if (!bin) {
	console.error('크롬 계열 브라우저를 못 찾았다. CANDIDATES에 경로를 추가해라.');
	process.exit(1);
}

const PORT = 9415;
const proc = spawn(bin, [
	'--headless=new', `--remote-debugging-port=${PORT}`,
	`--user-data-dir=${join(tmpdir(), `ddal-nv-${process.pid}`)}`,
	'--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT_DIR, { recursive: true });
let ws;
try {
	let target = null;
	for (let i = 0; i < 40; i++) {
		try {
			const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
			target = list.find((t) => t.type === 'page');
			if (target) break;
		} catch { /* 아직 안 떴다 */ }
		await sleep(500);
	}
	if (!target) throw new Error('브라우저가 안 떴다');

	const { WebSocket } = await import('ws');
	ws = await new Promise((res, rej) => {
		const w = new WebSocket(target.webSocketDebuggerUrl);
		w.on('open', () => res(w)); w.on('error', rej);
	});
	let id = 0;
	const send = (m, p = {}) =>
		new Promise((res, rej) => {
			const mid = ++id;
			const to = setTimeout(() => rej(new Error('timeout ' + m)), 30000);
			const h = (raw) => {
				const x = JSON.parse(raw);
				if (x.id === mid) {
					clearTimeout(to); ws.off('message', h);
					x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result);
				}
			};
			ws.on('message', h);
			ws.send(JSON.stringify({ id: mid, method: m, params: p }));
		});
	await send('Page.enable');

	for (const p of PAGES) {
		const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">${FONT}
			<style>*{margin:0;padding:0;box-sizing:border-box}
			body{font-family:${FAMILY};-webkit-font-smoothing:antialiased;
			background:${C.bg}}</style></head><body>${p.html}</body></html>`;
		const tmp = join(tmpdir(), `ddal-nv-${process.pid}-${p.파일}.html`);
		writeFileSync(tmp, html, 'utf-8');

		await send('Emulation.setDeviceMetricsOverride', {
			width: p.w, height: p.h, deviceScaleFactor: 1, mobile: false
		});
		await send('Page.navigate', { url: 'file:///' + tmp.replace(/\\/g, '/') });
		await sleep(2500);                                   // 웹폰트 도착 대기
		const { data } = await send('Page.captureScreenshot', { format: 'png' });
		const buf = Buffer.from(data, 'base64');
		writeFileSync(join(OUT_DIR, p.파일), buf);
		console.log(`  ${join(OUT_DIR, p.파일)} (${p.w}x${p.h}, ${Math.round(buf.length / 1024)}KB)`);
		try { unlinkSync(tmp); } catch { /* 이미 없으면 그만 */ }
	}
} finally {
	ws?.close();
	proc.kill();
}
