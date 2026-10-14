// 아래에서 올라오는 시트 · 스플래시 시험 — 실제 터치 이벤트(CDP Input.dispatchTouchEvent)로 끈다
import { launch, sleep, OUT } from './cdp.mjs';
const res = [];
const ok = (n, p, d = '') => { res.push({ n, p }); console.log(`${p ? '통과' : '실패'}  ${n}${d ? '  — ' + d : ''}`); };

async function drag(b, x, y0, y1, ms = 300, steps = 12) {
	await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
	for (let i = 1; i <= steps; i++) {
		await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / steps }] });
		await sleep(ms / steps);
	}
	await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const rect = (b, sel) => b.ev(`const e=document.querySelector('${sel}'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+r.width/2, top:r.top, bottom:r.bottom, h:r.height};`);
const isOpen = (b) => b.ev(`return !!document.querySelector('.sheet.show');`);
async function openFb(b) {
	await b.ev(`document.querySelector('.fbtn').click(); return 1;`);
	await sleep(500);
}

// ── 시트 ──
const b = await launch('sheet');
await b.viewport(390, 844);
await b.go('/games', 2500);

// A. 올라오는 움직임: 누른 직후 몇 번 재서 아래 → 위로 움직이는지
await b.ev(`document.querySelector('.fbtn').click(); return 1;`);
const ys = [];
for (let i = 0; i < 6; i++) { ys.push(Math.round((await rect(b, '.panel'))?.top ?? -1)); await sleep(60); }
ok('A 열 때 아래에서 미끄러져 올라옴', ys[0] > ys.at(-1) + 80 && ys.every((v, i) => i === 0 || v <= ys[i - 1] + 1), ys.join(' → '));
await sleep(300);
await b.shot(OUT + 'S-open.jpg');

// B. 조금 끌었다 놓으면 제자리
let p = await rect(b, '.handle');
const top0 = (await rect(b, '.panel')).top;
await drag(b, p.x - 60, p.top + 10, p.top + 70, 400);
await sleep(450);
ok('B 조금(60px) 끌면 제자리로', (await isOpen(b)) && Math.abs((await rect(b, '.panel')).top - top0) < 3);

// D. 위로 끌면 커짐
p = await rect(b, '.handle');
await drag(b, p.x - 60, p.top + 10, p.top - 120, 300);
await sleep(450);
const hExp = (await rect(b, '.panel')).h;
ok('D 위로 끌면 화면 높이까지 커짐', hExp > 844 * 0.9, `높이 ${Math.round(hExp)}px`);
// 커진 상태에서 조금 내리면 먼저 작아짐
p = await rect(b, '.handle');
await drag(b, p.x - 60, p.top + 10, p.top + 150, 500);
await sleep(450);
ok('D2 커진 상태에서 내리면 먼저 작아짐(안 닫힘)', (await isOpen(b)) && (await rect(b, '.panel')).h < hExp - 50);

// C. 많이 끌면 닫힘 — 놓는 순간부터 아래로 내려가며 사라짐
p = await rect(b, '.handle');
const before = (await rect(b, '.panel')).top;
await drag(b, p.x - 60, p.top + 10, p.top + 320, 350);
const mid = (await rect(b, '.panel'))?.top ?? 9999;
await sleep(500);
ok('C 많이(320px) 끌면 내려가며 닫힘', !(await isOpen(b)) && mid > before + 200, `놓은 직후 위치 ${Math.round(mid)} (처음 ${Math.round(before)})`);

// 빠르게 튕기기(짧게 120px, 빠르게)
await openFb(b);
p = await rect(b, '.handle');
await drag(b, p.x - 60, p.top + 10, p.top + 130, 80, 4);
await sleep(500);
ok('C3 짧아도 빠르게 튕기면 닫힘', !(await isOpen(b)));

