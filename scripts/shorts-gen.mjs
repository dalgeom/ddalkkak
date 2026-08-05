/**
 * 쇼츠(세로 영상)를 만든다.
 *
 *   node scripts/shorts-gen.mjs
 *
 * 합성 화면이 아니라 실제 딸깍을 헤드리스 브라우저로 한 프레임씩 찍는다.
 * /cubenet/guide 의 접기 슬라이더를 코드로 밀어서 진행도를 정확히 통제한다.
 * 그래서 영상 속 움직임이 앱에서 보이는 것과 완전히 같다.
 *
 * 소리도 음원을 받지 않고 파형을 직접 합성한다. 저작권 문제가 원천적으로 없다.
 *   딸깍   시작 신호 — 고음 트랜지언트 + 낮은 몸통을 55ms 간격으로 둘
 *   째깍   생각할 시간 — 0.5초 간격, 높낮이 번갈아, 끝 3번은 세게
 *   또로롱 정답 공개 — A5·C#6·E6·A6 아르페지오
 *
 * 필요한 것: ffmpeg, 크롬 계열 브라우저. 자막은 윈도우 맑은 고딕을 쓴다.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT_DIR = 'promo/video';
const FRAMES = join(tmpdir(), 'ddal-shorts-frames');
const FPS = 30;

/* ── 타임라인(초) ── */
const T = {
	hold: 5.5,   // 전개도 정지 — 풀어보는 시간
	fold: 2.5,   // 접히는 과정
	tail: 2.6,   // 완성 후
	chime: 5.5   // 정답 공개 시점 = hold
};
const TOTAL = T.hold + T.fold + T.tail;

/* ── 색: +layout.svelte 토큰과 같은 값 ── */
const C = { bg: '0xEFE7D8', text: '0x2C2822', accent: '0x2F8F5B', muted: '0x6B6258', dim: '0xA89F8F', warn: '0xC0632E' };

const FONT_B = 'C:/Windows/Fonts/malgunbd.ttf';
const FONT_R = 'C:/Windows/Fonts/malgun.ttf';

/* ═══════════ 1. 소리 ═══════════ */

const SR = 44100;

function synth() {
	const n = Math.round(SR * TOTAL);
	const buf = new Float64Array(n);
	const add = (t0, samples, gain = 1) => {
		const i0 = Math.round(t0 * SR);
		for (let i = 0; i < samples.length; i++) {
			const j = i0 + i;
			if (j >= 0 && j < n) buf[j] += samples[i] * gain;
		}
	};
	/** 감쇠하는 사인. tau가 짧을수록 딱딱하다. */
	const tone = (freq, dur, tau, harm = 0) => {
		const m = Math.round(SR * dur);
		const out = new Float64Array(m);
		for (let i = 0; i < m; i++) {
			const t = i / SR;
			let v = Math.sin(2 * Math.PI * freq * t);
			if (harm) v += harm * Math.sin(2 * Math.PI * freq * 2 * t);
			out[i] = v * Math.exp(-t / tau);
		}
		return out;
	};
	/** 짧고 단단한 타격음 — 고음 트랜지언트 + 낮은 몸통 */
	const click = (hi, lo, gain) => {
		const a = tone(hi, 0.05, 0.004);
		const b = tone(lo, 0.09, 0.013);
		const m = Math.max(a.length, b.length);
		const out = new Float64Array(m);
		for (let i = 0; i < m; i++) {
			out[i] = (i < a.length ? a[i] : 0) * 0.7 * gain + (i < b.length ? b[i] : 0) * 0.5 * gain;
		}
		return out;
	};

	// 딸깍!
	add(0.05, click(2400, 1150, 1.0));
	add(0.105, click(1900, 880, 0.85));

	// 째깍째깍 — 마지막 3번은 조여든다
	const TICK_N = Math.max(0, Math.floor((T.hold - 0.8) / 0.5));
	for (let k = 0; k < TICK_N; k++) {
		const t = 0.8 + k * 0.5;
		add(t, k % 2 === 0 ? click(2700, 1400, 0.34) : click(2100, 1000, 0.3));
		if (k >= TICK_N - 3) add(t, click(3000, 1500, 0.16));
	}

	// 또로롱
	for (const [k, f] of [880.0, 1108.7, 1318.5, 1760.0].entries()) {
		add(T.chime + k * 0.085, tone(f, 1.6, 0.34, 0.28), 0.3);
	}
	add(T.chime + 0.34, tone(2637.0, 1.4, 0.3, 0.2), 0.14);

	// 정규화 + 소프트 클립
	let peak = 0;
	for (const v of buf) peak = Math.max(peak, Math.abs(v));
	const scale = 0.82 / (peak || 1);
	const k = Math.tanh(1.15);
	for (let i = 0; i < n; i++) buf[i] = Math.tanh(buf[i] * scale * 1.15) / k;

	// 16bit 스테레오 WAV
	const data = Buffer.alloc(n * 4);
	for (let i = 0; i < n; i++) {
		const s = Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767)));
		data.writeInt16LE(s, i * 4);
		data.writeInt16LE(s, i * 4 + 2);
	}
	const head = Buffer.alloc(44);
	head.write('RIFF', 0);
	head.writeUInt32LE(36 + data.length, 4);
	head.write('WAVE', 8);
	head.write('fmt ', 12);
	head.writeUInt32LE(16, 16);
	head.writeUInt16LE(1, 20);
	head.writeUInt16LE(2, 22);
	head.writeUInt32LE(SR, 24);
	head.writeUInt32LE(SR * 4, 28);
	head.writeUInt16LE(4, 32);
	head.writeUInt16LE(16, 34);
	head.write('data', 36);
	head.writeUInt32LE(data.length, 40);
	return Buffer.concat([head, data]);
}

