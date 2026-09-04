/**
 * 전개도 쇼츠 — 화면 전체를 CSS 애니메이션으로 만들고 프레임 단위로 찍는다.
 *
 *   node scripts/scene-cubenet.mjs
 *
 * 기존 쇼츠-전개도.mp4는 "어떤 주사위가 될까?"라고 묻고는 보기 A~D를
 * 화면에 보여주지 않는 불량품이었다. 여기서는 보기 4개(주사위 그림)가
 * 카운트다운 동안 떠 있고, 공개 때 오답 셋은 가라앉고 정답이 튀어오른다.
 *
 * 문제는 사이트의 problemAt(42) 덤프를 그대로 쓴다 — 전개도는 거울상
 * 사고 전력이 있는 유형이라 절대 재구현하지 않는다. 그림도
 * CubeNetFigure/CubeDie/FaceMark.svelte의 좌표·모양을 그대로 옮겼다.
 *
 * CSS 애니메이션을 전부 멈춰 두고 Web Animations API로 currentTime을
 * 직접 밀어 한 프레임씩 찍는다. 몇 번을 돌려도 같은 영상이 나온다.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const W = 1080, H = 1920, FPS = 30;

/* ── 타임라인(초). 소리와 맞춰야 한다 ── */
const T = {
	net: 0.7,                        // 전개도 등장
	choices: [1.15, 1.35, 1.55, 1.75], // 보기 A~D
	tickFrom: 2.4,                   // 카운트다운 시작
	reveal: 5.9,                     // 정답 공개
	rule: 6.9,                       // 해설
	brand: 8.6,                      // 주소
	total: 12.1
};

const C = {
	bg: '#efe7d8', panel: '#fdfbf6', panel2: '#f1ece0', border: '#ddd0ba',
	text: '#2c2822', muted: '#6b6258', accent: '#2f8f5b',
	gold: '#f6d34e', chipBg: '#e7f3ec', chipText: '#2f8f5b', warn: '#c0632e'
};

/* ── 문제: src/lib/cubenet.ts problemAt(26) 덤프 (dump-cubenet.mjs로 재생성) ──
   오답 구조: C·D는 마주 보는 면이 함께 보이고(네점↔테두리, 고리↔사각, 십자↔원),
   B는 정답 A의 왼·오가 뒤바뀐 거울상이다. */
const 문제 = {
	번호: 26,
	cells: [[0,0],[1,0],[1,1],[1,2],[2,2],[2,3]],
	faceOf: [5,1,0,2,3,4],
	options: [[0,5,1],[0,1,5],[0,2,1],[3,5,1]],
	answer: 0,
	해설: '<b>C와 D</b>는 마주 보는 면이 함께 보여서, <b>B</b>는<br>정답의 왼쪽·오른쪽이 뒤바뀐 <b>거울상</b>이라 안 됩니다.'
};
const OUT = `promo/video/쇼츠-전개도-${문제.번호}.mp4`;
const LETTERS = ['A', 'B', 'C', 'D'];

/* ── FaceMark.svelte 이식: 면 기호를 0~1 상자에 그린다 ── */
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

/* ── CubeNetFigure.svelte 이식 ── */
function netSvg(size = 100) {
	const cols = 4, rows = 3, pad = 6;
	const w = cols * size + pad * 2, h = rows * size + pad * 2;
	const cells = 문제.cells.map(([r, c], i) => `
		<g transform="translate(${pad + c * size},${pad + r * size})">
			<rect width="${size}" height="${size}" fill="${C.panel}" stroke="${C.border}" stroke-width="2"/>
			<g transform="scale(${size})">${mark(문제.faceOf[i])}</g>
		</g>`).join('');
	return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">${cells}</svg>`;
}

