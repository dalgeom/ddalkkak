/**
 * 스레드 글의 댓글을 읽는다. 로그인 없이 공개 페이지에서 긁는다.
 *
 *   node scripts/thread-comments.mjs Dcu22eKI8S1
 *   node scripts/thread-comments.mjs https://www.threads.com/@imhyuniverse/post/Dcu22eKI8S1
 *
 * HTTP만으로는 안 된다 — 본문이 클라이언트에서 렌더된다. scene-matchstick.mjs와
 * 같은 방식으로 헤드리스 브라우저를 띄워 DOM이 찬 뒤에 읽는다.
 *
 * 클래스명이 난독화돼 있어 DOM 구조로는 못 자른다. innerText가 「핸들 / 시간 /
 * 본문…」 순으로 나오는 것을 이용해 줄 단위로 나눈다. 선택자로 짜 봤다가
 * 0건이 나왔다 — 구조에 기대지 마라.
 *
 * 로그인을 안 했으므로 댓글이 전부 보이지는 않는다. 「로그인하여 더 많은
 * 답글을」이 뜨면 경고를 찍는다. 그때 「댓글 N건」은 최소값이지 전부가 아니다.
 *
 * 판정은 하지 않는다 — 답글에 정답을 쓰지 않고 판정도 하지 않는 것이 이
 * 프로젝트의 규칙이다(CLAUDE.md).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = process.argv[2];
if (!arg) { console.error('사용법: node scripts/thread-comments.mjs <글ID 또는 URL>'); process.exit(1); }
const URL_ = arg.startsWith('http') ? arg : `https://www.threads.com/@imhyuniverse/post/${arg}`;

const BIN = [
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'/usr/bin/google-chrome', '/usr/bin/chromium'
].find((p) => existsSync(p));
if (!BIN) { console.error('크롬 계열 브라우저를 못 찾았다.'); process.exit(1); }

const work = join(tmpdir(), `ddal-thc-${process.pid}`);
mkdirSync(work, { recursive: true });
const PORT = 9419;
const proc = spawn(BIN, ['--headless=new', `--remote-debugging-port=${PORT}`,
	`--user-data-dir=${join(work, 'prof')}`, '--no-first-run', '--disable-gpu',
	'--hide-scrollbars', '--disable-background-timer-throttling',
	'--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
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
	const send = (m, p = {}, ms = 45000) => new Promise((res, rej) => {
		const mid = ++id;
		const to = setTimeout(() => rej(new Error('timeout ' + m)), ms);
		const h = (raw) => { const x = JSON.parse(raw);
			if (x.id === mid) { clearTimeout(to); ws.off('message', h);
				x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result); } };
		ws.on('message', h);
		ws.send(JSON.stringify({ id: mid, method: m, params: p }));
	});

	await send('Page.enable');
	await send('Runtime.enable');
	await send('Page.navigate', { url: URL_ });
	await sleep(7000);
	let prev = 0;
	for (let i = 0; i < 10; i++) {
		await send('Runtime.evaluate', { expression: 'window.scrollBy(0, 3000)' });
		await sleep(1500);
		const { result } = await send('Runtime.evaluate', {
			expression: 'document.body.innerText.length', returnByValue: true });
		if (result.value === prev) break;
		prev = result.value;
	}

	const resp = await send('Runtime.evaluate', {
		returnByValue: true,
		expression: [
			'(() => {',
			'  const raw = document.body.innerText;',
			"  const L = raw.split(String.fromCharCode(10)).map((s) => s.trim());",
			"  const stop = L.indexOf('관련 스레드');",
			'  const lines = (stop > 0 ? L.slice(0, stop) : L).filter(Boolean);',
			'  const isTime = (s) => /^[0-9]+(초|분|시간|일|주)$/.test(s);',
			'  const junk = (s) => /^(로그인|스레드|답글|좋아요|리포스트|공유|번역|더 보기)$/.test(s)',
			'    || /^조회 [0-9,]+회$/.test(s) || /^[0-9,]+$/.test(s);',
			'  const out = [];',
			'  for (let i = 0; i < lines.length - 1; i++) {',
			'    if (junk(lines[i]) || !isTime(lines[i + 1])) continue;',
			'    const body = [];',
			'    for (let j = i + 2; j < lines.length; j++) {',
			"      if (!junk(lines[j]) && isTime(lines[j + 1] || '')) break;",
			'      if (!junk(lines[j])) body.push(lines[j]);',
			'    }',
			"    out.push({ handle: lines[i], when: lines[i + 1], text: body.join(' ') });",
			'  }',
			'  return { rows: out, truncated: /로그인하여 더 많은/.test(raw) };',
			'})()'
		].join('\n')
	});

	if (resp.exceptionDetails)
		throw new Error('평가 실패: ' + JSON.stringify(resp.exceptionDetails).slice(0, 600));
	const result = resp.result || {};
	const { rows = [], truncated = false } = result.value || {};
	console.log(`■ ${URL_}`);
	console.log(`  글 ${rows.length}건 (첫 건이 원글, 나머지가 댓글)\n`);
	rows.forEach((r, i) => {
		console.log(`  ${i === 0 ? '[원글] ' : `[댓글${i}]`} @${r.handle}  (${r.when})`);
		console.log(`      ${r.text.slice(0, 400)}\n`);
	});
	if (truncated)
		console.log('  ⚠ 「로그인하여 더 많은 답글을 확인해보세요」 — 안 보이는 댓글이 더 있다.\n' +
			'     위 건수는 최소값이다. 전부라고 적지 마라.');
} catch (e) {
	console.error('실패:', e.message);
	process.exitCode = 1;
} finally {
	try { ws?.close(); } catch { /* */ }
	proc.kill();
}
