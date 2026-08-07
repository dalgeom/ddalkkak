/**
 * 성냥개비 쇼츠 — 화면 전체를 CSS 애니메이션으로 만들고 프레임 단위로 찍는다.
 *
 *   node scripts/scene-matchstick.mjs
 *
 * scene-discover.mjs와 같은 방식. 보드는 MatchstickBoard.svelte의 좌표·색을
 * 그대로 옮겼다 — 검은 보드, 켜진 성냥은 네온 초록, 집으면 주황.
 * 정답 공개에서 +의 세로 성냥이 주황으로 집혔다가 0의 가운데로 날아가
 * 초록으로 안착한다. 사이트에서 정답 볼 때 나오는 그 연출이다.
 *
 * CSS 애니메이션을 전부 멈춰 두고 Web Animations API로 currentTime을 직접
 * 밀어 한 프레임씩 찍는다. 몇 번을 돌려도 같은 영상이 나온다.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = 'promo/video/쇼츠-성냥개비-연출.mp4';
const FRAMES = join(tmpdir(), 'ddal-mscene-frames');
const W = 1080, H = 1920, FPS = 30;

/* ── 타임라인(초). 소리와 맞춰야 한다 ── */
const T = {
	glyphs: [0.55, 0.75, 0.95, 1.15, 1.35], // 0, +, 2, =, 6 이 차례로 켜진다
	quest: 1.75,                             // "지금은 틀린 식입니다"
	tickFrom: 2.1,                           // 카운트다운 시작
	pick: 5.6,                               // 세로 성냥이 주황으로 집힌다
	fly: 6.1,                                // 날아간다 (0.9초)
	land: 7.0,                               // 안착 — 8 - 2 = 6
	rule: 7.35,                              // 규칙 설명
	brand: 8.2,                              // 주소
	total: 11.9
};

const C = {
	bg: '#efe7d8', panel: '#fdfbf6', border: '#ddd0ba',
	text: '#2c2822', muted: '#6b6258', accent: '#2f8f5b',
	gold: '#f6d34e', chipBg: '#e7f3ec', chipText: '#2f8f5b', warn: '#c0632e'
};

/* ── 문제: matchstick-problems.json의 '0 + 2 = 6' -> '8 - 2 = 6' ── */

/* MatchstickBoard.svelte와 같은 좌표계 */
const SEG_RECT = {
	a: [10, 0, 34, 8], b: [46, 9, 8, 34], c: [46, 51, 8, 34], d: [10, 87, 34, 8],
	e: [0, 51, 8, 34], f: [0, 9, 8, 34], g: [10, 43.5, 34, 8]
};
const DIGIT_SEGS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
const GW = 54, GH = 95, GAP = 14, OPW = 42, EQW = 36;

/* 글리프 [0, 2, 6] 레이아웃 — MatchstickBoard의 계산을 그대로 편다 */
const X0 = 0;
const OPX = X0 + GW + GAP;               // 68
const X1 = OPX + OPW + GAP;              // 124
const EQX = X1 + GW + GAP;               // 192
const X2 = EQX + EQW + GAP;              // 242
const BW = X2 + GW;                      // 296

/* 날아가는 성냥: + 세로(OPX+17, 30, 8x35) -> 0의 g(X0+10, 43.5, 34x8) */
const FLY_FROM = { x: OPX + 17, y: 30, w: 8, h: 35 };
const FLY_TO = { x: X0 + 10, y: 43.5, w: 34, h: 8 };

/** 숫자 하나의 세그먼트들. 켜진 것은 lit, 꺼진 것은 ghost 슬롯. */
function digit(x, d, cls) {
	const on = DIGIT_SEGS[d];
	// 바깥 g는 위치만 잡는다. CSS transform 애니메이션을 바깥에 걸면
	// transform:none이 translate 속성을 덮어써 글리프가 전부 원점에 쌓인다.
	return `<g transform="translate(${x} 0)"><g class="${cls}">` +
		Object.entries(SEG_RECT).map(([seg, [rx, ry, rw, rh]]) =>
			`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="3"
				class="${on.includes(seg) ? 'lit' : 'ghost'}"/>`).join('') +
		`</g></g>`;
}

const board = `
<svg class="fit" viewBox="-4 -4 ${BW + 8} ${GH + 8}">
  ${digit(X0, 0, 'gl g0')}
  <g transform="translate(${OPX} 0)"><g class="gl g1">
    <rect x="4" y="43.5" width="34" height="8" rx="3" class="fixed"/>
  </g></g>
  ${digit(X1, 2, 'gl g2')}
  <g transform="translate(${EQX} 0)"><g class="gl g3">
    <rect x="1" y="37" width="30" height="7" rx="3" class="fixed"/>
    <rect x="1" y="51" width="30" height="7" rx="3" class="fixed"/>
  </g></g>
  ${digit(X2, 6, 'gl g4')}
  <!-- 0의 g 자리는 빈 슬롯 — 날아온 성냥이 여기 안착한다. 슬롯은 digit(0)이 이미 ghost로 그렸다 -->
  <!-- 날아가는 성냥: 처음엔 +의 세로획으로 초록, 집히면 주황, 안착하면 다시 초록 -->
  <rect class="flyer" rx="3"/>
</svg>`;

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
const FLY_DUR = T.land - T.fly;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;background:${C.bg};
  background-image:radial-gradient(${C.border} 2px,transparent 2px);background-size:34px 34px;
  font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;
  -webkit-font-smoothing:antialiased;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:52px}

