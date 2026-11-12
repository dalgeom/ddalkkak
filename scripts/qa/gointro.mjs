// 곧장 온 사람의 1번 위 안내(2026-11-12 실험) — 콘텐츠 쪽 버튼(ddal.go)으로 오면 1번 위에 오늘 구성 한 줄, 판정하면 사라진다.
// 양성 대조: 홈에서 시작 버튼을 누르면 안 뜬다.
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('gointro');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 40; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(250); } return false; };

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	await b.go('/trivia', 500);
	await b.ev(`localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('ddal.go', String(Date.now())); return 1;`);
	await b.go('/', 800);
	ok(`${w} 곧장 오면 1번 위 안내`, await until(`document.querySelector('.go-intro')`));
	const r = await b.ev(`const n = document.querySelector('.go-intro'); if (!n) return null; const x = n.getBoundingClientRect();
		return { text: n.innerText, left: x.left, right: x.right, over: document.documentElement.scrollWidth - innerWidth };`);
	ok(`${w} 안내 문구 · 폭 안`, !!r && /^오늘의 10문제 · .*보너스 1$/.test(r.text) && r.left >= 0 && r.right <= w && r.over <= 0, JSON.stringify(r));
	await b.shot(`${OUT}gointro-${w}.jpg`);
	await b.ev(`[...document.querySelectorAll('button')].find((x) => /모르겠어요/.test(x.innerText))?.click(); return 1;`);
	ok(`${w} 판정하면 사라짐`, await until(`!document.querySelector('.go-intro')`));

	await b.ev(`localStorage.clear(); sessionStorage.clear(); return 1;`);
	await b.go('/', 800);
	await until(`document.querySelector('button.cta:not([disabled])')`);
	await b.ev(`document.querySelector('button.cta').click(); return 1;`);
	ok(`${w} 홈에서 시작하면 1번 화면`, await until(`document.querySelector('.type-chip')`));
	ok(`${w} 홈에서 시작하면 안내 없음`, (await b.ev(`return !!document.querySelector('.go-intro');`)) === false);
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
