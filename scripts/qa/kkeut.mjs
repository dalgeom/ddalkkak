// 끝말잇기(2026-11-03) — 휴대폰 폭에서 퍼즐 성공 · 연속, 새싹 대결 거절 문구 · 같은 문구 다시 알림 · 한글 입력(IME) 뒤 Enter · 기권,
// 판 끝 결과가 화면 안으로 오는지(scrollY 실측), 입력창이 화면 안에 있는지, 판 끝 뜻풀이 · 말풍선 잘림 · 가로 넘침 · 출처.
import { launch, sleep, OUT } from './cdp.mjs';
import { readFileSync } from 'node:fs';
// node 20은 .ts를 못 읽는다 — 첫날 번호와 첫 퍼즐만 글자로 뽑는다
const src = readFileSync(new URL('../../src/lib/data/kkeutPuzzles.ts', import.meta.url), 'utf8');
const KKEUT_FIRST_DAY = Number(src.match(/KKEUT_FIRST_DAY\s*=\s*(\d+)/)[1]);
const first = src.match(/\{\s*date:\s*'[^']+',\s*start:\s*'([^']+)',\s*line:\s*\[([^\]]+)\]/);
const p = { start: first[1], line: [...first[2].matchAll(/'([^']+)'/g)].map((m) => m[1]) };

const b = await launch('kkeut');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 50; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(300); } return false; };
const say = (w) => b.ev(`const i = document.querySelector('form input'); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
	s.call(i, ${JSON.stringify(w)}); i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('form').requestSubmit(); return 1;`);