/* ── CubeDie.svelte 이식: view = [윗면, 왼면, 오른면] ── */
function dieSvg(view, size = 160) {
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

const bulb = (s) => `
<svg viewBox="0 2 46 46" width="${s}" height="${s}">
  <defs><mask id="gl2"><circle cx="23" cy="22" r="13.5" fill="white"/></mask></defs>
  <circle cx="23" cy="22" r="16" fill="${C.gold}"/>
  <g mask="url(#gl2)"><path d="M 13 22 Q 15.2 21.4 17.1 22.3 Q 18.2 24.1 19.7 25.8 Q 21.5 26.9 23 27.2
    Q 24.5 26.9 26.3 25.8 Q 27.8 24.1 28.9 22.3 Q 30.8 21.4 33 22" fill="none"
    stroke="${C.text}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>
  <circle cx="18.5" cy="17" r="1.9" fill="${C.text}"/><circle cx="27.5" cy="17" r="1.9" fill="${C.text}"/>
  <circle cx="23" cy="22" r="16" fill="none" stroke="${C.text}" stroke-width="4"/>
  <rect x="16" y="39" width="14" height="6" rx="1.5" fill="${C.text}"/>
</svg>`;

const R = 54;
const CIRC = 2 * Math.PI * R;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:${C.bg};
  background-image:radial-gradient(${C.border} 2px,transparent 2px);background-size:34px 34px;
  font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;
  -webkit-font-smoothing:antialiased;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px}

/* 모든 애니메이션은 멈춰 두고 밖에서 시간을 민다 */
*,*::before,*::after{animation-play-state:paused !important;animation-fill-mode:both !important}

.card{width:920px;background:${C.panel};border:1px solid ${C.border};border-radius:40px;
  padding:50px 56px 54px;box-shadow:0 18px 50px rgba(44,40,34,.07);
  animation:cardIn .55s cubic-bezier(.2,1.3,.4,1),breathe .5s ${T.reveal}s ease-out}
@keyframes cardIn{from{opacity:0;transform:translateY(90px) scale(.94)}to{opacity:1;transform:none}}
@keyframes breathe{0%{}22%{transform:scale(1.03)}100%{transform:none}}

.chip{display:inline-block;background:${C.chipBg};color:${C.chipText};font-size:29px;
  font-weight:700;padding:10px 22px;border-radius:13px;letter-spacing:-.02em;
  animation:pop .4s .18s cubic-bezier(.2,1.6,.4,1)}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}

h1{margin-top:22px;font-size:50px;font-weight:800;color:${C.text};letter-spacing:-.03em;
  animation:slide .45s .28s cubic-bezier(.2,1,.3,1)}
@keyframes slide{from{opacity:0;transform:translateX(-38px)}to{opacity:1;transform:none}}

/* 전개도 */
.net{margin-top:26px;display:flex;justify-content:center;background:${C.bg};
  border-radius:22px;padding:22px 0;opacity:0;
  animation:netIn .5s ${T.net}s cubic-bezier(.2,1.5,.4,1)}
@keyframes netIn{from{opacity:0;transform:translateY(-24px) scale(.92)}to{opacity:1;transform:none}}

