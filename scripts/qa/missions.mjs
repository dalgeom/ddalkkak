// 오늘의 미션 잇기(2026-11-12 점검) — 10문제를 끝낸 사람이 성냥 · 초성 미션으로 끊기지 않고 이어 가는지.
// 미션 링크(?today=1)는 허브를 거치지 않고 곧장 오늘 문제를 연다. 끝낸 화면에는 남은 미션 카드가, 다 하면 아무것도 안 뜬다.
// 기록 탭 버튼도 오늘 상태를 따른다(다 풀었는데 「10문제 풀러 가기」가 뜨던 것).
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('missions');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 50; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(300); } return false; };
const reveal = `const x = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === '정답 보기'); x?.click(); return !!x;`;
const cta = `return [...document.querySelectorAll('.cta')].map((a) => a.getAttribute('href')).join(' ');`;

await b.viewport(390, 844, true);
await b.go('/record', 800);
await b.ev(`const d = Math.floor((Date.now() + 32400000) / 86400000);
	localStorage.setItem('ddal.day.' + d, JSON.stringify({ pos: 10, marks: Array(10).fill('clean'), done: true }));
	localStorage.removeItem('ddal.match.daily'); localStorage.removeItem('ddal.cho.daily'); return 1;`);

await b.go('/record', 1200);
const c1 = await b.ev(cta);
ok('기록 탭: 10문제 끝내면 남은 미션으로', /\/matchstick\?today=1/.test(c1), c1);

await b.go('/matchstick?today=1', 1200);
const opened = await until(`/오늘의 성냥개비/.test(document.querySelector('main')?.innerText ?? '') && document.querySelector('.howto')`);
ok('성냥 미션 링크가 곧장 오늘 문제를 연다', opened);
ok('성냥: 정답 보기', await b.ev(reveal));
await until(`document.querySelector('.dnext')`);
const m = await b.ev(`const a = document.querySelector('.dnext'); if (!a) return null; const r = a.getBoundingClientRect();
	return { href: a.getAttribute('href'), text: a.innerText, l: r.left, r: r.right, over: document.documentElement.scrollWidth - innerWidth, howto: !!document.querySelector('.howto') };`);
ok('성냥 끝: 남은 미션(초성) 카드', !!m && m.href === '/chosung?today=1' && /오늘의 초성/.test(m.text), m ? m.text.replace(/\n/g, ' / ') : '없음');
ok('성냥 끝: 카드가 폭 안 · 넘침 없음', !!m && m.l >= 0 && m.r <= 390 && m.over <= 0, JSON.stringify(m && { l: m.l, r: m.r, over: m.over }));
ok('성냥 끝: 「집어요」 안내 사라짐', !!m && !m.howto);
await b.shot(`${OUT}missions-match.jpg`);

await b.ev(`document.querySelector('.dnext').click(); return 1;`);
const cho = await until(`location.pathname === '/chosung' && /오늘의 초성/.test(document.querySelector('.topbar .run')?.innerText ?? '')`);
ok('카드 누르면 오늘의 초성이 곧장 열림', cho);
await b.ev(reveal);
await sleep(800);
ok('미션 다 하면 이어가기 카드 없음', !(await b.ev(`return !!document.querySelector('.dnext');`)));

await b.go('/record', 1200);
const c2 = await b.ev(cta);
ok('기록 탭: 다 하면 지난 문제로', /\/archive/.test(c2) && !/^\/ /.test(c2), c2);

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