/* 모든 애니메이션은 멈춰 두고 밖에서 시간을 민다 */
*,*::before,*::after{animation-play-state:paused !important;animation-fill-mode:both !important}

.card{width:900px;background:${C.panel};border:1px solid ${C.border};border-radius:40px;
  padding:56px 64px 62px;box-shadow:0 18px 50px rgba(44,40,34,.07);
  animation:cardIn .55s cubic-bezier(.2,1.3,.4,1),breathe .5s ${T.land}s ease-out}
@keyframes cardIn{from{opacity:0;transform:translateY(90px) scale(.94)}to{opacity:1;transform:none}}
/* 안착 순간 카드가 한 번 숨을 쉰다 */
@keyframes breathe{0%{}22%{transform:scale(1.035)}100%{transform:none}}

.chip{display:inline-block;background:${C.chipBg};color:${C.chipText};font-size:29px;
  font-weight:700;padding:10px 22px;border-radius:13px;letter-spacing:-.02em;
  animation:pop .4s .18s cubic-bezier(.2,1.6,.4,1)}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}

h1{margin-top:26px;font-size:52px;font-weight:800;color:${C.text};letter-spacing:-.03em;
  animation:slide .45s .28s cubic-bezier(.2,1,.3,1)}
@keyframes slide{from{opacity:0;transform:translateX(-38px)}to{opacity:1;transform:none}}

/* 검은 보드 — 사이트 .mboard와 같은 색 */
.mboard{margin-top:34px;background:#0a0d0a;border-radius:26px;padding:56px 34px;
  display:flex;align-items:center;justify-content:center}
.fit{width:100%;height:auto}

/* 글리프가 하나씩 켜진다 */
.gl{opacity:0;transform-box:fill-box;transform-origin:center;
  animation:glOn .4s cubic-bezier(.2,1.5,.4,1)}
@keyframes glOn{from{opacity:0;transform:translateY(-16px) scale(.85)}to{opacity:1;transform:none}}
${T.glyphs.map((t, i) => `.gl.g${i}{animation-delay:${t}s}`).join('')}

