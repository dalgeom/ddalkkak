/**
 * 네이버 블로그 '성냥개비 푸는 법' 글에 넣을 그림을 만든다.
 *
 *   node scripts/naver-match-images.mjs
 *
 *   promo/naver/성냥-예시1.png  0 - 1 = 8 → 9 - 1 = 8  (한 숫자 안)
 *   promo/naver/성냥-예시2.png  0 + 1 = 8 → 8 + 1 = 9  (숫자끼리)
 *   promo/naver/성냥-예시3.png  0 + 2 = 6 → 8 - 2 = 6  (연산자)
 *   promo/naver/성냥-숫자표.png 한 획 차이 숫자표
 *
 * 보드는 scene-matchstick.mjs와 같은 좌표·색(MatchstickBoard.svelte 이식).
 * 문제 보드는 그대로, 정답 보드는 옮겨 온 성냥만 주황으로 칠해
 * 어디가 움직였는지 그림만 보고 알 수 있게 한다.
 */
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT_DIR = 'promo/naver';

const C = {
	bg: '#efe7d8', panel: '#fdfbf6', border: '#ddd0ba',
	text: '#2c2822', muted: '#6b6258', accent: '#2f8f5b',
	gold: '#f6d34e', chipBg: '#e7f3ec', chipText: '#2f8f5b', warn: '#c0632e'
};

/* ── MatchstickBoard.svelte와 같은 좌표계 ── */
const SEG_RECT = {
	a: [10, 0, 34, 8], b: [46, 9, 8, 34], c: [46, 51, 8, 34], d: [10, 87, 34, 8],
	e: [0, 51, 8, 34], f: [0, 9, 8, 34], g: [10, 43.5, 34, 8]
};
const DIGIT_SEGS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
const GW = 54, GAP = 14, OPW = 42, EQW = 36;

/**
 * 등식 하나를 SVG로. eq는 '8 - 2 = 6' 꼴.
 * orange: 주황으로 칠할 자리 목록 — 'g0-g'(첫 숫자의 g획) | 'op'(연산자 세로획)
 */
