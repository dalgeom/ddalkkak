/**
 * 대결 링크 미리보기 그림 36장을 만든다 — static/og/duel.png(점수 없는 링크) · duel-0.png ~ duel-10.png,
 * 답장 링크(&a=&b=, 10/20~) duel-reply-0.png ~ duel-reply-10.png(받는 사람 「나」 점수만 보이고 친구는 ?).
 * 성냥 대결(10/20~, /matchstick/duel) 13장 — mduel.png · mduel-0~5.png · mduel-reply-0~5.png.
 *
 *   node scripts/og-duel.mjs
 *
 * 카카오톡 · 문자에 대결 링크(/trivia/duel?s=&n=&t=)를 붙이면 친구 점수가 그림으로 보이게 한다(10/15 홍보 1번,
 * 시안 docs/시안/duel-og). 시간(t)은 링크마다 달라 그림에 넣지 않고 설명(og:description)에 둔다 —
 * 그때그때 그리는 서버 없이 미리 만든 12장으로 끝난다. 모양 · 색은 og-gen.mjs(기본 카드)와 같은 토큰을 쓴다.
 */
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = 'static/og';
const W = 1200;
const H = 630;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
<style>
	* { box-sizing: border-box; margin: 0; padding: 0; }
	html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
	body { font-family: 'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif; color: #2c2822; word-break: keep-all;
		background-color: #efe7d8; background-image: radial-gradient(rgba(44, 40, 34, 0.06) 2px, transparent 2px); background-size: 28px 28px; }
	.in { position: absolute; inset: 40px; background: #fdfbf6; border: 2px solid #ddd0ba; border-radius: 36px; padding: 52px 64px; display: flex; flex-direction: column; }
	.brand { display: flex; align-items: center; gap: 14px; font-size: 40px; font-weight: 900; }
	.bulb { width: 38px; height: 38px; border-radius: 50%; background: #f6d34e; border: 5px solid #2c2822; position: relative; }
	.bulb::after { content: ''; position: absolute; bottom: -14px; left: 8px; width: 13px; height: 7px; background: #2c2822; border-radius: 2px; }
	.tag { margin-left: auto; font-size: 28px; font-weight: 800; color: #23703f; background: #e7f3ec; border-radius: 14px; padding: 10px 22px; }
	.mid { flex: 1; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 34px; }
	.side { text-align: center; padding: 30px 0 34px; border-radius: 28px; border: 2px solid #ddd0ba; background: #f6f1e6; }
	.side.me { border: 3px dashed #2f8f5b; background: #f1f8f3; }
	.who { font-size: 34px; font-weight: 800; color: #6b6258; }
	.num { font-size: 150px; font-weight: 900; line-height: 1.02; letter-spacing: -4px; }
	.num small { font-size: 54px; color: #6b6258; letter-spacing: 0; }
	.me .num { color: #2f8f5b; }
	.vs { font-size: 70px; font-weight: 900; color: #c0632e; }
	.foot { margin-top: 24px; font-size: 40px; font-weight: 900; text-align: center; }
	.foot b { color: #23703f; }
</style></head><body><div class="in">
	<div class="brand"><span class="bulb"></span>딸깍<span class="tag" id="tag">상식 퀴즈 대결</span></div>
	<div class="mid">
		<div class="side"><div class="who">친구</div><div class="num"><span id="n">?</span><small class="tot"> / 10</small></div></div>
		<div class="vs">VS</div>
		<div class="side me"><div class="who">나</div><div class="num"><span id="m">?</span><small class="tot"> / 10</small></div></div>
	</div>
	<div class="foot" id="foot"></div>
</div></body></html>`;

/** 그림 아래 한 줄 — 점수가 같으면 빠른 쪽이 이기므로(duel.ts duelOutcome) 「n+1개면 이긴다」는 언제나 참이다 */
export function footOf(n) {
	if (n === null) return '같은 상식 10문제, <b>누가 더 많이</b> 맞힐까요?';
	if (n === 10) return '만점을 넘으려면 <b>더 빨라야</b> 해요';
	if (n === 0) return '<b>하나만</b> 맞혀도 이겨요';
	return `<b>${n + 1}개</b> 맞히면 이겨요`;
}

/** 성냥 대결(10/20, matchDuel.ts) — 5문제, 「맞힌다」 대신 「푼다」 */
export function mfootOf(n) {
	if (n === null) return '같은 성냥 5문제, <b>누가 더 많이</b> 풀까요?';
	if (n === 5) return '만점을 넘으려면 <b>더 빨라야</b> 해요';
	if (n === 0) return '<b>하나만</b> 풀어도 이겨요';
	return `<b>${n + 1}개</b> 풀면 이겨요`;
}

const REPLY_FOOT = '<b>결과가 도착했어요</b> · 누가 이겼을까요?';

/** 대결 종류마다 한 벌 — 이름 앞머리 · 띠 글자 · 문제 수 · 아래 한 줄 */
const KINDS = [
	{ prefix: 'duel', tag: '상식 퀴즈 대결', total: 10, foot: footOf },
	{ prefix: 'mduel', tag: '성냥개비 대결', total: 5, foot: mfootOf }
];

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
mkdirSync(DIR, { recursive: true });
const htmlPath = join(tmpdir(), `ddal-og-duel-${process.pid}.html`);
writeFileSync(htmlPath, html, 'utf-8');

const PORT = 9412;
const proc = spawn(bin, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(tmpdir(), `ddal-og-duel-prof-${process.pid}`)}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
	let target = null;
	for (let i = 0; i < 40 && !target; i++) {
		try {
			target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
		} catch { /* 아직 안 떴다 */ }
		if (!target) await sleep(500);
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
					clearTimeout(to);
					ws.off('message', h);
					x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result);
				}
			};
			ws.on('message', h);
			ws.send(JSON.stringify({ id: mid, method: m, params: p }));
		});
	await send('Page.enable');
	await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
	await send('Page.navigate', { url: 'file:///' + htmlPath.replace(/\\/g, '/') });
	await sleep(2500); // 웹폰트 도착 대기
	const shot = async (expression, out) => {
		await send('Runtime.evaluate', { expression });
		await sleep(150);
		const { data } = await send('Page.captureScreenshot', { format: 'png' });
		writeFileSync(out, Buffer.from(data, 'base64'));
		console.log(`${out} (${Math.round(Buffer.from(data, 'base64').length / 1024)}KB)`);
	};
	for (const k of KINDS) {
		const scores = Array.from({ length: k.total + 1 }, (_, i) => i);
		const frame = `document.getElementById('tag').textContent=${JSON.stringify(k.tag)};document.querySelectorAll('.tot').forEach((e)=>e.textContent=${JSON.stringify(' / ' + k.total)});`;
		for (const n of [null, ...scores]) {
			await shot(
				`${frame}document.getElementById('m').textContent='?';document.getElementById('n').textContent=${JSON.stringify(n === null ? '?' : String(n))};document.getElementById('foot').innerHTML=${JSON.stringify(k.foot(n))};`,
				`${DIR}/${k.prefix}${n === null ? '' : '-' + n}.png`
			);
		}
		// 답장 — 도전장을 보낸 사람이 받는다. 내 점수만 보이고 친구 점수는 감춘다(duel.ts duelOg · matchDuel.ts)
		for (const m of scores) {
			await shot(
				`${frame}document.getElementById('n').textContent='?';document.getElementById('m').textContent=${JSON.stringify(String(m))};document.getElementById('foot').innerHTML=${JSON.stringify(REPLY_FOOT)};`,
				`${DIR}/${k.prefix}-reply-${m}.png`
			);
		}
	}
} finally {
	ws?.close();
	proc.kill();
	try { unlinkSync(htmlPath); } catch { /* 이미 없으면 그만 */ }
}
