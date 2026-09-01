/**
 * 성냥개비 쇼츠 — 화면 전체를 CSS 애니메이션으로 만들고 프레임 단위로 찍는다.
 *
 *   node scripts/scene-matchstick.mjs
 *
 * scene-discover.mjs와 같은 방식. 보드는 MatchstickBoard.svelte의 좌표·색을
 * 그대로 옮겼다 — 검은 보드, 켜진 성냥은 네온 초록, 집으면 주황.
 * 정답 공개에서 옮길 성냥이 주황으로 집혔다가 목적지로 날아가 초록으로
 * 안착한다. 사이트에서 정답 볼 때 나오는 그 연출이다.
 *
 * CSS 애니메이션을 전부 멈춰 두고 Web Animations API로 currentTime을 직접
 * 밀어 한 프레임씩 찍는다. 몇 번을 돌려도 같은 영상이 나온다.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FRAMES = join(tmpdir(), 'ddal-mscene-frames');
const W = 1080, H = 1920, FPS = 30;

/* ── 타임라인(초). 소리와 맞춰야 한다 ── */
const T = {
	glyphs: [0.55, 0.75, 0.95, 1.15, 1.35], // 식의 다섯 글자가 차례로 켜진다
	quest: 1.75,                             // "지금은 틀린 식입니다"
	tickFrom: 2.1,                           // 카운트다운 시작
	pick: 5.6,                               // 옮길 성냥이 주황으로 집힌다
	fly: 6.1,                                // 날아간다 (0.9초)
	land: 7.0,                               // 안착 — solution이 완성된다
	rule: 7.35,                              // 규칙 설명
	brand: 8.2,                              // 주소
	total: 11.9
};

const C = {
	bg: '#efe7d8', panel: '#fdfbf6', border: '#ddd0ba',
	text: '#2c2822', muted: '#6b6258', accent: '#2f8f5b',
	gold: '#f6d34e', chipBg: '#e7f3ec', chipText: '#2f8f5b', warn: '#c0632e'
};

/* ── 문제 ──
   matchstick-problems.json의 한 줄을 그대로 옮긴다. 어느 성냥이 어디로 가는지는
   dump-matchstick.mjs가 두 식의 세그먼트 차이로 계산해 준다 — 손으로 좌표를 잡던
   것을 자동화한 것이라, 문제를 바꾸려면 이 블록만 갈아 끼우면 된다.
   지원하는 모양은 '한 자리 X (+|-) 한 자리 Y = 한 자리 Z' 하나뿐이다. */
const 문제 = {
	displayed: '1 - 4 = 6',
	solution: '1 + 4 = 5',
	from: [4, 'e'], // 6의 왼아래를 집어
	to: [1, 'v']    // + 자리로 옮긴다
};
/* ── 해설 문구는 문제에서 뽑는다 ──
   손으로 적어 두면 문제만 갈고 문구는 그대로 남는다. 2026-08-24에 실제로 그렇게
   나갔다 — 화면은 1-6=7인데 해설은 앞 문제의 「8 − 2 = 6」이 붙은 영상을 만들었다.
   from/to의 자리와 획을 우리말로 옮겨 문장을 만들면 어긋날 수가 없다. */
const 획이름 = {
	a: '윗획', b: '오른쪽 위', c: '오른쪽 아래', d: '아랫획',
	e: '왼쪽 아래', f: '왼쪽 위', g: '가운뎃획',
	// 연산자·등호의 마디. dump-matchstick.mjs의 segset()이 내는 이름과 같아야 한다.
	// 이게 없어서 13호(1-4=6, 목적지가 연산자라 'v')를 찍었을 때 영상 본편에
	// 「연산자 -의 undefined에 놓으면」이 그대로 박혔다. 20분을 버렸다.
	h: '가로획', v: '세로 자리', e1: '윗줄', e2: '아랫줄'
};