// H. 내용 영역(맨 위)에서 끌어 내리면 닫힘, 글 칸에서는 안 끌림
await openFb(b);
p = await rect(b, '.body .sub');
await drag(b, p.x, p.top + 5, p.top + 300, 350);
await sleep(500);
ok('H 내용 영역을 끌어 내려도 닫힘', !(await isOpen(b)));
await openFb(b);
p = await rect(b, 'textarea');
await drag(b, p.x, p.top + 10, p.top + 300, 350);
await sleep(500);
ok('H2 글 칸 안에서 끌면 시트는 그대로', await isOpen(b));

// E. 뒤로가기로 닫힘 — 같은 화면에 머묾
const path0 = await b.ev(`return location.pathname;`);
await b.ev(`history.back(); return 1;`);
await sleep(700);
ok('E 휴대폰 뒤로가기로 닫힘, 화면은 그대로', !(await isOpen(b)) && (await b.ev(`return location.pathname;`)) === path0);

// F. 바깥을 눌러 닫은 뒤 뒤로가기 한 번이면 이전 화면 — 빈 기록 칸이 남지 않음
await b.go('/games', 2000);
await b.ev(`document.querySelector('a[href="/trivia"]').click(); return 1;`);
await sleep(1500);
await openFb(b);
await b.ev(`document.querySelector('.dim').click(); return 1;`);
await sleep(700);
ok('F 바깥 누르면 닫힘', !(await isOpen(b)));
await b.ev(`history.back(); return 1;`);
await sleep(1200);
ok('F2 닫은 뒤 뒤로가기 한 번 = 이전 화면', (await b.ev(`return location.pathname;`)) === '/games', await b.ev(`return location.pathname;`));
// ✕ 버튼은 없어야 한다, Esc
await openFb(b);
ok('✕ 버튼 없음(끌어 내리기·바깥으로 닫음)', !(await b.ev(`return !!document.querySelector('.panel .x, .panel [aria-label="닫기"]');`)));
// 닫힐 때 막이 다 투명해진 뒤에 지워지는지 — 지워지기 직전 프레임의 불투명도
await b.ev(`window.__last = null; (function f(){ const d=document.querySelector('.dim'); if(d){ window.__last=+getComputedStyle(d).opacity; requestAnimationFrame(f);} })(); return 1;`);
await b.ev(`document.querySelector('.dim').click(); return 1;`);
await sleep(900);
const lastOp = await b.ev(`return window.__last;`);
ok('막은 거의 투명해진 뒤에 지워짐(깜빡임 없음)', lastOp !== null && lastOp < 0.05, '지워지기 직전 불투명도 ' + lastOp);
await openFb(b);
await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(600);
ok('Esc 로 닫힘', !(await isOpen(b)));

// I. 새 소식 시트 — 다시 온 사람, 링크로 이동 뒤 뒤로가기
await b.ev(`localStorage.clear(); localStorage.setItem('ddal.visit','1'); return 1;`);
await b.go('/games', 1500);
await b.go('/', 3800);
ok('I 새 소식 시트가 올라옴', await isOpen(b));
ok('I1 시트가 떠 있는 동안 위 새 소식 띠는 숨김(같은 소식 두 번 금지)', !(await b.ev(`return !!document.querySelector('.nbar');`)));
await b.shot(OUT + 'S-news.jpg');
// 바깥으로 닫으면 띠도 종의 점도 남지 않는다
await b.ev(`document.querySelector('.dim').click(); return 1;`);
await sleep(800);
ok('I1b 시트를 닫으면 띠 · 종의 점이 바로 사라짐', !(await b.ev(`return !!document.querySelector('.nbar') || !!document.querySelector('.bell .dot');`)));
// 링크 이동 시험을 위해 다시 안 본 상태로
await b.ev(`localStorage.clear(); localStorage.setItem('ddal.visit','1'); return 1;`);
await b.go('/games', 1500);
await b.go('/', 3800);
await b.ev(`[...document.querySelectorAll('.panel a')].find(a=>/대결/.test(a.textContent)).click(); return 1;`);
await sleep(1800);
const at = await b.ev(`return location.pathname;`);
await b.ev(`history.back(); return 1;`);
await sleep(1500);
ok('I2 소식 링크 → 그 화면, 뒤로가기 한 번 = 메인(빈 칸 없음)', at === '/trivia/duel' && (await b.ev(`return location.pathname;`)) === '/' && !(await isOpen(b)), `${at} → ${await b.ev(`return location.pathname;`)}`);

