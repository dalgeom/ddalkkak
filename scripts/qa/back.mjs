// 푸는 중 뒤로가기(2026-11-12 점검) — 10문제 · 초성 · 성냥을 푸는 중에 휴대폰 뒤로가기를 누르면
// 그 놀이의 메뉴가 아니라 직전 페이지로 나가 버렸다. 이제 같은 주소의 처음 화면으로 돌아와야 한다.
// 양성 대조: 고치기 전 운영(11/12 배포 전)에서 이 시험은 세 곳 모두 실패했다.
import { launch, sleep } from './cdp.mjs';
const b = await launch('back');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 40; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(250); } return false; };
const back = async () => { await until(`history.state?.['sveltekit:states']?.play`); await b.ev(`history.back(); return 1;`); await sleep(1200); };
const path = () => b.ev(`return location.pathname`);

await b.viewport(390, 844, true);

// 10문제 — 다른 쪽에서 홈으로 와서 시작
await b.go('/news', 1500);
await b.go('/', 1500);
await sleep(3500);
await b.ev(`document.querySelector('.cta').click(); return 1;`);
ok('10문제: 시작하면 푸는 화면', await until(`document.querySelector('button.exit')`));
await back();
ok('10문제: 뒤로가기는 홈 화면으로', (await path()) === '/' && (await until(`document.querySelector('.cta') && !document.querySelector('button.exit')`)), await path());

// 초성 — 분야 주소로 곧장 들어와 푸는 중
await b.go('/news', 1500);
await b.go('/chosung?c=animal', 1500);
ok('초성: 분야 주소는 곧장 푸는 화면', await until(`document.querySelector('input')`));
await back();
ok('초성: 뒤로가기는 초성 메뉴로', (await path()) === '/chosung' && (await until(`!document.querySelector('input') && document.getElementById('fields')`)), await path());

// 성냥 — 메뉴에서 무한 연습
await b.go('/news', 1500);
await b.go('/matchstick', 1500);
await until(`document.querySelector('button.mode')`);
await sleep(800);
await b.ev(`[...document.querySelectorAll('button')].find((x) => x.textContent.includes('무한 연습')).click(); return 1;`);
ok('성냥: 무한 연습을 누르면 푸는 화면', await until(`!document.querySelector('button.mode')`));
await back();
ok('성냥: 뒤로가기는 성냥 메뉴로', (await path()) === '/matchstick' && (await until(`document.querySelector('button.mode')`)), await path());

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
