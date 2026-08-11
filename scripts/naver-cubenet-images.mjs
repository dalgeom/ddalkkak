/**
 * 네이버 블로그 '전개도 접는 법' 글에 넣을 그림을 만든다.
 *
 *   node scripts/naver-cubenet-images.mjs
 *
 *   promo/naver/전개도-마주보는면.png  십자 전개도에 마주보는 세 쌍 표시
 *   promo/naver/전개도-거울상.png      정답 주사위와 거울상 나란히
 *   promo/naver/전개도-문제.png        실제 문제(전개도 + 보기 4개)
 *
 * 전개도·주사위 그림은 scene-cubenet.mjs와 같은 이식(FaceMark/CubeDie/
 * CubeNetFigure.svelte 좌표)이고, 문제는 사이트의 problemAt(42) 덤프다.
 */
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT_DIR = 'promo/naver';

const C = {
	bg: '#efe7d8', panel: '#fdfbf6', panel2: '#f1ece0', border: '#ddd0ba',
	text: '#2c2822', muted: '#6b6258', accent: '#2f8f5b', gold: '#f6d34e',
	chipBg: '#e7f3ec', warn: '#c0632e'
};

/* ── problemAt(42) 덤프 (scene-cubenet.mjs와 동일) ── */
const 문제 = {
	cells: [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3], [2, 2]],
	faceOf: [4, 0, 2, 3, 5, 1],
	options: [[0, 3, 4], [0, 4, 5], [0, 5, 4], [2, 5, 4]],
	answer: 2,
	opposites: [[4, 3], [2, 5], [1, 0]]
};
const NAMES = ['초록 원', '주황 고리', '파랑 사각', '보라 테두리', '빨강 십자', '회색 네점'];

