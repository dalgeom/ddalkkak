/**
 * 쇼츠(세로 영상)를 만든다. 유형별로 하나씩.
 *
 *   node scripts/shorts-gen.mjs            네 유형 모두
 *   node scripts/shorts-gen.mjs cube       하나만
 *
 * 합성 화면이 아니라 실제 딸깍을 헤드리스 브라우저로 찍는다. 문제가 매번 달라지면
 * 다시 만들 수 없으므로 고정된 주소만 쓴다 — 전개도는 가이드의 고정 예제,
 * 성냥개비는 ?p=번호, 발견형과 상식은 지난 문제(날짜로 고정)다.
 *
 * 구성은 넷 다 같다.
 *   0.0s   딸깍!    문제 등장
 *   0.8s~  째깍째깍  풀어볼 시간, 숫자가 5에서 1로
 *   5.5s   또로롱    정답 공개
 *
 * 소리는 음원을 받지 않고 파형을 직접 합성한다. 저작권 문제가 원천적으로 없다.
 *
 * 필요한 것: ffmpeg, 크롬 계열 브라우저. 자막은 윈도우 맑은 고딕을 쓴다.
 */
import { writeFileSync, copyFileSync, renameSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT_DIR = 'promo/video';
const FRAMES = join(tmpdir(), 'ddal-shorts-frames');
const FPS = 30;
const SCALE = 3;                     // 화면을 3배로 찍어 확대해도 뭉개지지 않게

/* ── 타임라인(초) ── */
const T = { hold: 5.5, reveal: 2.5, tail: 2.6 };
const TOTAL = T.hold + T.reveal + T.tail;

/* ── 색: +layout.svelte 토큰과 같은 값 ── */
const C = {
	bg: '0xEFE7D8', text: '0x2C2822', accent: '0x2F8F5B',
	muted: '0x6B6258', dim: '0xA89F8F', warn: '0xC0632E'
};
/** 문제 그림이 들어갈 자리. 자막과 카운트다운을 피해서 잡았다. */
const BOX = { w: 950, h: 1030, top: 400 };

const FONT_B = 'C:/Windows/Fonts/malgunbd.ttf';
const FONT_R = 'C:/Windows/Fonts/malgun.ttf';

/* ═══════════ 유형 ═══════════ */

const ARCHIVE = 'https://ddalkkak.app/archive/20668';

const TYPES = {
	cube: {
		이름: '전개도',
		파일: '쇼츠-전개도.mp4',
		자막: ['이 전개도를 접으면', '어떤 주사위가 될까?'],
		방식: 'fold',
		url: 'https://ddalkkak.app/cubenet/guide',
		대상: '.stage',
		// 무대 테두리를 잘라내고 큐브를 가운데 둔다 (촬영된 이미지 픽셀 기준 — 이미 SCALE 배)
		crop: [530, 640, 487, 12]
	},
	match: {
		이름: '성냥개비',
		파일: '쇼츠-성냥개비.mp4',
		자막: ['성냥 하나만 옮겨서', '참으로 만들 수 있나요?'],
		// 정답을 누르면 성냥이 집혔다 날아가 안착한다. 두 장으로 끊지 말고 그 과정을 찍는다.
		방식: '실시간',
		url: 'https://ddalkkak.app/matchstick?p=42',
		대상: '.mboard',
		공개: 'button'
	},
	discover: {
		이름: '발견형',
		파일: '쇼츠-발견형.mp4',
		자막: ['규칙은 알려주지 않습니다', '직접 찾아보세요'],
		방식: '전후',
		url: ARCHIVE,
		대상: { 섹션: '발견', 순번: 0 },
		공개: 'details'
	},
	trivia: {
		이름: '상식',
		파일: '쇼츠-상식.mp4',
		자막: ['오늘의 상식 퀴즈', '몇 초 만에 맞힐까?'],
		방식: '전후',
		url: ARCHIVE,
		대상: { 섹션: '상식', 순번: 0 },
		공개: 'details'
	}
};

/* ═══════════ 1. 소리 ═══════════ */

const SR = 44100;

function synth() {
	const n = Math.round(SR * TOTAL);
	const buf = new Float64Array(n);
	const add = (t0, s, gain = 1) => {
		const i0 = Math.round(t0 * SR);
		for (let i = 0; i < s.length; i++) {
			const j = i0 + i;
			if (j >= 0 && j < n) buf[j] += s[i] * gain;
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

	add(0.05, click(2400, 1150, 1.0));                       // 딸
	add(0.105, click(1900, 880, 0.85));                      // 깍

	const TICK_N = Math.max(0, Math.floor((T.hold - 0.8) / 0.5));
	for (let k = 0; k < TICK_N; k++) {
		const t = 0.8 + k * 0.5;
		add(t, k % 2 === 0 ? click(2700, 1400, 0.34) : click(2100, 1000, 0.3));
		if (k >= TICK_N - 3) add(t, click(3000, 1500, 0.16));  // 끝 셋은 조여든다
	}

	for (const [k, f] of [880.0, 1108.7, 1318.5, 1760.0].entries()) {
		add(T.hold + k * 0.085, tone(f, 1.6, 0.34, 0.28), 0.3);
	}
	add(T.hold + 0.34, tone(2637.0, 1.4, 0.3, 0.2), 0.14);

	let peak = 0;
	for (const v of buf) peak = Math.max(peak, Math.abs(v));
	const sc = 0.82 / (peak || 1);
	const k = Math.tanh(1.15);
	for (let i = 0; i < n; i++) buf[i] = Math.tanh(buf[i] * sc * 1.15) / k;

	const data = Buffer.alloc(n * 4);
	for (let i = 0; i < n; i++) {
		const s = Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767)));
		data.writeInt16LE(s, i * 4);
		data.writeInt16LE(s, i * 4 + 2);
	}
	const head = Buffer.alloc(44);
	head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
	head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20);
	head.writeUInt16LE(2, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28);
	head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
	head.write('data', 36); head.writeUInt32LE(data.length, 40);
	return Buffer.concat([head, data]);
}