// 하단 탭 — 아이폰 홈 바(34px) 흉내
try {
	await b.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
	await b.go('/games', 1500);
	const t = await b.ev(`const n=document.querySelector('nav.bottom, .bottom'); const a=n.querySelector('a').getBoundingClientRect(); return { linkBottom: Math.round(innerHeight - a.bottom), barH: Math.round(n.getBoundingClientRect().height), blur: getComputedStyle(n).backdropFilter };`);
	ok('하단 탭 버튼이 홈 바(34px) 위로 떠 있음', t.linkBottom >= 34, JSON.stringify(t));
	await b.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } });
	await b.go('/games', 1500);
	const t2 = await b.ev(`const n=document.querySelector('.bottom'); const a=n.querySelector('a').getBoundingClientRect(); return { linkBottom: Math.round(innerHeight - a.bottom) };`);
	ok('홈 바 없는 화면에서도 바닥에서 띄움', t2.linkBottom >= 14, JSON.stringify(t2));
} catch (e) { console.log('안전 영역 흉내 불가: ' + e.message.slice(0, 80)); }
await b.close();

// ── 스플래시 ──
// 스플래시는 1.2초만 뜬다. load 뒤 한 번 들여다보면 광고 요청이 늦을 때 이미 사라진 뒤다 —
// 문서가 열리는 순간부터 매 프레임 지켜보다가 한 번이라도 보였으면 __sp = true
const WATCH = 'window.__sp=false;(function t(){const e=document.querySelector(".splash");if(e){const c=getComputedStyle(e);if(c.display!=="none"&&c.visibility!=="hidden"&&+c.opacity>0.1)window.__sp=true;}requestAnimationFrame(t);})();';
async function splashBrowser(tag) {
	const x = await launch(tag);
	await x.viewport(390, 844);
	await x.send('Page.addScriptToEvaluateOnNewDocument', { source: WATCH });
	return x;
}
const seen = (x) => x.ev('return window.__sp === true;');
const reset = (x) => x.ev('window.__sp = false; return 1;');
const tab = (x, name) => x.ev(`[...document.querySelectorAll('nav a')].find((a) => a.textContent.trim() === '${name}' && a.offsetParent).click(); return 1;`);
const logo = (x) => x.ev("document.querySelector('header .logo').click(); return 1;");
const s = await splashBrowser('splash');
await s.go('/', 600);
ok('J 처음 열면 스플래시', await seen(s));
await sleep(1200);
await tab(s, '놀이');
await sleep(1200);
await reset(s);
await logo(s);
await sleep(900);
ok('J2 로고로 메인에 돌아오면 안 뜸', !(await seen(s)));
await tab(s, '기록');
await sleep(1000);
await reset(s);
await tab(s, '오늘');
await sleep(900);
ok('J3 「오늘」 탭으로 돌아와도 안 뜸', !(await seen(s)));
await s.go('/', 1500);
ok('J4 같은 탭에서 새로고침해도 안 뜸(번쩍임 없음)', !(await seen(s)), 'nosplash=' + (await s.ev("return document.documentElement.classList.contains('nosplash');")));
await s.close();
const s2 = await splashBrowser('splash2');
await s2.go('/trivia', 1500);
await reset(s2);
await logo(s2);
await sleep(900);
ok('J5 다른 화면으로 들어와 메인에 가도 안 뜸', !(await seen(s2)));
await s2.close();

console.log(`\n${res.filter((r) => r.p).length} / ${res.length} 통과 · 오류`, [...b.errors, ...s.errors, ...s2.errors].length ? [...b.errors, ...s.errors, ...s2.errors] : '없음');
if (res.some((r) => !r.p) || [...b.errors, ...s.errors, ...s2.errors].length) process.exitCode = 1;