/* ── FaceMark 이식 ── */
const FACE_COLOR = ['#2f8f5b', '#c0632e', '#2f6f9f', '#8a4fa8', '#c93b3b', '#6b6258'];
const FACE_SHAPE = ['disc', 'ring', 'square', 'frame', 'plus', 'dots'];
function mark(face) {
	const col = FACE_COLOR[face], R = 0.26;
	switch (FACE_SHAPE[face]) {
		case 'disc': return `<circle cx="0.5" cy="0.5" r="${R}" fill="${col}"/>`;
		case 'ring': return `<circle cx="0.5" cy="0.5" r="${R - 0.045}" fill="none" stroke="${col}" stroke-width="0.11"/>`;
		case 'square': return `<rect x="${0.5 - R}" y="${0.5 - R}" width="${R * 2}" height="${R * 2}" rx="0.04" fill="${col}"/>`;
		case 'frame': return `<rect x="${0.5 - R + 0.055}" y="${0.5 - R + 0.055}" width="${(R - 0.055) * 2}" height="${(R - 0.055) * 2}" rx="0.03" fill="none" stroke="${col}" stroke-width="0.11"/>`;
		case 'plus': return `<path d="M0.5,${0.5 - R} V${0.5 + R} M${0.5 - R},0.5 H${0.5 + R}" stroke="${col}" stroke-width="0.15" stroke-linecap="round" fill="none"/>`;
		default: {
			const o = R * 0.72;
			return [[0.5 - o, 0.5 - o], [0.5 + o, 0.5 - o], [0.5 - o, 0.5 + o], [0.5 + o, 0.5 + o]]
				.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="0.095" fill="${col}"/>`).join('');
		}
	}
}

/** 전개도. pairColors가 있으면 마주보는 쌍마다 같은 색 테두리를 두른다. */
function netSvg(size = 100, pairColors = null) {
	const cols = 4, rows = 3, pad = 8;
	const w = cols * size + pad * 2, h = rows * size + pad * 2;
	const PAIR_STROKE = ['#c93b3b', '#2f6f9f', '#2f8f5b'];
	const strokeOf = (i) => {
		if (!pairColors) return null;
		const face = 문제.faceOf[i];
		const pi = 문제.opposites.findIndex(([a, b]) => a === face || b === face);
		return pi >= 0 ? PAIR_STROKE[pi] : null;
	};
	const cells = 문제.cells.map(([r, c], i) => {
		const st = strokeOf(i);
		return `
		<g transform="translate(${pad + c * size},${pad + r * size})">
			<rect width="${size}" height="${size}" fill="${C.panel}" stroke="${C.border}" stroke-width="2"/>
			${st ? `<rect x="4" y="4" width="${size - 8}" height="${size - 8}" fill="none" stroke="${st}" stroke-width="5" rx="8"/>` : ''}
			<g transform="scale(${size})">${mark(문제.faceOf[i])}</g>
		</g>`;
	}).join('');
	return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${cells}</svg>`;
}

/* ── CubeDie 이식 ── */
function dieSvg(view, size = 170) {
	const w = size * 0.5, h = w * 0.5, d = size * 0.56, pad = 4;
	const top = `${w},0 ${2 * w},${h} ${w},${2 * h} 0,${h}`;
	const left = `0,${h} ${w},${2 * h} ${w},${2 * h + d} 0,${h + d}`;
	const right = `${w},${2 * h} ${2 * w},${h} ${2 * w},${h + d} ${w},${2 * h + d}`;
	const place = (cx, cy, m) => `translate(${cx - m / 2},${cy - m / 2}) scale(${m})`;
	return `<svg viewBox="${-pad} ${-pad} ${2 * w + pad * 2} ${2 * h + d + pad * 2}" width="${2 * w + pad * 2}">
		<polygon points="${top}" fill="${C.panel}" stroke="${C.border}" stroke-width="1.5"/>
		<polygon points="${left}" fill="${C.panel2}" stroke="${C.border}" stroke-width="1.5"/>
		<polygon points="${right}" fill="${C.panel}" stroke="${C.border}" stroke-width="1.5"/>
		<g transform="${place(w, h, w * 0.66)}">${mark(view[0])}</g>
		<g transform="${place(w * 0.5, 1.5 * h + d * 0.5, w * 0.74)}">${mark(view[1])}</g>
		<g transform="${place(w * 1.5, 1.5 * h + d * 0.5, w * 0.74)}">${mark(view[2])}</g>
	</svg>`;
}

const LETTERS = ['A', 'B', 'C', 'D'];

const PAGES = [
	{
		파일: '전개도-문제.png',
		w: 1200, h: 1290,
		html: `<div class="wrap">
			<div class="head">이 전개도를 접으면 어떤 주사위가 될까?</div>
			<div class="netbox">${netSvg(92)}</div>
			<div class="grid">
				${문제.options.map((v, i) => `
					<div class="opt"><span class="badge">${LETTERS[i]}</span>${dieSvg(v, 150)}</div>`).join('')}
			</div>
			<div class="note">딸깍의 전개도 문제 그대로입니다. 정답은 글 끝에.</div>
		</div>`
	},
	{
		파일: '전개도-마주보는면.png',
		w: 1200, h: 900,
		html: `<div class="wrap">
			<div class="head">먼저 마주보는 세 쌍부터 찾는다</div>
			<div class="netbox">${netSvg(92, true)}</div>
			<div class="note">같은 색 테두리끼리 마주봅니다 — ${문제.opposites
				.map(([a, b]) => `${NAMES[a]}↔${NAMES[b]}`).join(', ')}.<br>
				일직선 세 칸의 양 끝(파랑 사각↔회색 네점)처럼 <b>한 칸 건너</b>가 기본이고,<br>꺾인 자리는 접는 길을 한 칸씩 따라가면 짝이 나옵니다.</div>
		</div>`
	},
	{
		파일: '전개도-거울상.png',
		w: 1200, h: 860,
		html: `<div class="wrap">
			<div class="head">구성이 같아도 방향이 다르면 다른 주사위</div>
			<div class="pair">
				<div class="side"><span class="tag ok">정답</span>${dieSvg(문제.options[2], 210)}</div>
				<div class="vs">vs</div>
				<div class="side"><span class="tag no">거울상</span>${dieSvg(문제.options[1], 210)}</div>
			</div>
			<div class="note">세 면의 무늬는 똑같은데 <b>왼쪽·오른쪽이 뒤바뀌어</b> 있습니다.<br>
				왼손 장갑과 오른손 장갑처럼, 아무리 돌려도 서로가 될 수 없습니다.</div>
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
  padding:52px 60px;display:flex;flex-direction:column;gap:26px;align-items:center}
.head{font-size:44px;font-weight:800;color:${C.text};letter-spacing:-.03em;text-align:center}
.netbox{background:${C.bg};border-radius:22px;padding:26px 60px;display:flex;justify-content:center}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%}
.opt{display:flex;align-items:center;justify-content:center;gap:18px;background:${C.bg};
  border:2px solid ${C.border};border-radius:18px;padding:18px}
.badge{width:52px;height:52px;border-radius:50%;background:${C.panel};border:2px solid ${C.border};
  color:${C.muted};font-size:26px;font-weight:800;display:flex;align-items:center;justify-content:center}
.pair{display:flex;align-items:center;gap:28px}
.side{display:flex;flex-direction:column;align-items:center;gap:14px;background:${C.bg};
  border:2px solid ${C.border};border-radius:20px;padding:26px 40px}
.tag{font-size:24px;font-weight:800;border-radius:10px;padding:6px 18px}
.tag.ok{color:#1f6b41;background:${C.chipBg};border:2px solid ${C.accent}}
.tag.no{color:${C.warn};background:#f7e9df;border:2px solid ${C.warn}}
.vs{font-size:34px;font-weight:800;color:${C.muted}}
.note{font-size:28px;line-height:1.65;color:${C.muted};letter-spacing:-.02em;text-align:center;word-break:keep-all}
.note b{color:${C.text}}
</style></head><body>${p.html}</body></html>`;

/* ═══════════ 찍는다 ═══════════ */

const BIN = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/usr/bin/google-chrome', '/usr/bin/chromium'
].find((p) => existsSync(p));
if (!BIN) { console.error('크롬 계열 브라우저를 못 찾았다.'); process.exit(1); }

const PORT = 9425;
const proc = spawn(BIN, ['--headless=new', `--remote-debugging-port=${PORT}`,
	`--user-data-dir=${join(tmpdir(), `ddal-nvc-${process.pid}`)}`,
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
		const tmp = join(tmpdir(), `ddal-nvc-${process.pid}-${p.파일}.html`);
		writeFileSync(tmp, page(p), 'utf-8');
		await send('Emulation.setDeviceMetricsOverride', {
			width: p.w, height: p.h, deviceScaleFactor: 1, mobile: false
		});
		await send('Page.navigate', { url: 'file:///' + tmp.replace(/\\/g, '/') });
		await sleep(2500);
		const { data } = await send('Page.captureScreenshot', { format: 'png' });
		const buf = Buffer.from(data, 'base64');
		writeFileSync(join(OUT_DIR, p.파일), buf);
		console.log(`  ${join(OUT_DIR, p.파일)} (${p.w}x${p.h}, ${Math.round(buf.length / 1024)}KB)`);
		try { unlinkSync(tmp); } catch { /* 이미 없으면 그만 */ }
	}
} finally {
	ws?.close(); proc.kill();
}
