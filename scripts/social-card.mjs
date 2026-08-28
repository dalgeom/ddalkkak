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
	'2026-08-27': {
		id: 'rc-ottffss',
		chip: '사슬',
		물음: '물음표에 들어갈 글자는?',
		줄: ['O   T   T   F   F   S   S   ?']
	},
	'2026-08-26': {
		id: 'kr-silent-ieung',
		chip: '한글',
		물음: '물음표에 들어갈 수는?',
		줄: ['아기 → 0', '강아지 → 1', '앙앙 → 2', '옹알이 → ?']
	},
	'2026-08-25': {
		id: 'nm-square-reverse',
		chip: '수열',
		물음: '물음표에 들어갈 수는?',
		줄: ['1    4    9    61    52    ?']
	},
	'2026-08-24': {
		id: 'korean-name-len',
		chip: '한글',
		물음: '물음표에 들어갈 수는?',
		줄: ['11 = 2', '21 = 3', '99 = 3', '105 = ?']
	},
	'2026-08-21': {
		id: 'riddle-yeol',
		chip: '다의어',
		물음: '나는 어떤 한 글자일까요?',
		줄: ['숫자 10이기도 하고,', '몸에서 펄펄 나기도 하고,', '줄지어 맞춰 서기도 합니다.', '나는 한 글자입니다. 뭘까요?']
	},
	'2026-08-20': {
		id: 'ob-trains-meet',
		chip: '관찰',
		물음: '어느 쪽이 서울에 더 가까울까요?',
		줄: ['서울 → 부산 기차와', '부산 → 서울 기차가', '어느 순간 스쳐 지나갔다.', '그 순간, 서울에 가까운 쪽은?']
	},
	'2026-08-19': {
		id: 'kr-vowel-contract',
		chip: '한글',
		물음: '오이는 무엇이 될까요?',
		줄: ['아이 → 애', '사이 → 새', '보이다 → 뵈다', '오이 → ?']
	},
	'blog-함정-방망이': {
		id: 'ob-bat-ball',
		chip: '함정',
		물음: '공은 얼마일까요?',
		줄: ['방망이 + 공 = 1,100원', '방망이는 공보다', '1,000원 비싸다', '공 = ?']
	},
	'blog-함정-달팽이': {
		id: 'snail-well',
		chip: '함정',
		물음: '며칠째 나올까요?',
		줄: ['깊이 10m 우물 바닥', '낮에 3m 오르고', '밤에 2m 미끄러진다', '며칠째 낮에 나올까?']
	},
	'blog-함정-정리': {
		id: '-',
		chip: '왜 틀리나',
		물음: '일곱 문제의 공통점',
		줄: [
			'쉬운 뺄셈을 답으로 안다',
			'「반」이라는 말에 끌린다',
			'무엇이 비례하는지 안 본다',
			'패턴 끝나는 곳을 놓친다',
			'전제를 안 의심한다',
			'계산이 아니라 습관이다'
		]
	},
	'blog-규칙찾기-예시': {
		id: 'diamond-op',
		chip: '이상한 연산',
		물음: '◆는 무슨 계산일까요?',
		줄: ['9 ◆ 9 = 18', '3 ◆ 4 = 21', '7 ◆ 8 = 65', '6 ◆ 7 = ?']
	},
	'blog-규칙찾기-정리': {
		id: '-',
		chip: '막혔을 때',
		물음: '돌려보는 다섯 가지 각도',
		줄: ['1. 가설이 죽는 줄을 찾는다', '2. 결과의 크기를 본다', '3. 숫자를 숫자로 보지 않는다', '4. 전체가 아니라 자리를 본다', '5. 소재는 껍데기다']
	},
	'2026-08-14': {
		id: 'rc-brick-weight',
		chip: '함정',
		물음: '벽돌 하나는 몇 kg?',
		줄: ['벽돌 한 장의 무게는', '1kg에 벽돌 반 장의 무게를', '더한 것과 같다.', '벽돌 한 장 = ? kg']
	},
	'2026-08-13': {
		id: 'cal-hands-overlap',
		chip: '시계',
		물음: '몇 번 겹칠까요?',
		줄: ['시계의 시침과 분침이', '하루(24시간) 동안', '겹치는 횟수는?']
	},
	'2026-08-11': {
		id: 'num-mult-flip',
		chip: '이상한 연산',
		물음: '◇는 무슨 계산일까요?',
		줄: ['2 ◇ 8 = 61', '7 ◇ 6 = 24', '7 ◇ 7 = 94', '6 ◇ 9 = ?']
	},
	'2026-08-10': {
		id: 'cal-clock-wrap',
		chip: '이상한 연산',
		물음: '이 덧셈의 규칙은?',
		줄: ['10 + 5 = 3', '11 + 3 = 2', '9 + 6 = 3', '8 + 9 = ?']
	},
	'2026-08-07': {
		id: 'ob-stair-gap',
		chip: '관찰·추리',
		물음: '계단은 몇 칸일까요?',
		줄: ['1층 → 3층 = 40칸', '1층 → 5층 = 80칸', '2층 → 6층 = ?']
	},
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
	// 한 줄짜리(수열)는 줄 전체를 물들이면 대비가 사라지고, 이어진 수열이 두 덩어리로
	// 보이기까지 한다. 그럴 땐 물음표만 물들인다.
	const rows = card.줄
		.map((r, i) =>
			n === 1
				? `<div class="row">${r.replace(/\?/g, '<span class="qm">?</span>')}</div>`
				: `<div class="row${i === n - 1 ? ' q' : ''}">${r}</div>`
		)
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
 .qm{color:${C.warn};font-weight:800}
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
