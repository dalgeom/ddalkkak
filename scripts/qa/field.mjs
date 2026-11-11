// 상식 분야만 풀기(2026-11-11) — 사용자: 「국기 분야를 눌러도 해설만 나오고 그 분야만 푸는 모드가 없다」.
// 분야 쪽 「바로 풀기」 → /play?field= → 건너뛰기 10번 동안 그 분야만 → 고른 칩이 화면 안 → 「전체」로 바꾸면 주소에서 분야가 빠짐.
// 양성 대조: 「모든 분야」로 바꾸면 10번 안에 두 분야 이상이 나와야 한다(라벨 읽기가 살아 있는지).
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('field');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 40; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(250); } return false; };
const labels = `const lab = () => document.querySelector('.cat-chip')?.textContent.split(' · ')[0].trim(); const seen = [];
	for (let k = 0; k < 10; k++) { seen.push(lab()); [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '건너뛰기')?.click(); await new Promise((r) => setTimeout(r, 300)); }
	return seen;`;

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	await b.go('/trivia/flag', 800);
	const href = await b.ev(`return document.querySelector('a.cta.top')?.getAttribute('href');`);
	ok(`${w} 국기 쪽 버튼이 국기만 풀기로`, href === '/play?filter=trivia&field=flag', href);
	await b.ev(`document.querySelector('a.cta.top').click(); return 1;`);
	ok(`${w} 누르면 무한 연습`, await until(`location.pathname === '/play' && document.querySelector('.fchip.active')`));
	await sleep(400);
	const chip = await b.ev(`const c = document.querySelector('.fchip.active'); const r = c.getBoundingClientRect(); return { t: c.textContent, left: r.left, right: r.right, over: document.documentElement.scrollWidth - innerWidth };`);
	ok(`${w} 고른 칩 「국기」가 화면 안 · 가로 넘침 없음`, chip.t === '국기' && chip.left >= 0 && chip.right <= w && chip.over <= 0, JSON.stringify(chip));
	await b.shot(`${OUT}field-${w}.jpg`);
	const seen = await b.ev(labels);
	ok(`${w} 10문제 모두 국기`, seen.every((x) => x === '국기'), seen.join(','));
	await b.ev(`[...document.querySelectorAll('.fchip')].find((x) => x.textContent.trim() === '모든 분야').click(); return 1;`);
	await sleep(400);
	const mix = await b.ev(labels);
	ok(`${w} (대조) 모든 분야면 섞여 나옴`, new Set(mix).size >= 2, mix.join(','));
	await b.ev(`[...document.querySelectorAll('.fchip')].find((x) => x.textContent.trim() === '수도').click(); return 1;`);
	await sleep(300);
	ok(`${w} 수도 고르면 주소에 field=capital`, (await b.ev(`return location.search;`)).includes('field=capital'));
	await b.ev(`[...document.querySelectorAll('.filter')].find((x) => x.textContent.trim() === '전체').click(); return 1;`);
	await sleep(300);
	const q = await b.ev(`return location.search;`);
	ok(`${w} 전체로 바꾸면 주소에서 분야가 빠짐`, !q.includes('field='), q);
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
