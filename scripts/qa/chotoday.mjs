// 초성 분야 풀이 → 오늘의 초성 입구(2026-10-27) — 분야 쪽(?c=)에서 곧장 풀이로 들어온 사람에게 결과 아래 「오늘의 초성」 카드가 뜨는지,
// 누르면 오늘의 초성으로 가는지, 오늘 것을 끝낸 뒤에는 다시 안 뜨는지, 휴대폰 폭에서 넘치지 않는지.
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('chotoday');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 50; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(300); } return false; };
const reveal = `[...document.querySelectorAll('.controls button')].find((x) => x.innerText.includes('정답 보기'))?.click(); return 1;`;

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	await b.go('/chosung?c=animal', 800);
	await b.ev(`localStorage.removeItem('ddal.cho.daily'); return 1;`);
	await b.go('/chosung?c=animal', 800);
	await until(`document.querySelector('.card .tiles')`);
	ok(`${w} 풀이 전에는 카드 없음`, !(await b.ev(`return !!document.querySelector('.todaynudge');`)));
	await b.ev(reveal);
	await until(`document.querySelector('.todaynudge')`);
	const r = await b.ev(`const n = document.querySelector('.todaynudge'); if (!n) return null; const x = n.getBoundingClientRect();
		return { left: x.left, right: x.right, over: document.documentElement.scrollWidth - innerWidth, text: n.innerText };`);
	ok(`${w} 결과 아래 오늘의 초성 카드`, !!r && /오늘의 초성/.test(r.text), r ? r.text.replace(/\n/g, ' / ') : '없음');
	ok(`${w} 카드가 화면 폭 안 · 가로 넘침 없음`, !!r && r.left >= 0 && r.right <= w && r.over <= 0, JSON.stringify(r && { l: r.left, r: r.right, over: r.over }));
	await b.shot(`${OUT}chotoday-${w}.jpg`);
	await b.ev(`document.querySelector('.todaynudge').click(); return 1;`);
	await until(`/오늘의 초성/.test(document.querySelector('.topbar .run')?.innerText ?? '')`);
	const run = await b.ev(`return document.querySelector('.topbar .run')?.innerText ?? '';`);
	ok(`${w} 누르면 오늘의 초성으로`, /오늘의 초성/.test(run), run);
	await b.ev(reveal);
	await sleep(400);
	await b.go('/chosung?c=animal', 800);
	await until(`document.querySelector('.card .tiles')`);
	await b.ev(reveal);
	await sleep(600);
	ok(`${w} 오늘 것을 끝낸 뒤엔 카드 안 뜸`, !(await b.ev(`return !!document.querySelector('.todaynudge');`)));
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