/* 보기 2×2 */
.grid{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.choice{display:flex;align-items:center;gap:16px;background:${C.bg};
  border:2px solid ${C.border};border-radius:20px;padding:18px 20px;
  animation:drop .42s cubic-bezier(.2,1.5,.4,1)}
@keyframes drop{from{opacity:0;transform:translateY(-26px) scale(.92)}to{opacity:1;transform:none}}
${문제.options.map((_, i) => `.choice.c${i}{animation-delay:${T.choices[i]}s}`).join('')}
.badge{flex:none;width:50px;height:50px;border-radius:50%;background:${C.panel};
  border:2px solid ${C.border};color:${C.muted};font-size:25px;font-weight:800;
  display:flex;align-items:center;justify-content:center}
.die{flex:1;display:flex;justify-content:center}

/* 공개: 오답은 가라앉고 정답이 튄다 */
${문제.options.map((_, i) => i === 문제.answer ? '' :
	`.choice.c${i}{animation:drop .42s ${T.choices[i]}s cubic-bezier(.2,1.5,.4,1),
		dim .45s ${T.reveal}s ease-out}`).join('')}
@keyframes dim{to{opacity:.3;transform:scale(.96)}}
.choice.win{position:relative;
  animation:drop .42s ${T.choices[문제.answer]}s cubic-bezier(.2,1.5,.4,1),
  winUp .55s ${T.reveal + 0.12}s cubic-bezier(.2,1.7,.4,1)}
@keyframes winUp{0%{}40%{transform:scale(1.07)}100%{transform:scale(1.04);
  background:${C.chipBg};border-color:${C.accent}}}
.choice.win .badge{animation:winBadge .55s ${T.reveal + 0.12}s cubic-bezier(.2,1.7,.4,1)}
@keyframes winBadge{to{background:${C.accent};border-color:${C.accent};color:#fff}}
.choice .check{position:absolute;top:-16px;right:-12px;width:52px;height:52px;border-radius:50%;
  background:${C.accent};color:#fff;font-size:30px;font-weight:800;
  display:flex;align-items:center;justify-content:center;opacity:0;
  box-shadow:0 4px 12px rgba(47,143,91,.45)}
.choice.win .check{animation:chk .45s ${T.reveal + 0.3}s cubic-bezier(.2,1.8,.4,1)}
@keyframes chk{from{opacity:0;transform:scale(.3) rotate(-30deg)}to{opacity:1;transform:none}}

/* 해설 */
.rule{margin-top:26px;font-size:30px;line-height:1.6;color:${C.muted};letter-spacing:-.02em;
  text-align:center;opacity:0;animation:ruleIn .5s ${T.rule}s cubic-bezier(.2,1,.3,1)}
.rule b{color:${C.text};font-weight:700;position:relative}
@keyframes ruleIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.rule b::after{content:'';position:absolute;left:0;right:0;bottom:-4px;height:5px;
  background:${C.gold};border-radius:3px;transform-origin:left;transform:scaleX(0);
  animation:wipe .5s ${T.rule + 0.25}s cubic-bezier(.3,1,.4,1)}
@keyframes wipe{to{transform:scaleX(1)}}

/* 카운트다운 링 */
.timer{position:relative;width:${R * 2 + 20}px;height:${R * 2 + 20}px;
  opacity:0;animation:tIn .3s ${T.tickFrom - 0.2}s ease-out,tOut .3s ${T.reveal}s ease-in}
@keyframes tIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
@keyframes tOut{to{opacity:0;transform:scale(1.25)}}
.timer svg{transform:rotate(-90deg)}
.timer .track{fill:none;stroke:${C.border};stroke-width:9}
.timer .bar{fill:none;stroke:${C.accent};stroke-width:9;stroke-linecap:round;
  stroke-dasharray:${CIRC.toFixed(1)};stroke-dashoffset:0;
  animation:drain ${(T.reveal - T.tickFrom).toFixed(2)}s ${T.tickFrom}s linear}
@keyframes drain{to{stroke-dashoffset:${CIRC.toFixed(1)}}}
.timer .num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:54px;font-weight:800;color:${C.text}}
.timer .num span{position:absolute;opacity:0;animation:numPop .9s cubic-bezier(.2,1.6,.4,1)}
@keyframes numPop{0%{opacity:0;transform:translateY(14px) scale(.7)}
  14%{opacity:1;transform:none}86%{opacity:1}100%{opacity:0;transform:scale(.9)}}
${[0, 1, 2, 3].map((i) => `.timer .num span:nth-child(${i + 1}){animation-delay:${(T.tickFrom + i * 0.875).toFixed(3)}s}`).join('')}

/* 주소 — 유튜브 쇼츠는 설명·댓글 링크가 전부 막혀 있다(스팸 방지 정책).
   사람이 기억했다가 직접 치거나 채널 프로필로 넘어가는 수밖에 없다.
   그래서 작게 흘리지 않고 크게, 오래 남긴다. */
.foot{display:flex;flex-direction:column;align-items:center;gap:10px;opacity:0;
  animation:footIn .55s ${T.brand}s cubic-bezier(.2,1.2,.3,1)}
@keyframes footIn{from{opacity:0;transform:translateY(26px) scale(.94)}to{opacity:1;transform:none}}
.foot .who{display:flex;align-items:center;gap:12px}
.foot .who b{font-size:34px;font-weight:800;color:${C.text};letter-spacing:-.02em}
.url{position:relative;font-size:64px;font-weight:800;color:${C.text};letter-spacing:-.01em;
  padding:0 6px;animation:urlPulse .7s ${T.brand + 1.7}s cubic-bezier(.3,1.4,.4,1)}
@keyframes urlPulse{0%{transform:none}38%{transform:scale(1.075)}100%{transform:none}}
.url::after{content:'';position:absolute;left:0;right:0;bottom:-9px;height:7px;
  background:${C.gold};border-radius:3px;transform-origin:left;transform:scaleX(0);
  animation:wipe .55s ${T.brand + 0.3}s cubic-bezier(.3,1,.4,1)}
.tag{margin-top:14px;font-size:28px;color:${C.muted};letter-spacing:-.02em}
</style></head><body>
<div class="card">
  <span class="chip">전개도</span>
  <h1>접으면 어떤 주사위가 될까요?</h1>
  <div class="net">${netSvg(96)}</div>
  <div class="grid">
    ${문제.options.map((v, i) =>
			`<div class="choice c${i}${i === 문제.answer ? ' win' : ''}">
				<span class="badge">${LETTERS[i]}</span>
				<span class="die">${dieSvg(v, 150)}</span>
				<span class="check">✓</span>
			</div>`).join('')}
  </div>
  <div class="rule">${문제.해설}</div>
</div>

<div class="timer">
  <svg width="${R * 2 + 20}" height="${R * 2 + 20}">
    <circle class="track" cx="${R + 10}" cy="${R + 10}" r="${R}"/>
    <circle class="bar" cx="${R + 10}" cy="${R + 10}" r="${R}"/>
  </svg>
  <div class="num"><span>4</span><span>3</span><span>2</span><span>1</span></div>
</div>

<div class="foot">
  <div class="who">${bulb(40)}<b>딸깍</b></div>
  <div class="url">ddalkkak.app</div>
  <div class="tag">매일 자정, 두뇌 퍼즐 10문제</div>
</div>
</body></html>`;

/* ═══════════ 소리 — scene-discover.mjs와 같은 파형 ═══════════ */

const SR = 44100;
function synth() {
	const n = Math.round(SR * T.total);
	const buf = new Float64Array(n);
	const add = (t0, s, g = 1) => {
		const i0 = Math.round(t0 * SR);
		for (let i = 0; i < s.length; i++) { const j = i0 + i; if (j >= 0 && j < n) buf[j] += s[i] * g; }
	};
	const tone = (f, dur, tau, harm = 0) => {
		const m = Math.round(SR * dur), o = new Float64Array(m);
		for (let i = 0; i < m; i++) {
			const t = i / SR;
			let v = Math.sin(2 * Math.PI * f * t);
			if (harm) v += harm * Math.sin(2 * Math.PI * f * 2 * t);
			o[i] = v * Math.exp(-t / tau);
		}
		return o;
	};
	const click = (hi, lo, g) => {
		const a = tone(hi, 0.05, 0.004), b = tone(lo, 0.09, 0.013);
		const m = Math.max(a.length, b.length), o = new Float64Array(m);
		for (let i = 0; i < m; i++) o[i] = (i < a.length ? a[i] : 0) * 0.7 * g + (i < b.length ? b[i] : 0) * 0.5 * g;
		return o;
	};

	add(0.05, click(2400, 1150, 1.0));
	add(0.105, click(1900, 880, 0.85));
	add(T.net + 0.06, click(2600, 1200, 0.4));
	for (const t of T.choices) add(t + 0.06, click(2200, 1050, 0.3));
	for (let k = 0; k < 4; k++) {
		const t = T.tickFrom + k * 0.875;
		add(t, k % 2 === 0 ? click(2700, 1400, 0.32) : click(2100, 1000, 0.29));
		if (k >= 2) add(t, click(3000, 1500, 0.15));
	}
	add(T.reveal + 0.12, click(2400, 1150, 0.8));
	for (const [k, f] of [880.0, 1108.7, 1318.5, 1760.0].entries())
		add(T.reveal + 0.2 + k * 0.085, tone(f, 1.6, 0.34, 0.28), 0.3);
	add(T.reveal + 0.54, tone(2637.0, 1.4, 0.3, 0.2), 0.14);

	let peak = 0;
	for (const v of buf) peak = Math.max(peak, Math.abs(v));
	const sc = 0.82 / (peak || 1), k = Math.tanh(1.15);
	for (let i = 0; i < n; i++) buf[i] = Math.tanh(buf[i] * sc * 1.15) / k;

	const data = Buffer.alloc(n * 4);
	for (let i = 0; i < n; i++) {
		const s = Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767)));
		data.writeInt16LE(s, i * 4); data.writeInt16LE(s, i * 4 + 2);
	}
	const h = Buffer.alloc(44);
	h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
	h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
	h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
	h.write('data', 36); h.writeUInt32LE(data.length, 40);
	return Buffer.concat([h, data]);
}

/* ═══════════ 찍는다 ═══════════ */

const BIN = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/usr/bin/google-chrome', '/usr/bin/chromium'
].find((p) => existsSync(p));
if (!BIN) { console.error('크롬 계열 브라우저를 못 찾았다.'); process.exit(1); }

mkdirSync('promo/video', { recursive: true });

const work = join(tmpdir(), `ddal-cscene-${process.pid}`);
mkdirSync(work, { recursive: true });
writeFileSync(join(work, 'sfx.wav'), synth());
const htmlPath = join(work, 'scene.html');
writeFileSync(htmlPath, html, 'utf-8');

const PORT = 9422;
const proc = spawn(BIN, ['--headless=new', `--remote-debugging-port=${PORT}`,
	`--user-data-dir=${join(work, 'prof')}`, '--no-first-run', '--disable-gpu',
	'--hide-scrollbars',
	// 보이지 않는 창이라고 렌더러를 재우면 캡처가 계속 늦는다
	'--disable-background-timer-throttling', '--disable-renderer-backgrounding',
	'--disable-backgrounding-occluded-windows',
	'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, ff, errBuf = '';
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
	const send = (m, p = {}, ms = 30000) => new Promise((res, rej) => {
		const mid = ++id;
		const to = setTimeout(() => rej(new Error('timeout ' + m)), ms);
		const h = (raw) => { const x = JSON.parse(raw);
			if (x.id === mid) { clearTimeout(to); ws.off('message', h); x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result); } };
		ws.on('message', h);
		ws.send(JSON.stringify({ id: mid, method: m, params: p }));
	});
	const evalJs = async (expr) => {
		const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
		if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description).slice(0, 250));
		return r.result.value;
	};

	await send('Page.enable'); await send('Runtime.enable');
	await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
	await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') });
	await sleep(2600);                                   // 웹폰트 대기

	const count = await evalJs('document.getAnimations().length');
	console.log(`애니메이션 ${count}개를 시간으로 민다`);
	if (!count) throw new Error('애니메이션이 하나도 없다 — CSS가 안 먹었다');

	// fromSurface:false는 성냥개비 쪽에서 프레임 30부터 무조건 타임아웃이 났다 — 다시 넣지 마라.
	// PNG 대신 JPEG로 뜬다. 어차피 H.264로 다시 인코딩하니 q=95면 눈으로 구분이 안 되고,
	// 크롬이 프레임마다 하던 PNG 압축(1080x1920)이 통째로 사라진다.
	const SHOT = { format: 'jpeg', quality: 95 };
	// 프레임을 디스크에 쓰지 않고 ffmpeg에 바로 민다.
	ff = spawn('ffmpeg', [
		'-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
		'-i', join(work, 'sfx.wav'),
		'-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-crf', '19',
		'-c:a', 'aac', '-b:a', '160k', '-shortest', OUT
	], { stdio: ['pipe', 'ignore', 'pipe'] });
	ff.stderr.on('data', (d) => { errBuf += d; if (errBuf.length > 20000) errBuf = errBuf.slice(-8000); });
	// ffmpeg가 먼저 죽으면 파이프 쓰기가 EOF로 터진다. 조용히 죽지 말고 stderr를 보여 준다.
	ff.stdin.on('error', (e) => {
		console.error(`\nffmpeg 파이프 끊김: ${e.code}`);
		console.error(errBuf.split('\n').slice(-15).join('\n'));
		process.exit(1);
	});
	const N = Math.round(T.total * FPS);
	let 지연 = 0; // 캡처가 멈춰서 버린 시간(초). 끝에 찍어 회귀를 눈으로 본다.
	const t0 = Date.now();
	for (let i = 0; i < N; i++) {
		const ms = (i / FPS) * 1000;
		await evalJs(`for(const a of document.getAnimations()){a.pause();a.currentTime=${ms.toFixed(1)}}`);
		/**
		 * captureScreenshot이 간헐적으로 멈춘다 — 애니메이션을 전부 pause()해 두면
		 * 컴포지터가 새 프레임을 안 올리는데 캡처는 그걸 기다리기 때문이다.
		 * 예전에는 이 타임아웃이 30초였고 재시도가 에러를 삼켜서, 멈출 때마다 30초씩
		 * 까먹으면서도 「그냥 느린 렌더」로 보였다(3.4초 → 30초/프레임까지 갔다).
		 *
		 * 고치는 방향은 두 가지였는데 fromSurface:false는 프레임 30부터 아예 죽어서
		 * 버렸다. 남은 것이 이것 — 멈추면 짧게 끊고 다시 부른다. 두 번째 호출은 대개
		 * 바로 돌아온다. 30초 손해가 1.5초 손해가 된다.
		 */
		let data;
		for (let 시도 = 1; ; 시도++) {
			try { ({ data } = await send('Page.captureScreenshot', SHOT, 1500)); break; }
			catch (e) {
				if (시도 >= 8) throw new Error(`프레임 ${i} 캡처 8번 실패: ${e.message}`);
				지연 += 1.5;
				await sleep(60);
			}
		}
		if (!ff.stdin.write(Buffer.from(data, 'base64'))) {
			await new Promise((r) => ff.stdin.once('drain', r));
		}
		if (i % 30 === 0) process.stdout.write(`\r  ${i}/${N}`);
	}
	ff.stdin.end();
	const 걸린 = (Date.now() - t0) / 1000;
	console.log(`\r프레임 ${N}장 ${걸린.toFixed(0)}초 (${(걸린 / N).toFixed(2)}초/장, 캡처 멈춤으로 버린 시간 ${지연.toFixed(0)}초) — 인코딩 대기`);
} finally {
	ws?.close(); proc.kill();
}

const code = await new Promise((res) => ff.on('close', res));
if (code !== 0) {
	console.error(errBuf.split('\n').slice(-12).join('\n'));
	process.exit(1);
}
console.log(`\n${OUT} (${T.total}초, ${W}x${H})`);

/* ── 올릴 때 쓸 제목·설명 ──
   promo/쇼츠-올리기.md의 전개도 예시는 옛 문제에 박혀 있다. 문제를 갈아도 그 문서는
   안 따라오니 여기서 같이 찍는다. 9호가 앞 문제 자막을 달고 나간 사고가 그래서 났다.
   링크에 utm은 붙이지 않는다 — 쇼츠는 설명 링크가 클릭조차 되지 않는다(스팸 방지). */
const 기호이름 = ['원', '고리', '사각', '테두리', '십자', '네점'];
const 보기글 = (o) => o.map((f) => 기호이름[f]).join('/');
const 벗기기 = (h) => h.replace(/<br>/g, ' ').replace(/<[^>]+>/g, '');
console.log(
	[
		'',
		'─────────── 올릴 때 쓸 것 ───────────',
		'[제목]',
		'이 전개도를 접으면 어떤 주사위가 될까요? #shorts',
		'',
		'[설명]',
		'전개도를 접었을 때 나오는 주사위를 고르는 문제입니다.',
		'',
		...문제.options.map((o, i) => `${LETTERS[i]}. ${보기글(o)}`),
		'',
		벗기기(문제.해설),
		'',
		'마주 보는 면은 한 번에 볼 수 없다 — 이것만 알면 보기 둘이 바로 지워집니다.',
		'남은 둘 중 하나는 거울상이라 여기서부터가 진짜 승부예요.',
		'',
		'ddalkkak.app/cubenet',
		'',
		'#딸깍 #두뇌퍼즐 #퍼즐 #전개도 #공간지각',
		'',
		`[정답] ${LETTERS[문제.answer]}. ${보기글(문제.options[문제.answer])}`,
		'─────────────────────────────────────'
	].join('\n')
);
rmSync(work, { recursive: true, force: true });
