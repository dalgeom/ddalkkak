/**
 * 공유 카드(og-default.png)를 다시 만든다.
 *
 *   node scripts/og-gen.mjs
 *
 * 손으로 만든 PNG였던 탓에 전개도를 추가했을 때 카드만 "발견형·상식·성냥개비"로
 * 남아 있었다. 유형이 늘거나 문구가 바뀌면 이 스크립트를 다시 돌린다.
 *
 * 전구와 심전도 파형은 Bulb.svelte의 정지 상태(prefers-reduced-motion)와 같은
 * 좌표 수식을 쓴다. 둘 중 하나만 바꾸면 로고와 카드가 어긋난다.
 */
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = 'static/og-default.png';
const W = 1200;
const H = 630;

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

/* ── 심전도 경로: Bulb.svelte와 같은 수식 ── */
const SW = 260;
const SH = 66;
const CX = 130;
const CY = 26;
const BEAT = [
	[0, 0], [5, 0], [8, -5], [11, 0], [18, 0], [20, 3], [24, -24],
	[28, 16], [31, 0], [40, 0], [45, -8], [50, 0], [56, 0]
];
const BEATS = [0.1, 0.64];
const SCALES = [1, 0.9];
const SMILE = [
	[116.5, 26], [119.5, 25.3], [122, 26.3], [123.5, 28.5], [125.5, 30.5],
	[128, 31.8], [130, 32.1], [132, 31.8], [134.5, 30.5], [136.5, 28.5],
	[138, 26.3], [140.5, 25.3], [143.5, 26]
];
const EYES = [
	{ x: 125.5, y: 21 },
	{ x: 134.5, y: 21 }
];

const base = [[0, CY]];
for (let i = 0; i < BEATS.length; i++) {
	const x0 = BEATS[i] * SW;
	for (const [dx, dy] of BEAT) base.push([x0 + dx, CY + dy * SCALES[i]]);
}
const pts = [
	...base.filter(([x]) => x <= 114),
	...SMILE,
	[146, CY],
	...base.filter(([x]) => x >= 146),
	[SW, CY]
];
const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

const pulse = `
<svg viewBox="0 0 ${SW} ${SH}" width="100%" height="100%" style="overflow:visible">
  <defs>
    <linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="white" stop-opacity="0"/>
      <stop offset=".12" stop-color="white" stop-opacity="1"/>
      <stop offset=".88" stop-color="white" stop-opacity="1"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <mask id="out">
      <rect x="0" y="0" width="${SW}" height="${SH}" fill="url(#fade)"/>
      <circle cx="${CX}" cy="${CY}" r="18" fill="black"/>
    </mask>
    <mask id="in"><circle cx="${CX}" cy="${CY}" r="13.5" fill="white"/></mask>
  </defs>
  <circle cx="${CX}" cy="${CY}" r="16" fill="${C.gold}"/>
  <g mask="url(#out)">
    <path d="${d}" fill="none" stroke="${C.accent}" stroke-width="2.4"
      stroke-linecap="round" stroke-linejoin="round"
      style="filter:drop-shadow(0 0 2px rgba(47,143,91,.9)) drop-shadow(0 0 6px rgba(58,255,98,.35))"/>
  </g>
  <g mask="url(#in)">
    <path d="${d}" fill="none" stroke="${C.text}" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  ${EYES.map((e) => `<circle cx="${e.x}" cy="${e.y}" r="1.7" fill="${C.text}"/>`).join('')}
  <circle cx="${CX}" cy="${CY}" r="16" fill="none" stroke="${C.text}" stroke-width="4"/>
  <rect x="${CX - 7}" y="${CY + 17}" width="14" height="6" rx="1.5" fill="${C.text}"/>
</svg>`;

/** 로고 자리의 작은 전구 — 파형 없이 원과 소켓만 */
const mark = `
<svg viewBox="0 0 46 56" width="46" height="56">
  <circle cx="23" cy="22" r="16" fill="${C.gold}"/>
  <circle cx="23" cy="22" r="16" fill="none" stroke="${C.text}" stroke-width="4"/>
  <rect x="16" y="39" width="14" height="6" rx="1.5" fill="${C.text}"/>
</svg>`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${W}px;height:${H}px;background:${C.bg};
    background-image:radial-gradient(${C.border} 1.1px, transparent 1.1px);
    background-size:22px 22px;
    font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;
    -webkit-font-smoothing:antialiased}
  .panel{position:absolute;inset:40px;background:${C.panel};border-radius:30px;
    border:1px solid ${C.border};padding:62px 70px;display:flex;flex-direction:column}
  .logo{display:flex;align-items:center;gap:14px}
  .logo b{font-size:46px;font-weight:800;color:${C.text};letter-spacing:-.02em}
  .mid{flex:1;display:flex;align-items:center;gap:40px;margin-top:6px}
  h1{font-size:62px;font-weight:800;line-height:1.24;letter-spacing:-.035em;
    color:${C.text};white-space:nowrap}
  h1 em{font-style:normal;color:${C.accent}}
  .pulse{flex:1;min-width:0;margin-top:14px}
  .sub{font-size:25px;line-height:1.62;color:${C.muted};letter-spacing:-.02em}
  .sub b{color:${C.text};font-weight:700}
</style></head><body>
<div class="panel">
  <div class="logo">${mark}<b>딸깍</b></div>
  <div class="mid">
    <h1>매일 두뇌를 깨우는<br><em>10분의 딸깍</em></h1>
    <div class="pulse">${pulse}</div>
  </div>
  <div class="sub">
    하루 <b>10문제</b> — 발견형 퍼즐 · 상식 퀴즈 · 성냥개비 · 전개도<br>
    매일 자정, 모두가 같은 문제로.
  </div>
</div></body></html>`;

/* ── 헤드리스 브라우저로 찍는다 ── */
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

const htmlPath = join(tmpdir(), `ddal-og-${process.pid}.html`);
writeFileSync(htmlPath, html, 'utf-8');

const PORT = 9411;
const proc = spawn(bin, [
	'--headless=new',
	`--remote-debugging-port=${PORT}`,
	`--user-data-dir=${join(tmpdir(), `ddal-og-prof-${process.pid}`)}`,
	'--no-first-run',
	'--disable-gpu',
	'--hide-scrollbars',
	'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
		w.on('open', () => res(w));
		w.on('error', rej);
	});
	let id = 0;
	const send = (m, p = {}) =>
		new Promise((res, rej) => {
			const mid = ++id;
			const to = setTimeout(() => rej(new Error('timeout ' + m)), 30000);
			const h = (raw) => {
				const x = JSON.parse(raw);
				if (x.id === mid) {
					clearTimeout(to);
					ws.off('message', h);
					x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result);
				}
			};
			ws.on('message', h);
			ws.send(JSON.stringify({ id: mid, method: m, params: p }));
		});

	await send('Page.enable');
	await send('Emulation.setDeviceMetricsOverride', {
		width: W, height: H, deviceScaleFactor: 1, mobile: false
	});
	await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') });
	await sleep(2500); // 웹폰트 도착 대기
	const { data } = await send('Page.captureScreenshot', { format: 'png' });
	writeFileSync(OUT, Buffer.from(data, 'base64'));
	console.log(`${OUT} 생성 (${W}x${H}, ${Math.round(Buffer.from(data, 'base64').length / 1024)}KB)`);
} finally {
	ws?.close();
	proc.kill();
	try { unlinkSync(htmlPath); } catch { /* 이미 없으면 그만 */ }
}
