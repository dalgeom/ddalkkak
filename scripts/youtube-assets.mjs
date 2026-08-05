/**
 * 유튜브 채널 자산을 만든다.
 *
 *   node scripts/youtube-assets.mjs
 *
 *   promo/youtube/프로필.png    800x800   채널 프로필 (원형으로 잘린다)
 *   promo/youtube/배너.png      2048x1152 채널 상단
 *   promo/youtube/워터마크.png  150x150   영상 오른쪽 아래 (배경 투명)
 *
 * 배너는 기기마다 보이는 범위가 다르다. TV는 2048x1152 전부, 데스크톱은
 * 2560x423 띠, 휴대폰은 가운데 1546x423 만 보인다. 그래서 글자는 전부
 * 가운데 1546x423 안에 넣고 바깥은 배경만 둔다.
 *
 * 전구와 심전도는 og-gen.mjs와 같은 좌표 수식(Bulb.svelte)을 쓴다.
 * 셋 중 하나만 고치면 로고가 따로 논다.
 */
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT_DIR = 'promo/youtube';

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
const EYES = [{ x: 125.5, y: 21 }, { x: 134.5, y: 21 }];

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
const D = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

/** 심전도가 전구를 관통하는 그림. 웃는 얼굴이 필라멘트로 그려진 정지 상태. */
const pulse = (id) => `
<svg viewBox="0 0 ${SW} ${SH}" width="100%" height="100%" style="overflow:visible">
  <defs>
    <linearGradient id="fade${id}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="white" stop-opacity="0"/>
      <stop offset=".12" stop-color="white" stop-opacity="1"/>
      <stop offset=".88" stop-color="white" stop-opacity="1"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <mask id="out${id}">
      <rect x="0" y="0" width="${SW}" height="${SH}" fill="url(#fade${id})"/>
      <circle cx="${CX}" cy="${CY}" r="18" fill="black"/>
    </mask>
    <mask id="in${id}"><circle cx="${CX}" cy="${CY}" r="13.5" fill="white"/></mask>
  </defs>
  <circle cx="${CX}" cy="${CY}" r="16" fill="${C.gold}"/>
  <g mask="url(#out${id})">
    <path d="${D}" fill="none" stroke="${C.accent}" stroke-width="2.4"
      stroke-linecap="round" stroke-linejoin="round"
      style="filter:drop-shadow(0 0 2px rgba(47,143,91,.9)) drop-shadow(0 0 6px rgba(58,255,98,.35))"/>
  </g>
  <g mask="url(#in${id})">
    <path d="${D}" fill="none" stroke="${C.text}" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  ${EYES.map((e) => `<circle cx="${e.x}" cy="${e.y}" r="1.7" fill="${C.text}"/>`).join('')}
  <circle cx="${CX}" cy="${CY}" r="16" fill="none" stroke="${C.text}" stroke-width="4"/>
  <rect x="${CX - 7}" y="${CY + 17}" width="14" height="6" rx="1.5" fill="${C.text}"/>
</svg>`;

/**
 * 웃는 전구 하나. 파형 없이. 프로필과 워터마크에 쓴다.
 *
 * 입은 유리 안쪽(r=13.5)으로 잘라낸다. Bulb.svelte가 마스크로 하는 일인데,
 * 빼먹었더니 입 끝이 전구 밖으로 삐져나와 깨져 보였다.
 * viewBox는 그림에 딱 맞춘 정사각형이라 원형으로 잘려도 가운데에 온다.
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

/* ═══════════ 세 장의 판 ═══════════ */

const PAGES = [
	{
		파일: '프로필.png',
		w: 800,
		h: 800,
		/* 원형으로 잘리므로 전구를 한가운데, 가장자리에 여유를 둔다.
		   글자는 넣지 않는다 — 작게 표시되면 뭉개지고, 원형 밖으로 잘린다. */
		html: `<div style="width:800px;height:800px;background:${C.bg};display:flex;
			align-items:center;justify-content:center">
			${face(470, 'p')}
		</div>`
	},
	{
		파일: '배너.png',
		w: 2048,
		h: 1152,
		/* 가운데 1546x423 안에만 글자를 둔다. 휴대폰에서 그 바깥은 잘린다. */
		html: `<div style="width:2048px;height:1152px;background:${C.bg};
			background-image:radial-gradient(${C.border} 2px, transparent 2px);
			background-size:34px 34px;display:flex;align-items:center;justify-content:center">
			<div style="width:1546px;height:423px;display:flex;align-items:center;
				gap:70px;padding:0 40px;box-sizing:border-box">
				<div style="flex:none">
					<div style="display:flex;align-items:center;gap:18px;margin-bottom:22px">
						${face(72, 'l')}
						<b style="font-size:62px;font-weight:800;color:${C.text};letter-spacing:-.03em">딸깍</b>
					</div>
					<div style="font-size:60px;font-weight:800;line-height:1.28;
						letter-spacing:-.035em;color:${C.text};white-space:nowrap">
						매일 두뇌를 깨우는<br><em style="font-style:normal;color:${C.accent}">10분의 딸깍</em>
					</div>
					<div style="margin-top:24px;font-size:27px;color:${C.muted};letter-spacing:-.02em">
						발견형 · 상식 퀴즈 · 성냥개비 · 전개도 &nbsp;·&nbsp; ddalkkak.app
					</div>
				</div>
				<div style="flex:1;min-width:0;margin-top:10px">${pulse('b')}</div>
			</div>
		</div>`
	},
	{
		파일: '워터마크.png',
		w: 150,
		h: 150,
		투명: true,
		/* 영상 위에 얹히므로 배경을 비운다. 어두운 화면에서도 보이게 흰 테를 두른다. */
		html: `<div style="width:150px;height:150px;display:flex;align-items:center;
			justify-content:center;background:transparent">
			<div style="filter:drop-shadow(0 0 5px rgba(255,255,255,.95))
				drop-shadow(0 0 12px rgba(255,255,255,.6))">${face(124, 'w')}</div>
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

const PORT = 9413;
const proc = spawn(bin, [
	'--headless=new', `--remote-debugging-port=${PORT}`,
	`--user-data-dir=${join(tmpdir(), `ddal-yt-${process.pid}`)}`,
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
			background:${p.투명 ? 'transparent' : C.bg}}</style></head><body>${p.html}</body></html>`;
		const tmp = join(tmpdir(), `ddal-yt-${process.pid}-${p.파일}.html`);
		writeFileSync(tmp, html, 'utf-8');

		await send('Emulation.setDeviceMetricsOverride', {
			width: p.w, height: p.h, deviceScaleFactor: 1, mobile: false
		});
		if (p.투명) await send('Emulation.setDefaultBackgroundColorOverride', {
			color: { r: 0, g: 0, b: 0, a: 0 }
		});
		await send('Page.navigate', { url: 'file:///' + tmp.replace(/\\/g, '/') });
		await sleep(2500);                                   // 웹폰트 도착 대기
		const { data } = await send('Page.captureScreenshot', { format: 'png' });
		const buf = Buffer.from(data, 'base64');
		writeFileSync(join(OUT_DIR, p.파일), buf);
		console.log(`  ${join(OUT_DIR, p.파일)} (${p.w}x${p.h}, ${Math.round(buf.length / 1024)}KB)`);
		if (p.투명) await send('Emulation.setDefaultBackgroundColorOverride');
		try { unlinkSync(tmp); } catch { /* 이미 없으면 그만 */ }
	}
} finally {
	ws?.close();
	proc.kill();
}