const click = (text) => b.ev(`[...document.querySelectorAll('button')].find((x) => x.innerText.includes(${JSON.stringify(text)}))?.click(); return 1;`);
const msgText = `document.querySelector('.msg')?.innerText ?? ''`;
const local = process.env.QA_BASE?.includes('localhost');

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	const q = local ? `?day=${KKEUT_FIRST_DAY}` : '';
	await b.go(`/kkeut${q}`, 800);
	await b.ev(`localStorage.removeItem('ddal.kkeut.daily'); localStorage.removeItem('ddal.kkeut.tier'); localStorage.removeItem('ddal.kkeut.tries'); return 1;`);
	await b.go(`/kkeut${q}`, 800);
	ok(`${w} 사전 불러옴`, await until(`!document.querySelector('.tier')?.disabled`));
	ok(`${w} 규칙 설명`, await b.ev(`return [...document.querySelectorAll('.rules h2')].map((h) => h.innerText).join('|') === '끝말잇기 규칙|오늘의 끝말잇기|대결 단계';`));
	// 해설 링크는 빌드 날짜 기준 어제가 첫날 이후일 때만 뜬다(11/6부터) — 뜨면 그 쪽이 실제로 열리는지
	const ans = await b.ev(`return Promise.all([...document.querySelectorAll('a[href^="/kkeut/answer/"]')].map((a) => fetch(a.href).then((r) => a.getAttribute('href') + ' ' + r.status)));`);
	ok(`${w} 어제 해설 링크가 열림`, ans.every((s) => s.endsWith(' 200')), ans.length ? ans.join(', ') : '링크 없음(빌드 날짜 기준 어제가 첫날 전)');

	if (local) {
		await click('풀어 보기');
		await until(`document.querySelector('form input')`);
		const inView = await b.ev(`const r = document.querySelector('form input').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;`);
		ok(`${w} 입력창이 화면 안`, inView);
		for (let i = 0; i < p.line.length; i += 2) { await say(p.line[i]); await sleep(300); }
		ok(`${w} 정답 길로 막음`, await until(`/막았어요/.test(document.querySelector('.end h2')?.innerText ?? '')`), p.line.join('→'));
		await b.go(`/kkeut${q}`, 800);
		ok(`${w} 새로 고침 뒤 풀었음 · 연속`, await until(`/풀었어요/.test(document.body.innerText) && /1일 연속/.test(document.body.innerText)`));
	}

	await click('새싹');
	await until(`document.querySelector('form input')`);

	// 한글 입력기: 조합 중 → 조합 끝 → Enter. 조합 중 Enter로 제출되거나 글자가 겹치면 안 된다
	await b.ev(`document.querySelector('form input').focus(); return 1;`);
	await b.send('Input.imeSetComposition', { text: 'ㄱ', selectionStart: 1, selectionEnd: 1 });
	await b.send('Input.imeSetComposition', { text: '가', selectionStart: 1, selectionEnd: 1 });
	const mid = await b.ev(`return { v: document.querySelector('form input').value, msg: ${msgText} };`);
	await b.send('Input.insertText', { text: '가' }); // 조합 확정(compositionend)
	const committed = await b.ev(`return document.querySelector('form input').value;`);
	await b.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	await b.send('Input.dispatchKeyEvent', { type: 'char', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
	await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	ok(`${w} 한글 조합 뒤 Enter로 제출`, mid.msg === '' && committed === '가' && (await until(`/두 글자 이상/.test(${msgText})`)),
		JSON.stringify({ 조합중: mid, 확정: committed }));

	// 같은 거절 문구가 연달아 — 한 번 비웠다가 다시 들어와야 화면 낭독기가 다시 읽는다
	await b.ev(`window.__msgSeen = []; const m = document.querySelector('.msg');
		window.__mo = new MutationObserver(() => window.__msgSeen.push(m.innerText)); window.__mo.observe(m, { childList: true, characterData: true, subtree: true }); return 1;`);
	await say('가');
	await sleep(300);
	const seen = await b.ev(`window.__mo.disconnect(); return window.__msgSeen;`);
	ok(`${w} 같은 거절 문구도 다시 알림`, seen.length >= 2 && /두 글자 이상/.test(seen.at(-1)), JSON.stringify(seen));
	ok(`${w} 거절 문구 aria-live`, await b.ev(`return !!document.querySelector('.msg[aria-live]');`));

	await say('뷁뷁');
	ok(`${w} 첫 글자 · 사전 거절 문구`, await until(`/(끝 글자로 시작|사전에 없는)/.test(${msgText})`));

	// 결과가 화면 밖이면 끌어오는지 — 말 목록 위를 일부러 늘려(양성 대조) 결과를 화면 아래로 민 뒤 기권
	await b.ev(`document.querySelector('.chain').style.paddingTop = '1500px'; scrollTo(0, 0); return 1;`);
	await sleep(200);
	const y0 = await b.ev(`return scrollY;`);
	await click('모르겠어요');
	ok(`${w} 기권하면 낼 수 있었던 말`, await until(`document.querySelector('.end .note')?.innerText.length > 1`));
	await sleep(400);
	const sc = await b.ev(`const r = document.querySelector('.end').getBoundingClientRect(); return { y0: ${y0}, y1: Math.round(scrollY), top: Math.round(r.top), vh: innerHeight };`);
	ok(`${w} 판 끝 결과가 화면 안으로`, sc.y1 > sc.y0 && sc.top >= 0 && sc.top < sc.vh, JSON.stringify(sc));
	await b.ev(`document.querySelector('.chain').style.paddingTop = ''; return 1;`);
	await sleep(800);

	const r = await b.ev(`const over = document.documentElement.scrollWidth - innerWidth;
		const cut = [...document.querySelectorAll('.chain li')].some((li) => li.scrollWidth > li.clientWidth + 1);
		return { over, cut, defs: document.querySelectorAll('.chain li span').length };`);
	ok(`${w} 가로 넘침 없음 · 말풍선 잘림 없음`, r.over <= 0 && !r.cut, JSON.stringify(r));
	ok(`${w} 판 끝 뜻풀이`, r.defs > 0, `뜻 ${r.defs}개`);
	ok(`${w} 출처 표기`, await b.ev(`return /한국어기초사전/.test(document.querySelector('.src')?.innerText ?? '');`));
	await b.shot(`${OUT}kkeut-${w}.jpg`);
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
