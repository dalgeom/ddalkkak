/**
 * 스레드에 올릴 문제 카드 이미지를 만든다.
 *
 *   node scripts/social-card.mjs 2026-08-06
 *
 * 스레드는 텍스트 플랫폼인데도 이미지 글이 텍스트 글보다 참여가 2배 넘게 나온다
 * (이미지 4.55% / 텍스트 2.79%). 알고리즘이 체류 시간을 보는데 이미지가 그걸 늘린다.
 * 그래서 문제는 본문에 적지 말고 이 카드로 내보낸다.
 *
 * 앱 화면을 잘라 쓰지 않고 따로 그린다. 여백·글자 크기·잘림을 통제해야 하고,
 * 피드에서는 앱 UI(입력창·버튼)가 오히려 방해가 된다.
 * 색과 전구는 og-gen.mjs·youtube-assets.mjs와 같은 값을 쓴다.
 *
 * 새 날짜를 추가하려면 CARDS에 한 줄 넣으면 된다.
 * 문제 내용은 반드시 src/lib/problems.ts의 실제 문제와 맞춰야 한다.
 */
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT_DIR = 'promo/social';
const W = 1080;
const H = 1080;

/* ── 색: +layout.svelte의 토큰과 같은 값 ── */
const C = {
	bg: '#efe7d8',
	panel: '#fdfbf6',
	border: '#ddd0ba',
	text: '#2c2822',
	muted: '#6b6258',
	gold: '#f6d34e',
	chipBg: '#e7f3ec',
	chipText: '#2f8f5b',
	warn: '#c0632e'
};

/**
 * 날짜별 카드.
 *   chip   문제 은행의 chip 그대로
 *   물음   카드 제목. 문제 지문을 그대로 베끼지 말고 한 줄로 건다
 *   줄     예시들. 마지막 한 줄이 물음표 줄이고 주황으로 나온다
 *   id     src/lib/problems.ts의 문제 id — 나중에 대조할 수 있게 남긴다
 */
const CARDS = {
	'2026-08-06': {
		id: 'odd-even-branch',
		chip: '이상한 연산',
		물음: '★ 는 무슨 뜻일까요?',
		줄: ['9 ★ 6 = 15', '4 ★ 7 = 3', '15 ★ 8 = 23', '3 ★ 10 = 13', '12 ★ 5 = ?']
	}
};

/** 웃는 전구. youtube-assets.mjs와 같은 그림 — 입은 유리 안쪽으로 잘라낸다. */
const bulb = (size) => `
<svg viewBox="0 2 46 46" width="${size}" height="${size}">
  <defs><mask id="glass"><circle cx="23" cy="22" r="13.5" fill="white"/></mask></defs>
  <circle cx="23" cy="22" r="16" fill="${C.gold}"/>
  <g mask="url(#glass)">
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

function page(card) {
	// 줄이 많으면 글자를 줄여 카드 밖으로 넘치지 않게 한다
	const n = card.줄.length;
	const fs = n <= 4 ? 56 : n <= 5 ? 52 : n <= 6 ? 46 : 40;
	const gap = n <= 5 ? 20 : 15;
	const rows = card.줄
		.map((r, i) => `<div class="row${i === n - 1 ? ' q' : ''}">${r}</div>`)
		.join('');

	return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
 *{margin:0;padding:0;box-sizing:border-box}
 body{width:${W}px;height:${H}px;background:${C.bg};
   background-image:radial-gradient(${C.border} 2px, transparent 2px);background-size:30px 30px;
   font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;
   -webkit-font-smoothing:antialiased;display:flex;flex-direction:column;
   align-items:center;justify-content:center;gap:44px}
 .card{width:830px;background:${C.panel};border:1px solid ${C.border};
   border-radius:34px;padding:54px 60px 60px}
 .chip{display:inline-block;background:${C.chipBg};color:${C.chipText};
   font-size:27px;font-weight:700;padding:9px 20px;border-radius:12px;letter-spacing:-.02em}
 h1{margin-top:26px;font-size:47px;font-weight:800;color:${C.text};letter-spacing:-.03em}
 .box{margin-top:32px;background:${C.bg};border-radius:22px;padding:42px 0;
   display:flex;flex-direction:column;align-items:center;gap:${gap}px}
 .row{font-size:${fs}px;font-weight:600;color:${C.text};letter-spacing:.02em;white-space:pre}
 .row.q{color:${C.warn};font-weight:800}
 .foot{display:flex;align-items:center;gap:14px}
 .foot b{font-size:36px;font-weight:800;color:${C.text};letter-spacing:-.02em}
 .foot span{font-size:29px;color:${C.muted};letter-spacing:-.01em}
</style></head><body>
 <div class="card">
   <span class="chip">${card.chip}</span>
   <h1>${card.물음}</h1>
   <div class="box">${rows}</div>
 </div>
 <div class="foot">${bulb(44)}<b>딸깍</b><span>· 매일 두뇌 퍼즐 10문제 · ddalkkak.app</span></div>
</body></html>`;
}

/* ═══════════ 찍는다 ═══════════ */

const day = process.argv[2];
if (!day || !CARDS[day]) {
	console.error(`날짜를 주고 CARDS에 그 날짜가 있어야 한다. 지금 있는 것: ${Object.keys(CARDS).join(', ')}`);
	console.error('  node scripts/social-card.mjs 2026-08-06');
	process.exit(1);
}

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
	`--user-data-dir=${join(tmpdir(), `ddal-social-${process.pid}`)}`,
	'--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = join(tmpdir(), `ddal-social-${process.pid}.html`);
writeFileSync(tmp, page(CARDS[day]), 'utf-8');
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
					clearTimeout(to); ws.off('message', h);
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
	await send('Page.navigate', { url: 'file:///' + tmp.replace(/\\/g, '/') });
	await sleep(2500);                                   // 웹폰트 도착 대기
	const { data } = await send('Page.captureScreenshot', { format: 'png' });
	const buf = Buffer.from(data, 'base64');
	const out = join(OUT_DIR, `스레드-${day}.png`);
	writeFileSync(out, buf);
	console.log(`${out} (${W}x${H}, ${Math.round(buf.length / 1024)}KB)`);
} finally {
	ws?.close();
	proc.kill();
	try { unlinkSync(tmp); } catch { /* 이미 없으면 그만 */ }
}
