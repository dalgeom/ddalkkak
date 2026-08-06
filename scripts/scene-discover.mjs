/**
 * 발견형 쇼츠 — 화면 전체를 CSS 애니메이션으로 만들고 프레임 단위로 찍는다.
 *
 *   node scripts/scene-discover.mjs
 *
 * 앞서 만든 방식은 정지 화면 한 장에 줌을 걸고 자막을 얹은 것이었다. 요소가
 * 통째로 같이 움직여서 슬라이드쇼처럼 보였다. 여기서는 칩·제목·예시 줄·물음표·
 * 정답·해설이 각자 다른 시점에 다른 방식으로 움직인다.
 *
 * 시간을 흘려보내며 녹화하면 프레임이 튄다. 그래서 CSS 애니메이션을 전부
 * 멈춰 두고 Web Animations API로 currentTime을 직접 밀어 한 프레임씩 찍는다.
 * 몇 번을 돌려도 같은 영상이 나온다.
 *
 * 소리는 shorts-gen.mjs와 같은 파형(딸깍·째깍·또로롱)을 쓴다.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = 'promo/video/쇼츠-발견형-연출.mp4';
const FRAMES = join(tmpdir(), 'ddal-scene-frames');
const W = 1080, H = 1920, FPS = 30;

/* ── 타임라인(초). 소리와 맞춰야 한다 ── */
const T = {
	rows: [0.55, 0.8, 1.05, 1.3],   // 예시 줄이 하나씩 떨어지는 시점
	quest: 1.7,                      // 물음표 줄
	tickFrom: 2.0,                   // 카운트다운 시작
	reveal: 5.5,                     // 정답 공개
	rule: 6.1,                       // 규칙 설명
	brand: 7.8,
	total: 10.6
};

const C = {
	bg: '#efe7d8', panel: '#fdfbf6', border: '#ddd0ba',
	text: '#2c2822', muted: '#6b6258', accent: '#2f8f5b',
	gold: '#f6d34e', chipBg: '#e7f3ec', chipText: '#2f8f5b', warn: '#c0632e'
};

/* ── 문제: src/lib/problems.ts 의 실제 문제와 같아야 한다 ── */
const 문제 = {
	chip: '순서 규칙',
	제목: '규칙이 보이나요?',
	줄: ['4 + 6 = 46', '3 + 5 = 35', '3 + 4 = 43', '6 + 2 = 62'],
	물음좌: '5 + 8 =',
	답: '85',
	규칙: '두 수의 합이 <b>짝수면 그대로</b>, <b>홀수면 뒤집어</b> 이어붙입니다.<br>5+8=13은 홀수라 <b>85</b>.'
};

const bulb = (s) => `
<svg viewBox="0 2 46 46" width="${s}" height="${s}">
  <defs><mask id="gl"><circle cx="23" cy="22" r="13.5" fill="white"/></mask></defs>
  <circle cx="23" cy="22" r="16" fill="${C.gold}"/>
  <g mask="url(#gl)"><path d="M 13 22 Q 15.2 21.4 17.1 22.3 Q 18.2 24.1 19.7 25.8 Q 21.5 26.9 23 27.2
    Q 24.5 26.9 26.3 25.8 Q 27.8 24.1 28.9 22.3 Q 30.8 21.4 33 22" fill="none"
    stroke="${C.text}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>
  <circle cx="18.5" cy="17" r="1.9" fill="${C.text}"/><circle cx="27.5" cy="17" r="1.9" fill="${C.text}"/>
  <circle cx="23" cy="22" r="16" fill="none" stroke="${C.text}" stroke-width="4"/>
  <rect x="16" y="39" width="14" height="6" rx="1.5" fill="${C.text}"/>
</svg>`;

/** 카운트다운 링. 둘레를 시간에 따라 지운다. */
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
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:52px}

/* 모든 애니메이션은 멈춰 두고 밖에서 시간을 민다 */
*,*::before,*::after{animation-play-state:paused !important;animation-fill-mode:both !important}

.card{width:900px;background:${C.panel};border:1px solid ${C.border};border-radius:40px;
  padding:56px 64px 62px;box-shadow:0 18px 50px rgba(44,40,34,.07);
  animation:cardIn .55s cubic-bezier(.2,1.3,.4,1)}
@keyframes cardIn{from{opacity:0;transform:translateY(90px) scale(.94)}to{opacity:1;transform:none}}

.chip{display:inline-block;background:${C.chipBg};color:${C.chipText};font-size:29px;
  font-weight:700;padding:10px 22px;border-radius:13px;letter-spacing:-.02em;
  animation:pop .4s .18s cubic-bezier(.2,1.6,.4,1)}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}

h1{margin-top:26px;font-size:52px;font-weight:800;color:${C.text};letter-spacing:-.03em;
  animation:slide .45s .28s cubic-bezier(.2,1,.3,1)}
