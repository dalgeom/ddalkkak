// 데일리 이어 풀기(2026-11-11 점검) — 답을 내고 「다음」 전에 나갔다 오면 판정은 저장됐는데
// 홈은 「0 / 10문제 진행 중」, 이어서 풀기는 같은 문제를 빈칸으로 다시 띄워 답을 고쳐 낼 수 있었다.
// 양성 대조: 고치기 전 코드에서 이 시험은 「0 / 10」 · 1번째 문제로 실패했다(11/11 손으로 확인).
import { launch, sleep } from './cdp.mjs';
const b = await launch('resume');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 40; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(250); } return false; };
const ticks = `return document.querySelector('.ticks')?.getAttribute('aria-label') ?? ''`;

await b.viewport(390, 844, true);
await b.go('/', 1500);
await sleep(3500);
await b.ev(`document.querySelector('.cta').click(); return 1;`);
ok('시작하면 1번째 문제', await until(`document.querySelector('.ticks')?.getAttribute('aria-label')?.startsWith('1번째')`), await b.ev(ticks));
await until(`[...document.querySelectorAll('button')].some((x) => x.textContent.trim() === '모르겠어요')`);
await b.ev(`const g = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '모르겠어요'); g.click(); await new Promise((r) => setTimeout(r, 500));
	const c = [...document.querySelectorAll('button')].find((x) => /^(넘기기|네|확인)$/.test(x.textContent.trim()) && x.offsetParent); if (c) c.click(); return 1;`);
await sleep(600);
await b.go('/', 1500);
await sleep(3500);
const sub = await b.ev(`return document.querySelector('.cta-sub')?.textContent.trim() ?? ''`);
ok('홈 버튼이 푼 개수를 말함', sub.startsWith('1 / 10'), sub);
await b.ev(`document.querySelector('.cta').click(); return 1;`);
ok('이어서 풀면 판정한 문제는 넘김', await until(`document.querySelector('.ticks')?.getAttribute('aria-label')?.startsWith('2번째')`), await b.ev(ticks));

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