/* ═══════════ 2. 브라우저 ═══════════ */

const BROWSERS = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium'
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openBrowser() {
	const bin = BROWSERS.find((p) => existsSync(p));
	if (!bin) throw new Error('크롬 계열 브라우저를 못 찾았다. BROWSERS에 경로를 추가해라.');
	const PORT = 9412;
	const proc = spawn(bin, [
		'--headless=new', `--remote-debugging-port=${PORT}`,
		`--user-data-dir=${join(tmpdir(), `ddal-shorts-prof-${process.pid}`)}`,
		'--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'
	], { stdio: 'ignore' });

	let target = null;
	for (let i = 0; i < 40; i++) {
		try {
			const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
			target = list.find((t) => t.type === 'page');
			if (target) break;
		} catch { /* 아직 안 떴다 */ }
		await sleep(500);
	}
	if (!target) { proc.kill(); throw new Error('브라우저가 안 떴다'); }

	const { WebSocket } = await import('ws');
	const ws = await new Promise((res, rej) => {
		const w = new WebSocket(target.webSocketDebuggerUrl);
		w.on('open', () => res(w)); w.on('error', rej);
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
	await send('Emulation.setDeviceMetricsOverride', {
		width: 900, height: 1400, deviceScaleFactor: 1, mobile: false
	});
	return { send, call, close: () => { ws.close(); proc.kill(); } };
}

/* 브라우저 안에서 도는 함수들. call()이 문자열로 넘기므로 바깥 변수를 쓰면 안 된다. */

/* 아래 주입 함수들은 innerText 대신 textContent 를 쓴다 —
   measure 가 대상 밖을 visibility:hidden 으로 감추는데, 그러면 innerText 가 빈 문자열이 된다. */

/** 대상 요소를 찾는다. 섹션 이름이 있으면 아카이브의 그 섹션에서 순번째 카드. */
const FIND = `function(sel, sec, idx){
	if (sec) {
		var s = Array.prototype.slice.call(document.querySelectorAll('section.grp'))
			.filter(function(x){ var h = x.querySelector('h2'); return h && h.textContent.indexOf(sec) >= 0; })[0];
		return s ? s.querySelectorAll('article')[idx] : null;
	}
	return document.querySelector(sel);
}`;

/**
 * 배경을 통일하고, 대상 말고는 전부 숨긴 뒤 문서 기준 위치를 잰다.
 *
 * 정답을 펼친 크기로 클립을 잡으므로, 접힌 동안에는 그 아래 카드가 잘려서
 * 새어 들어온다. display 가 아니라 visibility 로 숨겨야 자리가 그대로라
 * 위치가 흔들리지 않는다.
 *
 * 정답을 펼치면 없던 요소가 생기므로 공개 후에도 다시 불러야 한다.
 */
const measure = new Function('sel', 'sec', 'idx', `
	var find = ${FIND};
	var el = find(sel, sec, idx);
	if (!el) return null;
	el.scrollIntoView({ block: 'center', behavior: 'instant' });
	if (!document.getElementById('shorts-css')) {
		var st = document.createElement('style');
		st.id = 'shorts-css';
		st.textContent = 'body{background:#efe7d8 !important}.stage{background:#efe7d8 !important}';
		document.head.appendChild(st);
	}
	var all = document.body.querySelectorAll('*');
	for (var i = 0; i < all.length; i++) {
		var e = all[i];
		if (e === el || el.contains(e) || e.contains(el)) e.style.visibility = '';
		else e.style.visibility = 'hidden';
	}
	var r = el.getBoundingClientRect();
	// CDP clip 은 문서 기준 좌표다 — 뷰포트 rect 에 스크롤량을 더한다
	return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height };
`);

/** 정답을 펼친다. details 는 열고, 아니면 '정답 보기' 버튼을 누른다. */
const openAnswer = new Function('sel', 'sec', 'idx', 'how', `
	var find = ${FIND};
	var el = find(sel, sec, idx);
	if (!el) return false;
	if (how === 'details') {
		var d = el.querySelector('details');
		if (!d) return false;
		d.open = true;
		return true;
	}
	var b = Array.prototype.slice.call(document.querySelectorAll('button'))
		.filter(function(x){ return x.textContent.indexOf('정답 보기') >= 0; })[0];
	if (!b) return false;
	b.click();
	return true;
`);

/** 다시 접는다(크기를 재고 나서 원상복구할 때). */
const shutAnswer = new Function('sel', 'sec', 'idx', `
	var find = ${FIND};
	var el = find(sel, sec, idx);
	var d = el && el.querySelector('details');
	if (d) d.open = false;
	return true;
`);

/** 슬라이더로 접기 진행도를 민다. */
const setFold = new Function('v', `
	var el = document.getElementById('g-fold');
	el.value = String(v);
	el.dispatchEvent(new Event('input', { bubbles: true }));
	el.dispatchEvent(new Event('change', { bubbles: true }));
	return true;
`);

/* ═══════════ 3. 촬영 ═══════════ */

async function shoot(key) {
	const cfg = TYPES[key];
	rmSync(FRAMES, { recursive: true, force: true });
	mkdirSync(FRAMES, { recursive: true });

	const br = await openBrowser();
	try {
		await br.send('Page.navigate', { url: cfg.url });
		await sleep(4500);

		const sel = typeof cfg.대상 === 'string' ? cfg.대상 : null;
		const sec = sel ? null : cfg.대상.섹션;
		const idx = sel ? 0 : cfg.대상.순번;

		let n = 0;
		const grab = async (clip) => {
			let data;
			// 수백 장을 연속으로 찍다 보면 한 번씩 응답이 늦는다 — 한 번은 다시 시도한다
			try { ({ data } = await br.send('Page.captureScreenshot', { format: 'png', clip })); }
			catch { await sleep(400); ({ data } = await br.send('Page.captureScreenshot', { format: 'png', clip })); }
			const p = join(FRAMES, `f${String(n).padStart(4, '0')}.png`);
			writeFileSync(p, Buffer.from(data, 'base64'));
			n++;
			return p;
		};
		/** 같은 그림이 이어지는 구간은 복사로 채운다 — 굳이 다시 찍을 이유가 없다. */
		const repeat = (src, times) => {
			for (let i = 0; i < times; i++) {
				copyFileSync(src, join(FRAMES, `f${String(n).padStart(4, '0')}.png`));
				n++;
			}
		};

		if (cfg.방식 === 'fold') {
			const rect = await br.call(measure, sel, sec, idx);
			if (!rect) throw new Error(`${cfg.대상} 를 못 찾았다`);
			const clip = { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: SCALE };
			// 앱의 cubic-bezier(0.33, 0, 0.2, 1) 를 비슷하게 흉내낸다
			const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

			await br.call(setFold, 0);
			await sleep(900);
			const first = await grab(clip);
			repeat(first, Math.round(T.hold * FPS) - 1);
			const ff = Math.round(T.reveal * FPS);
			for (let i = 1; i <= ff; i++) {
				await br.call(setFold, +ease(i / ff).toFixed(4));
				await grab(clip);
			}
			const last = join(FRAMES, `f${String(n - 1).padStart(4, '0')}.png`);
			repeat(last, Math.round(T.tail * FPS) - 1);
			return { n, w: rect.w * SCALE, h: rect.h * SCALE };
		}

		/* ── 전후 두 장 ──
		   정답이 붙으면 대상이 커지거나 밀린다(성냥개비는 위에 피드백 줄이 생겨
		   보드가 내려가고, 아카이브 카드는 아래로 자란다). 두 장의 크기가 다르면
		   영상에서 확대율이 튀므로, 문제와 정답 두 위치를 합친 사각형 하나로
		   양쪽을 다 찍는다.

		   합집합을 알려면 정답을 먼저 펼쳐 봐야 한다. 그래서 정답을 먼저 찍고,
		   페이지를 새로 불러 문제를 찍는다. 프레임 번호는 문제가 앞이 되도록
		   따로 매긴다. */
		const r0 = await br.call(measure, sel, sec, idx);
		if (!r0) throw new Error(`${JSON.stringify(cfg.대상)} 를 못 찾았다`);

		if (cfg.방식 === '실시간') {
			/* 정답을 누르면 성냥이 집혔다 날아가 안착한다. 그 과정을 한 프레임씩
			   찍는다. 두 장으로 끊으면 어느 성냥이 움직였는지 알 수가 없다.

			   정답을 누르는 순간 위에 피드백 줄이 생겨 보드가 밀리고, 날아가는
			   성냥이 보드 밖으로 나가면서 상자도 커진다. 두 상태의 큰 쪽 크기를
			   기준으로 각각 제 보드 한가운데를 잘라내면, 크기는 같으면서
			   보드가 화면 안에서 튀지도 않는다. */
			if (!(await br.call(openAnswer, sel, sec, idx, cfg.공개)))
				throw new Error('정답을 펼치지 못했다');
			const r1 = (await br.call(measure, sel, sec, idx)) || r0;

			const cw = Math.max(r0.w, r1.w);
			const ch = Math.max(r0.h, r1.h);
			const centered = (r) => ({
				x: r.x + (r.w - cw) / 2, y: r.y + (r.h - ch) / 2,
				width: cw, height: ch, scale: SCALE
			});

			// 움직이는 구간을 먼저 찍어 따로 보관한다(문제 프레임에 덮이지 않게)
			const moveN = Math.round(T.reveal * FPS);
			const moved = [];
			for (let i = 0; i < moveN; i++) {
				const p = await grab(centered(r1));
				const keep = join(FRAMES, `m${String(i).padStart(4, '0')}.png`);
				renameSync(p, keep);
				moved.push(keep);
			}

			// 문제 화면은 새로 불러 처음부터
			await br.send('Page.navigate', { url: cfg.url });
			await sleep(4500);
			const r0b = (await br.call(measure, sel, sec, idx)) || r0;
			n = 0;
			const first = await grab(centered(r0b));
			repeat(first, Math.round(T.hold * FPS) - 1);
			for (const src of moved) {
				copyFileSync(src, join(FRAMES, `f${String(n).padStart(4, '0')}.png`));
				n++;
			}

			const last = join(FRAMES, `f${String(n - 1).padStart(4, '0')}.png`);
			repeat(last, Math.round(T.tail * FPS) - 1);
			return { n, w: cw * SCALE, h: ch * SCALE };
		}

		const ok = await br.call(openAnswer, sel, sec, idx, cfg.공개);
		if (!ok) throw new Error('정답을 펼치지 못했다');
		await sleep(900);
		const r1 = (await br.call(measure, sel, sec, idx)) || r0;

		const x = Math.min(r0.x, r1.x);
		const y = Math.min(r0.y, r1.y);
		const clip = {
			x, y,
			width: Math.max(r0.x + r0.w, r1.x + r1.w) - x,
			height: Math.max(r0.y + r0.h, r1.y + r1.h) - y,
			scale: SCALE
		};

		/* 두 장이면 충분하다. 사이를 채우는 건 ffmpeg가 크로스페이드로 한다. */
		const after = await grab(clip);
		await br.send('Page.navigate', { url: cfg.url });
		await sleep(4500);
		await br.call(measure, sel, sec, idx);   // 배경 통일 + 대상 밖 감추기
		const before = await grab(clip);

		return { pair: { before, after }, w: clip.width * SCALE, h: clip.height * SCALE };
	} finally {
		br.close();
	}
}

/* ═══════════ 4. 조립 ═══════════ */

const even = (v) => Math.max(2, Math.round(v / 2) * 2);

/** 크로스페이드 길이. 정답이 툭 바뀌지 않고 넘어가도록. */
const XF = 0.4;

/**
 * 움직임을 만든다. 정지 화면 두 장을 이어 붙이면 슬라이드쇼지 영상이 아니다.
 *
 *   등장      아래에서 올라오며 서서히 나타난다 (0~0.35s)
 *   숨 고르기 문제를 보는 동안 아주 천천히 확대된다 (Ken Burns)
 *   시간 막대 화면 맨 아래에서 오른쪽으로 줄어든다
 *   숫자      매 초 살짝 위로 튀며 나타난다
 *   공개      크로스페이드로 넘어가고, 정답이 조금 커졌다 제자리로 (punch)
 *   마무리    브랜드가 떠오른다
 */
function buildFilter(cfg, dim, txtDir) {
	const esc = (p) => p.replace(/:/g, '\\\\:');
	const tf = (name) => `textfile=${esc(join(txtDir, name).replace(/\\/g, '/'))}`;
	const dt = (o) => `drawtext=fontfile=${esc(FONT_B)}:${o}`;

	/* ── 그림 크기 ── */
	let srcW = dim.w;
	let srcH = dim.h;
	let cropPart = '';
	if (cfg.crop) {
		const [cw, ch, cx, cy] = cfg.crop;
		srcW = cw; srcH = ch;
		cropPart = `crop=${cw}:${ch}:${cx}:${cy},`;
	}
	/**
	 * 확대해도 그림이 잘리지 않게 미리 줄여 여백을 만든다.
	 *
	 * zoompan은 화면을 파고들며 가장자리를 잘라낸다. 그냥 확대했더니 카드 왼쪽이
	 * 화면 밖으로 밀려나 깨져 보였다. 최대 배율만큼 미리 줄여 둘레에 여백을 두면,
	 * 확대가 먹는 건 여백이고 카드는 끝까지 온전하다. 다 확대됐을 때 딱 맞는다.
	 */
	const ZMAX = 1.14;
	const s = Math.min(BOX.w / srcW, BOX.h / srcH);
	const W = even(srcW * s);          // 다 확대됐을 때 크기
	const H = even(srcH * s);
	const W0 = even(W / ZMAX);          // 처음 크기
	const H0 = even(H / ZMAX);
	const Y = BOX.top + Math.round((BOX.h - H) / 2);
	const pad = `scale=${W0}:${H0},pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${C.bg}`;

	const lines = [];
	const N = (sec) => Math.round(sec * FPS);
	const ZP = `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS}`;

	if (dim.pair) {
		/* 두 장 → 각각 영상으로 늘리고 크로스페이드로 잇는다.
		   확대 폭이 너무 작으면 프레임이 그대로라 정지 화면처럼 보인다(0.09로
		   했더니 중간중간 프레임 차이가 0이었다). 넉넉히 준다.
		   정답 쪽도 튀어나왔다 멈추면 뒤 2초가 죽는다 — 제자리로 온 뒤 다시
		   천천히 당겨서 끝까지 움직이게 한다. */
		const qLen = T.hold + XF - 0.05;
		const aLen = TOTAL - T.hold + 0.05;
		const punch = N(0.45);
		lines.push(
			`[0:v]${pad},zoompan=z='1+${(ZMAX - 1).toFixed(2)}*on/${N(qLen)}':${ZP}[q]`,
			`[1:v]${pad},zoompan=z='if(lt(on,${punch}),${ZMAX}-${(ZMAX - 1).toFixed(2)}*on/${punch},1+${((ZMAX - 1) / 2).toFixed(3)}*(on-${punch})/${N(aLen) - punch})':${ZP}[a]`,
			`[q][a]xfade=transition=fade:duration=${XF}:offset=${(T.hold - XF / 2).toFixed(2)}[art]`
		);
	} else {
		/* 접히는 과정은 이미 움직인다. 문제를 보는 동안 천천히 당겼다가
		   접히기 시작하면 물러나고, 다 접힌 뒤에도 아주 조금씩 계속 당긴다. */
		const inN = N(T.hold);
		const outN = N(T.reveal);
		const tailN = N(T.tail);
		const d = (ZMAX - 1).toFixed(2);
		lines.push(
			`[0:v]${cropPart}${pad},zoompan=z='if(lt(on,${inN}),1+${d}*on/${inN},if(lt(on,${inN + outN}),${ZMAX}-${d}*(on-${inN})/${outN},1+${((ZMAX - 1) / 2).toFixed(3)}*(on-${inN + outN})/${tailN}))':${ZP}[art]`
		);
	}

	/* 등장 — 아래에서 올라오며 서서히 */
	lines.push(
		`[art]format=yuva420p,fade=t=in:st=0:d=0.35:alpha=1[artf]`,
		`color=c=${C.bg}:s=1080x1920:r=${FPS}:d=${TOTAL}[bg]`,
		`[bg][artf]overlay=x=(1080-w)/2:y='${Y}+70*max(0\\,1-t/0.35)'[v0]`
	);

	/* 자막 — 그림보다 살짝 늦게 */
	lines.push(
		`[v0]${dt(`${tf('t1.txt')}:fontcolor=${C.text}:fontsize=70:x=(w-tw)/2:y=205:alpha='min(1\\,max(0\\,(t-0.15)/0.35))'`)}[v1]`,
		`[v1]${dt(`${tf('t2.txt')}:fontcolor=${C.accent}:fontsize=70:x=(w-tw)/2:y=305:alpha='min(1\\,max(0\\,(t-0.28)/0.35))'`)}[v2]`
	);

	/* 시간 막대 — 맨 아래에서 줄어든다 */
	lines.push(
		`[v2]drawbox=x=0:y=1898:w='1080*(1-min(t/${T.hold}\\,1))':h=14:color=0x2F8F5B@0.9:t=fill:enable='lt(t,${T.hold})'[v2b]`
	);

	/* 카운트다운 — 매 초 살짝 튀어 오르며 나타난다.
	   between(t,a,b)를 쓰면 안 된다 — 양 끝을 포함해 경계에서 앞뒤 숫자가
	   한 프레임 겹쳐 그려진다(3.5초에 3과 2가 포개져 보였다). */
	let prev = 'v2b';
	for (let k = 5; k >= 1; k--) {
		const t0 = (T.hold - k).toFixed(2);
		const t1 = (T.hold - k + 1).toFixed(2);
		const tag = `c${k}`;
		lines.push(
			`[${prev}]${dt(
				`text='${k}':fontcolor=${k <= 2 ? C.warn : C.dim}:fontsize=132:x=(w-tw)/2` +
				`:y='1555-26*max(0\\,1-(t-${t0})/0.22)'` +
				`:alpha='min(1\\,(t-${t0})/0.14)'` +
				`:enable='gte(t,${t0})*lt(t,${t1})'`
			)}[${tag}]`
		);
		prev = tag;
	}

	/* 마무리 — 브랜드가 떠오른다 */
	const bAt = (T.hold + T.reveal - 0.4).toFixed(2);
	lines.push(
		`[${prev}]${dt(`${tf('t3.txt')}:fontcolor=${C.text}:fontsize=60:x=(w-tw)/2:y='1585-18*max(0\\,1-(t-${bAt})/0.4)':alpha='min(1\\,max(0\\,(t-${bAt})/0.4))'`)}[v3]`,
		`[v3]drawtext=fontfile=${esc(FONT_R)}:${tf('t4.txt')}:fontcolor=${C.muted}:fontsize=36:x=(w-tw)/2:y=1675:alpha='min(1\\,max(0\\,(t-${bAt}-0.12)/0.4))'[vout]`
	);
	return lines.join(';\n');
}

/* ═══════════ 실행 ═══════════ */

const want = process.argv[2];
const keys = want ? [want] : Object.keys(TYPES);
for (const k of keys) {
	if (!TYPES[k]) {
		console.error(`모르는 유형: ${k}. 쓸 수 있는 것: ${Object.keys(TYPES).join(', ')}`);
		process.exit(1);
	}
}

mkdirSync(OUT_DIR, { recursive: true });
const work = join(tmpdir(), `ddal-shorts-${process.pid}`);
mkdirSync(work, { recursive: true });
writeFileSync(join(work, 'sfx.wav'), synth());
writeFileSync(join(work, 't3.txt'), '딸깍', 'utf-8');
writeFileSync(join(work, 't4.txt'), '매일 두뇌 퍼즐 10문제  ·  ddalkkak.app', 'utf-8');

for (const key of keys) {
	const cfg = TYPES[key];
	console.log(`\n[${cfg.이름}] 촬영`);
	const dim = await shoot(key);
	console.log(
		dim.pair
			? `  문제·정답 두 장, 원본 ${Math.round(dim.w)}x${Math.round(dim.h)}`
			: `  ${dim.n}장 (${(dim.n / FPS).toFixed(1)}초), 원본 ${Math.round(dim.w)}x${Math.round(dim.h)}`
	);

	writeFileSync(join(work, 't1.txt'), cfg.자막[0], 'utf-8');
	writeFileSync(join(work, 't2.txt'), cfg.자막[1], 'utf-8');
	const filterPath = join(work, 'filter.txt');
	writeFileSync(filterPath, buildFilter(cfg, dim, work), 'utf-8');

	// 두 장짜리는 각각을 영상으로 늘려 넣고, 접기는 프레임 묶음을 그대로 넣는다
	const inputs = dim.pair
		? [
			'-loop', '1', '-framerate', String(FPS), '-t', String(T.hold + XF), '-i', dim.pair.before,
			'-loop', '1', '-framerate', String(FPS), '-t', String(TOTAL - T.hold + XF), '-i', dim.pair.after
		]
		: ['-framerate', String(FPS), '-i', join(FRAMES, 'f%04d.png')];
	const audioIdx = dim.pair ? '2:a' : '1:a';

	const out = join(OUT_DIR, cfg.파일);
	const r = spawnSync('ffmpeg', [
		'-y', ...inputs,
		'-i', join(work, 'sfx.wav'), '-filter_complex_script', filterPath,
		'-map', '[vout]', '-map', audioIdx,
		'-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-crf', '20',
		'-c:a', 'aac', '-b:a', '160k', '-t', String(TOTAL), out
	], { stdio: ['ignore', 'ignore', 'pipe'] });
	if (r.status !== 0) {
		console.error(String(r.stderr).split('\n').slice(-12).join('\n'));
		process.exit(1);
	}
	console.log(`  ${out}`);
}

rmSync(work, { recursive: true, force: true });
rmSync(FRAMES, { recursive: true, force: true });
console.log(`\n${keys.length}개 완성 (각 ${TOTAL.toFixed(1)}초, 1080x1920)`);