.lit{fill:#3aff62;filter:drop-shadow(0 0 5px rgba(58,255,98,.7))}
.ghost{fill:#17231a;stroke:#223528;stroke-width:1}
.fixed{fill:#ffd24a}

/* 날아가는 성냥 — MatchstickBoard의 lift→fly→land를 keyframes로 편다 */
.flyer{
  x:${FLY_FROM.x}px;y:${FLY_FROM.y}px;width:${FLY_FROM.w}px;height:${FLY_FROM.h}px;
  fill:#3aff62;filter:drop-shadow(0 0 5px rgba(58,255,98,.7));
  opacity:0;
  animation:
    flyOn .4s ${T.glyphs[1]}s cubic-bezier(.2,1.5,.4,1),
    pickCol .3s ${T.pick}s steps(1,end),
    flyMove ${FLY_DUR}s ${T.fly}s cubic-bezier(.25,.8,.3,1),
    landCol .25s ${T.land}s steps(1,end)}
@keyframes flyOn{from{opacity:0}to{opacity:1}}
@keyframes pickCol{to{fill:#ffb020;filter:drop-shadow(0 0 8px rgba(255,176,32,.9))}}
@keyframes flyMove{to{x:${FLY_TO.x}px;y:${FLY_TO.y}px;width:${FLY_TO.w}px;height:${FLY_TO.h}px}}
@keyframes landCol{to{fill:#3aff62;filter:drop-shadow(0 0 5px rgba(58,255,98,.7))}}

/* "지금은 틀린 식" — 정답 공개 때 문구가 바뀐다 */
.quest{margin-top:28px;font-size:34px;font-weight:700;color:${C.warn};text-align:center;
  letter-spacing:-.02em;position:relative;height:44px;
  animation:qIn .5s ${T.quest}s cubic-bezier(.2,1.5,.4,1)}
@keyframes qIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.quest .before{position:absolute;inset:0;animation:qOut .25s ${T.pick}s cubic-bezier(.4,0,1,.6)}
@keyframes qOut{to{opacity:0;transform:scale(.85)}}
.quest .after{position:absolute;inset:0;opacity:0;color:${C.accent};font-weight:800;
  animation:aIn .5s ${T.land + 0.1}s cubic-bezier(.2,1.7,.4,1)}
@keyframes aIn{from{opacity:0;transform:scale(1.8)}to{opacity:1;transform:none}}

/* 규칙 */
.rule{margin-top:26px;font-size:31px;line-height:1.62;color:${C.muted};letter-spacing:-.02em;
  text-align:center;opacity:0;animation:ruleIn .5s ${T.rule}s cubic-bezier(.2,1,.3,1)}
.rule b{color:${C.text};font-weight:700;position:relative}
@keyframes ruleIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.rule b::after{content:'';position:absolute;left:0;right:0;bottom:-4px;height:5px;
  background:${C.gold};border-radius:3px;transform-origin:left;transform:scaleX(0);
  animation:wipe .5s ${T.rule + 0.25}s cubic-bezier(.3,1,.4,1)}
@keyframes wipe{to{transform:scaleX(1)}}

/* 카운트다운 링 — scene-discover와 같다 */
.timer{position:relative;width:${R * 2 + 20}px;height:${R * 2 + 20}px;
  opacity:0;animation:tIn .3s ${T.tickFrom - 0.2}s ease-out,tOut .3s ${T.pick}s ease-in}
@keyframes tIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
@keyframes tOut{to{opacity:0;transform:scale(1.25)}}
.timer svg{transform:rotate(-90deg)}
.timer .track{fill:none;stroke:${C.border};stroke-width:9}
.timer .bar{fill:none;stroke:${C.accent};stroke-width:9;stroke-linecap:round;
  stroke-dasharray:${CIRC.toFixed(1)};stroke-dashoffset:0;
  animation:drain ${(T.pick - T.tickFrom).toFixed(2)}s ${T.tickFrom}s linear}
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
  <span class="chip">성냥개비</span>
  <h1>성냥 하나만 옮기세요</h1>
  <div class="mboard">${board}</div>
  <div class="quest">
    <span class="before">지금은 틀린 식입니다</span>
    <span class="after">8 − 2 = 6 &nbsp;딸깍!</span>
  </div>
  <div class="rule"><b>+의 세로 성냥</b>을 뽑아 <b>0의 가운데</b>에 놓으면<br>
    +는 −가 되고 0은 8이 됩니다.</div>
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
	// 글리프가 켜질 때마다 톡
	for (const t of T.glyphs) add(t + 0.06, click(2200, 1050, 0.3));
	add(T.quest + 0.08, click(2600, 1200, 0.42));
	// 카운트다운
	for (let k = 0; k < 4; k++) {
		const t = T.tickFrom + k * 0.875;
		add(t, k % 2 === 0 ? click(2700, 1400, 0.32) : click(2100, 1000, 0.29));
		if (k >= 2) add(t, click(3000, 1500, 0.15));
	}
	// 집는 소리 — 살짝 낮게
	add(T.pick + 0.05, click(1500, 700, 0.5));
	// 안착 — 딸깍 두 번 + 아르페지오
	add(T.land, click(2400, 1150, 0.9));
	add(T.land + 0.06, click(1900, 880, 0.7));
	for (const [k, f] of [880.0, 1108.7, 1318.5, 1760.0].entries())
		add(T.land + 0.12 + k * 0.085, tone(f, 1.6, 0.34, 0.28), 0.3);
	add(T.land + 0.46, tone(2637.0, 1.4, 0.3, 0.2), 0.14);

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

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
mkdirSync('promo/video', { recursive: true });

const work = join(tmpdir(), `ddal-mscene-${process.pid}`);
mkdirSync(work, { recursive: true });
writeFileSync(join(work, 'sfx.wav'), synth());
const htmlPath = join(work, 'scene.html');
writeFileSync(htmlPath, html, 'utf-8');

const PORT = 9417;
const proc = spawn(BIN, ['--headless=new', `--remote-debugging-port=${PORT}`,
	`--user-data-dir=${join(work, 'prof')}`, '--no-first-run', '--disable-gpu',
	'--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

	const N = Math.round(T.total * FPS);
	for (let i = 0; i < N; i++) {
		const ms = (i / FPS) * 1000;
		await evalJs(`for(const a of document.getAnimations()){a.pause();a.currentTime=${ms.toFixed(1)}}`);
		let data;
		try { ({ data } = await send('Page.captureScreenshot', { format: 'png' })); }
		catch { await sleep(400); ({ data } = await send('Page.captureScreenshot', { format: 'png' })); }
		writeFileSync(join(FRAMES, `f${String(i).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
	}
	console.log(`프레임 ${N}장 (${T.total}초)`);
} finally {
	ws?.close(); proc.kill();
}

const r = spawnSync('ffmpeg', [
	'-y', '-framerate', String(FPS), '-i', join(FRAMES, 'f%04d.png'),
	'-i', join(work, 'sfx.wav'),
	'-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-crf', '19',
	'-c:a', 'aac', '-b:a', '160k', '-shortest', OUT
], { stdio: ['ignore', 'ignore', 'pipe'] });
if (r.status !== 0) {
	console.error(String(r.stderr).split('\n').slice(-12).join('\n'));
	process.exit(1);
}
console.log(`\n${OUT} (${T.total}초, ${W}x${H})`);
rmSync(work, { recursive: true, force: true });
rmSync(FRAMES, { recursive: true, force: true });