@keyframes slide{from{opacity:0;transform:translateX(-38px)}to{opacity:1;transform:none}}

.box{margin-top:34px;background:${C.bg};border-radius:26px;padding:40px 0 44px;
  display:flex;flex-direction:column;align-items:center;gap:18px}
.row{font-size:56px;font-weight:600;color:${C.text};letter-spacing:.02em;white-space:pre;
  animation:drop .42s cubic-bezier(.2,1.5,.4,1)}
@keyframes drop{from{opacity:0;transform:translateY(-34px) scale(.9)}to{opacity:1;transform:none}}
${문제.줄.map((_, i) => `.row.r${i}{animation-delay:${T.rows[i]}s}`).join('')}

/* 물음표 줄 — 좌변과 답이 따로 논다 */
.q{display:flex;align-items:center;gap:18px;font-size:60px;font-weight:800;color:${C.warn};
  animation:qIn .5s ${T.quest}s cubic-bezier(.2,1.5,.4,1)}
@keyframes qIn{from{opacity:0;transform:translateY(26px) scale(.86)}to{opacity:1;transform:none}}
.mark{animation:markOut .22s ${T.reveal}s cubic-bezier(.4,0,1,.6)}
@keyframes markOut{from{opacity:1;transform:none}to{opacity:0;transform:scale(.3) rotate(-24deg)}}
.ans{position:absolute;opacity:0;animation:ansIn .55s ${T.reveal + 0.16}s cubic-bezier(.2,1.7,.4,1)}
@keyframes ansIn{from{opacity:0;transform:scale(2.1) translateY(-16px)}to{opacity:1;transform:none}}
.qwrap{position:relative;display:flex;align-items:center;justify-content:center;min-width:150px}

/* 정답 순간 카드가 한 번 숨을 쉰다 */
.card{animation:cardIn .55s cubic-bezier(.2,1.3,.4,1),breathe .5s ${T.reveal}s ease-out}
@keyframes breathe{0%{}22%{transform:scale(1.035)}100%{transform:none}}

/* 규칙 — 아래에서 올라오고 밑줄이 좌에서 우로 그어진다 */
.rule{margin-top:30px;font-size:31px;line-height:1.62;color:${C.muted};letter-spacing:-.02em;
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

.foot{display:flex;align-items:center;gap:16px;opacity:0;
  animation:footIn .5s ${T.brand}s cubic-bezier(.2,1,.3,1)}
@keyframes footIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.foot b{font-size:40px;font-weight:800;color:${C.text};letter-spacing:-.02em}
.foot span{font-size:31px;color:${C.muted}}
</style></head><body>
<div class="card">
  <span class="chip">${문제.chip}</span>
  <h1>${문제.제목}</h1>
  <div class="box">
    ${문제.줄.map((r, i) => `<div class="row r${i}">${r}</div>`).join('')}
    <div class="q">
      <span>${문제.물음좌}</span>
      <span class="qwrap"><span class="mark">?</span><span class="ans">${문제.답}</span></span>
    </div>
  </div>
  <div class="rule">${문제.규칙}</div>
</div>

<div class="timer">
  <svg width="${R * 2 + 20}" height="${R * 2 + 20}">
    <circle class="track" cx="${R + 10}" cy="${R + 10}" r="${R}"/>
    <circle class="bar" cx="${R + 10}" cy="${R + 10}" r="${R}"/>
  </svg>
  <div class="num"><span>4</span><span>3</span><span>2</span><span>1</span></div>
</div>

<div class="foot">${bulb(48)}<b>딸깍</b><span>· ddalkkak.app</span></div>
</body></html>`;

/* ═══════════ 소리 — shorts-gen.mjs와 같은 파형 ═══════════ */

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
	// 예시 줄이 떨어질 때마다 톡
	for (const t of T.rows) add(t + 0.06, click(2200, 1050, 0.3));
	add(T.quest + 0.08, click(2600, 1200, 0.42));
	// 카운트다운 — 1초에 한 번
	for (let k = 0; k < 4; k++) {
		const t = T.tickFrom + k * 0.875;
		add(t, k % 2 === 0 ? click(2700, 1400, 0.32) : click(2100, 1000, 0.29));
		if (k >= 2) add(t, click(3000, 1500, 0.15));
	}
	for (const [k, f] of [880.0, 1108.7, 1318.5, 1760.0].entries())
		add(T.reveal + k * 0.085, tone(f, 1.6, 0.34, 0.28), 0.3);
	add(T.reveal + 0.34, tone(2637.0, 1.4, 0.3, 0.2), 0.14);

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

const work = join(tmpdir(), `ddal-scene-${process.pid}`);
mkdirSync(work, { recursive: true });
writeFileSync(join(work, 'sfx.wav'), synth());
const htmlPath = join(work, 'scene.html');
writeFileSync(htmlPath, html, 'utf-8');

const PORT = 9416;
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
