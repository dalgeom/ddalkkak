// 글 → 문제 → 글 왕복(2026-11-02) — 마방진 글 끝 카드로 card-15-fork에 들어가 풀고, 해설 링크로 글에 돌아오는지.
// 양성 대조: 카드가 없는 글(clock-angle)에서 .play가 0개, 친구 링크(from 없음)는 친구 문구 그대로.
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('readplay');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 40; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(250); } return false; };

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	await b.go('/read/clock-angle', 800);
	ok(`${w} 카드 없는 글엔 안 뜸`, (await b.ev(`return document.querySelectorAll('a.play').length;`)) === 0);
	await b.go('/read/magic-square', 800);
	const r = await b.ev(`const n = document.querySelector('a.play'); if (!n) return null; n.scrollIntoView({ block: 'center' }); const x = n.getBoundingClientRect();
		return { left: x.left, right: x.right, over: document.documentElement.scrollWidth - innerWidth, href: n.getAttribute('href') };`);
	ok(`${w} 글 끝 카드 · 폭 안`, !!r && r.left >= 0 && r.right <= w && r.over <= 0, JSON.stringify(r));
	await sleep(300);
	await b.shot(`${OUT}readplay-${w}.jpg`);
	await b.ev(`document.querySelector('a.play').click(); return 1;`);
	await until(`location.pathname === '/q/card-15-fork' && document.querySelector('.from')`);
	const from = await b.ev(`return document.querySelector('.from')?.innerText ?? '';`);
	ok(`${w} 누르면 문제로 · 출처 문구`, /글에서 이어지는/.test(from), from);
	await b.ev(`const i = document.querySelector('input[type=text], input:not([type])'); i.focus(); document.execCommand('insertText', false, '8'); return 1;`);
	await sleep(200);
	await b.ev(`(document.querySelector('form button[type=submit]') ?? [...document.querySelectorAll('button')].find((x) => /확인|제출/.test(x.innerText))).click(); return 1;`);
	ok(`${w} 맞히면 해설에 글 링크`, await until(`document.querySelector('.explain a[href="/read/magic-square"]')`));
	const link = await b.ev(`return getComputedStyle(document.querySelector('.explain a')).color;`);
	ok(`${w} 해설 링크가 브라우저 기본 파랑이 아님`, link !== 'rgb(0, 0, 238)', link);
	await b.shot(`${OUT}readplay-q-${w}.jpg`);
	await b.ev(`document.querySelector('.explain a[href="/read/magic-square"]').click(); return 1;`);
	ok(`${w} 링크로 글에 돌아옴`, await until(`location.pathname === '/read/magic-square'`));
	await b.go('/q/card-15-fork', 800);
	const friend = await b.ev(`return document.querySelector('.from')?.innerText ?? '';`);
	ok(`${w} 친구 링크 문구는 그대로`, /친구/.test(friend), friend);
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