/** 모르는 마디 이름이면 렌더 전에 멈춘다 — undefined를 영상에 굽는 것보다 낫다. */
function 획(키) {
	const n = 획이름[키];
	if (!n) throw new Error(`획이름에 '${키}'가 없다. dump-matchstick.mjs의 NAME과 맞춰라.`);
	return n;
}
/** 숫자를 읽은 소리의 받침 — 조사가 갈린다. 일·칠은 「은」, 이·사는 「는」 */
const 받침있음 = [true, true, false, true, false, false, true, true, true, false];
const 을를 = (w) => (/[가-힣]$/.test(w) && (w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '을' : '를');

function 해설() {
	const 식글자 = [...문제.displayed.replace(/ /g, '')];
	const 답글자 = [...문제.solution.replace(/ /g, '')];
	/** 식에서 i번째 글자를 뭐라 부를지 — 1은 연산자, 3은 등호, 나머지는 숫자 */
	const 자리 = (i) => (i === 1 ? `연산자 ${식글자[i]}` : i === 3 ? '등호' : 식글자[i]);
	const 집 = `${자리(문제.from[0])}의 ${획(문제.from[1])}`;
	const 놓 = `${자리(문제.to[0])}의 ${획(문제.to[1])}`;
	const 바뀐 = 식글자
		.map((c, i) => {
			if (c === 답글자[i]) return null;
			const 은는 = /\d/.test(c) && 받침있음[Number(c)] ? '은' : '는';
			return `${c}${은는} ${답글자[i]}로`;
		})
		.filter(Boolean);
	return { 집, 놓, 집조사: 을를(집), 결과: 바뀐.length ? `${바뀐.join(', ')} 바뀝니다.` : '식이 성립합니다.' };
}
const 설명 = 해설();

const OUT = `promo/video/쇼츠-성냥개비-${문제.displayed.replace(/ /g, '')}.mp4`;
const 식 = 문제.displayed.replace(/ /g, '');
const [D0, OPCH, D1, , D2] = [...식].map((c, i) => (i === 1 || i === 3 ? c : Number(c)));


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

/* 자리 번호(식의 글자 위치) → 화면 x. 연산자·등호는 폭이 달라 따로 잡는다 */
const SLOT_X = { 0: X0, 1: OPX, 2: X1, 3: EQX, 4: X2 };
/* 연산자 획도 세그먼트처럼 다룬다 — h는 가로, v는 세로(+에만 있다) */
const OP_RECT = { h: [4, 43.5, 34, 8], v: [17, 30, 8, 35] };

/** 자리와 세그먼트 이름으로 화면 사각형을 만든다 */
function rectOf([slot, seg]) {
	const box = OP_RECT[seg] ?? SEG_RECT[seg];
	if (!box) throw new Error(`모르는 세그먼트: ${seg}`);
	const [rx, ry, rw, rh] = box;
	return { x: SLOT_X[slot] + rx, y: ry, w: rw, h: rh };
}

const FLY_FROM = rectOf(문제.from);
const FLY_TO = rectOf(문제.to);

/** 숫자 하나의 세그먼트들. 켜진 것은 lit, 꺼진 것은 ghost 슬롯. */
function digit(x, d, cls, skip = '') {
	const on = DIGIT_SEGS[d].replace(skip, '');
	// 바깥 g는 위치만 잡는다. CSS transform 애니메이션을 바깥에 걸면
	// transform:none이 translate 속성을 덮어써 글리프가 전부 원점에 쌓인다.
	return `<g transform="translate(${x} 0)"><g class="${cls}">` +
		Object.entries(SEG_RECT).map(([seg, [rx, ry, rw, rh]]) =>
			`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="3"
				class="${on.includes(seg) ? 'lit' : 'ghost'}"/>`).join('') +
		`</g></g>`;
}

/** 그 자리에서 날아갈 성냥은 보드에서 빼 둔다 — flyer가 대신 그린다 */
const skipAt = (slot) => (문제.from[0] === slot ? 문제.from[1] : '');

/** 연산자 — 날아갈 획은 빼고 그린다 */
function opGlyph() {
	const parts = OPCH === '+' ? ['h', 'v'] : ['h'];
	const skip = skipAt(1);
	return parts
		.filter((k) => k !== skip)
		.map((k) => {
			const [rx, ry, rw, rh] = OP_RECT[k];
			return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="3" class="fixed"/>`;
		})
		.join('');
}

const board = `
<svg class="fit" viewBox="-4 -4 ${BW + 8} ${GH + 8}">
  ${digit(X0, D0, 'gl g0', skipAt(0))}
  <g transform="translate(${OPX} 0)"><g class="gl g1">${opGlyph()}</g></g>
  ${digit(X1, D1, 'gl g2', skipAt(2))}
  <g transform="translate(${EQX} 0)"><g class="gl g3">
    <rect x="1" y="37" width="30" height="7" rx="3" class="fixed"/>
    <rect x="1" y="51" width="30" height="7" rx="3" class="fixed"/>
  </g></g>
  ${digit(X2, D2, 'gl g4', skipAt(4))}
  <!-- 도착 자리는 digit()이 이미 ghost 슬롯으로 그려 두었다 -->
  <!-- 날아가는 성냥: 처음엔 원래 자리에서 초록, 집히면 주황, 안착하면 다시 초록 -->
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
    <span class="after">${문제.solution.replace(/-/g, '−')} &nbsp;딸깍!</span>
  </div>
  <div class="rule"><b>${설명.집}</b>${설명.집조사} 뽑아 <b>${설명.놓}</b>에 놓으면<br>
    ${설명.결과}</div>
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

	// fromSurface:false는 프레임 30부터 무조건 타임아웃이 났다 — 다시 넣지 마라.
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
rmSync(work, { recursive: true, force: true });
rmSync(FRAMES, { recursive: true, force: true });

/* ── 올릴 때 쓸 제목·설명 ──
   promo/쇼츠-올리기.md의 성냥개비 예시 설명은 「0 + 8 = 3」에 박혀 있다. 문제를
   갈아도 그 문서는 안 따라오니 매번 손으로 고쳐야 하고, 그러다 자막이 어긋난 것과
   같은 사고가 난다. 문제를 아는 건 이 스크립트뿐이니 여기서 같이 찍는다.
   틀은 쇼츠-올리기.md의 「제목·태그 표준(2026-08-12 고정)」 그대로다. */
console.log(`
─────────── 올릴 때 쓸 것 ───────────
[제목]
성냥 하나만 옮겨서 참으로 만들 수 있나요? #shorts

[설명]
${문제.displayed}

성냥 하나를 집어서 다른 자리에 놓으면 참이 됩니다.
부러뜨리거나 빼면 안 돼요.

이런 문제가 741개 있습니다. 전부 프로그램이 만들고 프로그램이 검증했어요.
답이 하나뿐이라는 것도 코드가 보증합니다.

ddalkkak.app/matchstick

#딸깍 #두뇌퍼즐 #퍼즐 #성냥개비 #성냥개비퀴즈

[정답] ${문제.solution} — ${설명.집}${설명.집조사} 뽑아 ${설명.놓}에 놓는다
─────────────────────────────────────`);