/* ═══════════ 2. 프레임 ═══════════ */

const BROWSERS = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium'
];

async function capture() {
	const bin = BROWSERS.find((p) => existsSync(p));
	if (!bin) throw new Error('크롬 계열 브라우저를 못 찾았다. BROWSERS에 경로를 추가해라.');

	rmSync(FRAMES, { recursive: true, force: true });
	mkdirSync(FRAMES, { recursive: true });

	const PORT = 9412;
	const proc = spawn(bin, [
		'--headless=new',
		`--remote-debugging-port=${PORT}`,
		`--user-data-dir=${join(tmpdir(), `ddal-shorts-prof-${process.pid}`)}`,
		'--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'
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
				const to = setTimeout(() => rej(new Error('timeout ' + m)), 45000);
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
		const call = async (fn, ...a) => {
			const r = await send('Runtime.evaluate', {
				expression: `(${fn.toString()})(${a.map((x) => JSON.stringify(x)).join(',')})`,
				returnByValue: true, awaitPromise: true
			});
			if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description).slice(0, 300));
			return r.result.value;
		};

		await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
		await send('Network.setCacheDisabled', { cacheDisabled: true });
		await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1400, deviceScaleFactor: 1, mobile: false });
		await send('Page.navigate', { url: 'https://ddalkkak.app/cubenet/guide' });
		await sleep(4500);

		const rect = await call(function () {
			const stage = document.querySelector('.stage');
			if (!stage) return null;
			stage.scrollIntoView({ block: 'center', behavior: 'instant' });
			const s = document.createElement('style');
			s.textContent = 'body,.stage{background:#efe7d8 !important}';
			document.head.appendChild(s);
			const r = stage.getBoundingClientRect();
			// CDP clip 은 문서 기준 좌표다 — 뷰포트 rect 에 스크롤량을 더한다
			return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height };
		});
		if (!rect) throw new Error('.stage 를 못 찾았다 — /cubenet/guide 구조가 바뀌었나?');

		const setFold = function (v) {
			const el = document.getElementById('g-fold');
			el.value = String(v);
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		};

		const clip = { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 3 };
		let n = 0;
		// 수백 장을 연속으로 찍다 보면 한 번씩 응답이 늦는다 — 한 번은 다시 시도한다
		const grab = async () => {
			let data;
			try {
				({ data } = await send('Page.captureScreenshot', { format: 'png', clip }));
			} catch {
				await sleep(400);
				({ data } = await send('Page.captureScreenshot', { format: 'png', clip }));
			}
			writeFileSync(join(FRAMES, `f${String(n).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
			n++;
		};
		// 앱의 cubic-bezier(0.33, 0, 0.2, 1) 를 비슷하게 흉내낸다
		const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

		await call(setFold, 0);
		await sleep(900);
		for (let i = 0; i < Math.round(T.hold * FPS); i++) await grab();
		const ff = Math.round(T.fold * FPS);
		for (let i = 0; i <= ff; i++) {
			await call(setFold, +ease(i / ff).toFixed(4));
			await grab();
		}
		for (let i = 0; i < Math.round(T.tail * FPS) - 1; i++) await grab();
		console.log(`  프레임 ${n}장 (${(n / FPS).toFixed(1)}초)`);
		return n;
	} finally {
		ws?.close();
		proc.kill();
	}
}

/* ═══════════ 3. 조립 ═══════════ */

function buildFilter(txtDir) {
	const esc = (p) => p.replace(/:/g, '\\\\:');
	const tf = (name) => `textfile=${esc(join(txtDir, name).replace(/\\/g, '/'))}`;
	const dt = (opts) => `drawtext=fontfile=${esc(FONT_B)}:${opts}`;
	const num = (d, t0, t1, color) =>
		`${dt(`text='${d}':fontcolor=${color}:fontsize=132:x=(w-tw)/2:y=1555:enable='between(t,${t0},${t1})'`)}`;

	const lines = [
		`color=c=${C.bg}:s=1080x1920:r=${FPS}:d=${TOTAL}[bg]`,
		`[0:v]crop=530:640:487:12,scale=880:-1[fold]`,
		`[bg][fold]overlay=x=(1080-w)/2:y=415[v0]`,
		`[v0]${dt(`${tf('t1.txt')}:fontcolor=${C.text}:fontsize=76:x=(w-tw)/2:y=210`)}[v1]`,
		`[v1]${dt(`${tf('t2.txt')}:fontcolor=${C.accent}:fontsize=76:x=(w-tw)/2:y=320`)}[v2]`
	];
	// 카운트다운 5→1, 마지막 둘은 주황
	let prev = 'v2';
	for (let k = 5; k >= 1; k--) {
		const t0 = (T.hold - k).toFixed(2);
		const t1 = (T.hold - k + 1).toFixed(2);
		const tag = `c${k}`;
		lines.push(`[${prev}]${num(6 - k > 3 ? k : k, t0, t1, k <= 2 ? C.warn : C.dim)}[${tag}]`);
		prev = tag;
	}
	const brandAt = (T.hold + T.fold - 0.4).toFixed(2);
	lines.push(`[${prev}]${dt(`${tf('t3.txt')}:fontcolor=${C.text}:fontsize=64:x=(w-tw)/2:y=1585:enable='gte(t,${brandAt})'`)}[v3]`);
	lines.push(`[v3]drawtext=fontfile=${esc(FONT_R)}:${tf('t4.txt')}:fontcolor=${C.muted}:fontsize=38:x=(w-tw)/2:y=1680:enable='gte(t,${brandAt})'[vout]`);
	return lines.join(';\n');
}

/* ═══════════ 실행 ═══════════ */

console.log('1) 소리 합성');
const work = join(tmpdir(), `ddal-shorts-${process.pid}`);
mkdirSync(work, { recursive: true });
writeFileSync(join(work, 'sfx.wav'), synth());

console.log('2) 프레임 촬영');
await capture();

console.log('3) 조립');
for (const [name, text] of [
	['t1.txt', '이 전개도를 접으면'],
	['t2.txt', '어떤 주사위가 될까?'],
	['t3.txt', '딸깍'],
	['t4.txt', '매일 두뇌 퍼즐 10문제  ·  ddalkkak.app']
]) writeFileSync(join(work, name), text, 'utf-8');

const filterPath = join(work, 'filter.txt');
writeFileSync(filterPath, buildFilter(work), 'utf-8');

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, '쇼츠-전개도-퀴즈.mp4');
const r = spawnSync('ffmpeg', [
	'-y', '-framerate', String(FPS), '-i', join(FRAMES, 'f%04d.png'),
	'-i', join(work, 'sfx.wav'),
	'-filter_complex_script', filterPath,
	'-map', '[vout]', '-map', '1:a',
	'-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-crf', '20',
	'-c:a', 'aac', '-b:a', '160k', '-shortest', out
], { stdio: ['ignore', 'ignore', 'pipe'] });

if (r.status !== 0) {
	console.error(String(r.stderr).split('\n').slice(-12).join('\n'));
	process.exit(1);
}
console.log(`\n${out} (${TOTAL.toFixed(1)}초, 1080x1920)`);
rmSync(work, { recursive: true, force: true });
rmSync(FRAMES, { recursive: true, force: true });