function boardSvg(eq, orange = []) {
	const m = eq.match(/^(\d) ([+-]) (\d) = (\d)$/);
	const digits = [Number(m[1]), Number(m[3]), Number(m[4])];
	const plus = m[2] === '+';
	const X0 = 0, OPX = X0 + GW + GAP, X1 = OPX + OPW + GAP, EQX = X1 + GW + GAP, X2 = EQX + EQW + GAP;
	const XS = [X0, X1, X2];
	const BW = X2 + GW;

	const seg = (gi, s) => {
		const on = DIGIT_SEGS[digits[gi]].includes(s);
		const [rx, ry, rw, rh] = SEG_RECT[s];
		const cls = orange.includes(`g${gi}-${s}`) && on ? 'org' : on ? 'lit' : 'ghost';
		return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="3" class="${cls}"/>`;
	};
	const glyph = (gi) =>
		`<g transform="translate(${XS[gi]} 0)">${Object.keys(SEG_RECT).map((s) => seg(gi, s)).join('')}</g>`;

	return `<svg viewBox="-4 -4 ${BW + 8} 103" width="100%" height="auto">
		${glyph(0)}
		<g transform="translate(${OPX} 0)">
			<rect x="4" y="43.5" width="34" height="8" rx="3" class="fixed"/>
			${plus ? `<rect x="17" y="30" width="8" height="35" rx="3" class="${orange.includes('op') ? 'org' : 'lit'}"/>` : ''}
		</g>
		${glyph(1)}
		<g transform="translate(${EQX} 0)">
			<rect x="1" y="37" width="30" height="7" rx="3" class="fixed"/>
			<rect x="1" y="51" width="30" height="7" rx="3" class="fixed"/>
		</g>
		${glyph(2)}
	</svg>`;
}

/** 문제 → 정답 두 보드를 세로로 쌓은 카드 한 장 */
const pair = (title, from, to, orange, note) => ({
	w: 1200, h: 1310,
	html: `<div class="wrap">
		<div class="head">${title}</div>
		<div class="stage">
			<span class="tag">문제</span>
			<div class="board">${boardSvg(from)}</div>
		</div>
		<div class="arrow">↓ 성냥 하나를 옮기면</div>
		<div class="stage">
			<span class="tag ok">정답</span>
			<div class="board">${boardSvg(to, orange)}</div>
		</div>
		<div class="note">${note}</div>
	</div>`
});

const PAGES = [
	{
		파일: '성냥-예시1.png',
		...pair('한 숫자 안에서 해결', '0 - 1 = 8', '9 - 1 = 8', ['g0-g'],
			'0의 왼쪽 아래 획을 뽑아 가운데(주황)에 놓으면 9. 성냥이 그 숫자 밖으로 나가지 않았습니다.')
	},
	{
		파일: '성냥-예시2.png',
		...pair('숫자끼리 주고받기', '0 + 1 = 8', '8 + 1 = 9', ['g0-g'],
			'8이 왼쪽 아래 획을 내주고 9가 되고, 그 성냥이 0의 가운데(주황)로 들어가 8이 됩니다.')
	},
	{
		파일: '성냥-예시3.png',
		...pair('연산자를 의심하라', '0 + 2 = 6', '8 - 2 = 6', ['g0-g'],
			'+의 세로 획을 뽑으면 −가 되고, 그 성냥이 0의 가운데(주황)로 들어가 8이 됩니다.')
	},
	{
		파일: '성냥-숫자표.png',
		w: 1200, h: 940,
		html: `<div class="wrap">
			<div class="head">한 획 차이로 바뀌는 숫자</div>
			${[
				['획 하나를 <b>더하면</b>', ['0 → 8', '1 → 7', '3 → 9', '5 → 6', '5 → 9', '6 → 8', '9 → 8']],
				['획 하나를 <b>빼면</b>', ['6 → 5', '7 → 1', '8 → 0', '8 → 6', '8 → 9', '9 → 3', '9 → 5']],
				['제 획을 <b>옮기면</b>', ['0 ↔ 6', '0 ↔ 9', '2 ↔ 3', '3 ↔ 5', '6 ↔ 9']]
			].map(([t, ps]) => `<div class="sec">
				<div class="st">${t}</div>
				<div class="pills">${ps.map((p) => `<span class="pill">${p}</span>`).join('')}</div>
			</div>`).join('')}
			<div class="note">이 표만 알면 성냥개비 문제의 절반은 풀립니다.</div>
		</div>`
	}
];

const FONT = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">`;

const page = (p) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">${FONT}
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${p.w}px;height:${p.h}px;background:${C.bg};
  background-image:radial-gradient(${C.border} 2px,transparent 2px);background-size:32px 32px;
  font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;
  -webkit-font-smoothing:antialiased;display:flex;align-items:center;justify-content:center}
.wrap{width:1080px;background:${C.panel};border:1px solid ${C.border};border-radius:36px;
  padding:56px 64px;display:flex;flex-direction:column;gap:28px}
.head{font-size:46px;font-weight:800;color:${C.text};letter-spacing:-.03em}
.stage{display:flex;flex-direction:column;gap:14px}
.tag{align-self:flex-start;font-size:24px;font-weight:800;color:${C.muted};
  background:${C.bg};border:2px solid ${C.border};border-radius:10px;padding:6px 16px}
.tag.ok{color:#1f6b41;background:${C.chipBg};border-color:${C.accent}}
.board{background:#0a0d0a;border-radius:22px;padding:44px 60px}
.lit{fill:#3aff62;filter:drop-shadow(0 0 4px rgba(58,255,98,.7))}
.org{fill:#ffb020;filter:drop-shadow(0 0 6px rgba(255,176,32,.9))}
.ghost{fill:#17231a;stroke:#223528;stroke-width:1}
.fixed{fill:#ffd24a}
.arrow{text-align:center;font-size:30px;font-weight:700;color:${C.warn};letter-spacing:-.02em}
.note{font-size:28px;line-height:1.6;color:${C.muted};letter-spacing:-.02em;word-break:keep-all}
.sec{display:flex;flex-direction:column;gap:14px}
.st{font-size:32px;font-weight:700;color:${C.text}}
.st b{color:${C.accent}}
.pills{display:flex;flex-wrap:wrap;gap:10px}
.pill{font-size:30px;font-weight:700;color:${C.text};background:${C.bg};
  border:2px solid ${C.border};border-radius:12px;padding:10px 20px;
  font-variant-numeric:tabular-nums}
</style></head><body>${p.html}</body></html>`;

/* ═══════════ 찍는다 ═══════════ */

const BIN = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/usr/bin/google-chrome', '/usr/bin/chromium'
].find((p) => existsSync(p));
if (!BIN) { console.error('크롬 계열 브라우저를 못 찾았다.'); process.exit(1); }

const PORT = 9419;
const proc = spawn(BIN, ['--headless=new', `--remote-debugging-port=${PORT}`,
	`--user-data-dir=${join(tmpdir(), `ddal-nvm-${process.pid}`)}`,
	'--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT_DIR, { recursive: true });
let ws;
try {
	let target = null;
	for (let i = 0; i < 40; i++) {
		try {
			const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
			target = l.find((t) => t.type === 'page');
			if (target) break;
		} catch { /* 아직 */ }
		await sleep(500);
	}
	if (!target) throw new Error('브라우저가 안 떴다');
	const { WebSocket } = await import('ws');
	ws = await new Promise((res, rej) => {
		const w = new WebSocket(target.webSocketDebuggerUrl);
		w.on('open', () => res(w)); w.on('error', rej);
	});
	let id = 0;
	const send = (m, p = {}) => new Promise((res, rej) => {
		const mid = ++id;
		const to = setTimeout(() => rej(new Error('timeout ' + m)), 30000);
		const h = (raw) => { const x = JSON.parse(raw);
			if (x.id === mid) { clearTimeout(to); ws.off('message', h); x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result); } };
		ws.on('message', h);
		ws.send(JSON.stringify({ id: mid, method: m, params: p }));
	});
	await send('Page.enable');

	for (const p of PAGES) {
		const tmp = join(tmpdir(), `ddal-nvm-${process.pid}-${p.파일}.html`);
		writeFileSync(tmp, page(p), 'utf-8');
		await send('Emulation.setDeviceMetricsOverride', {
			width: p.w, height: p.h, deviceScaleFactor: 1, mobile: false
		});
		await send('Page.navigate', { url: 'file:///' + tmp.replace(/\\/g, '/') });
		await sleep(2500);                                   // 웹폰트 대기
		const { data } = await send('Page.captureScreenshot', { format: 'png' });
		const buf = Buffer.from(data, 'base64');
		writeFileSync(join(OUT_DIR, p.파일), buf);
		console.log(`  ${join(OUT_DIR, p.파일)} (${p.w}x${p.h}, ${Math.round(buf.length / 1024)}KB)`);
		try { unlinkSync(tmp); } catch { /* 이미 없으면 그만 */ }
	}
} finally {
	ws?.close(); proc.kill();
}
