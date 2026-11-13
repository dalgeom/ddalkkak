// 무한 연습 단축키(2026-11-13 의견) — 1~N으로 보기 고르기, 판정 뒤 Enter · Space로 다음 문제, 입력칸 · 시트에서는 가로채지 않기.
// 양성 대조: 컴퓨터 화면에서 안내 문구가 보이는 것을 먼저 확인한 뒤 휴대폰 화면에서 숨는지 본다.
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('playkeys');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond, n = 40) => { for (let i = 0; i < n; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(250); } return false; };
const KEYS = { Enter: [13, '\r'], ' ': [32, ' '] };
async function key(k) {
	const [code, text] = KEYS[k] ?? [k.charCodeAt(0), k];
	const p = { key: k, code: k === ' ' ? 'Space' : k === 'Enter' ? 'Enter' : 'Digit' + k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
	await b.send('Input.dispatchKeyEvent', { type: 'keyDown', text, ...p });
	await b.send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
	await sleep(250);
}
const qid = () => b.ev(`return (document.querySelector('.qtext')?.innerText ?? '') + '|' + document.querySelectorAll('.choice, .cubeopt').length;`);
const judged = () => b.ev(`return !!document.querySelector('.explain');`);
const skipBtn = () => b.ev(`[...document.querySelectorAll('.actions button')].find((x) => x.innerText.includes('건너뛰기'))?.click(); return 1;`);
async function findChoice() {
	for (let i = 0; i < 20; i++) {
		if (await b.ev(`return document.querySelectorAll('.choice').length > 0 && !document.querySelector('.explain');`)) return true;
		await skipBtn();
		await sleep(400);
	}
	return false;
}

// a. 안내 문구 — 컴퓨터에서 보이고(양성 대조) 휴대폰에서 숨는다
await b.viewport(1280, 900, false);
await b.go('/play?filter=trivia', 1500);
ok('시작 때 열린 시트 없음', !(await b.ev(`return !!document.querySelector('[aria-modal="true"]');`)));
const hintDesk = await b.ev(`const n = document.querySelector('.keyhint'); return n ? [getComputedStyle(n).display, n.innerText] : null;`);
ok('컴퓨터 화면에 단축키 안내', !!hintDesk && hintDesk[0] !== 'none' && /Enter/.test(hintDesk[1]), JSON.stringify(hintDesk));
await b.shot(`${OUT}playkeys-1280.jpg`);
await b.viewport(390, 844, true);
await sleep(400);
const hintMob = await b.ev(`const n = document.querySelector('.keyhint'); return n ? getComputedStyle(n).display : null;`);
if (hintDesk && hintDesk[0] !== 'none') ok('휴대폰 화면엔 안내 숨김', hintMob === 'none', String(hintMob));
else console.log('미확인  휴대폰 숨김 — 컴퓨터에서 먼저 보이지 않아 대조 불가');
await b.viewport(1280, 900, false);
await sleep(300);

// b. 숫자로 고르고 Enter로 한 번만 넘어간다
ok('보기형 문제 찾음', await findChoice());
const q1 = await qid();
for (const k of ['1', '2', '3', '4', '5']) { if (await judged()) break; await key(k); }
ok('숫자 키로 판정', await judged());
ok('판정 뒤 문제 그대로', (await qid()) === q1);
await key('Enter');
await sleep(300);
const q2 = await qid();
ok('Enter로 다음 문제', q2 !== q1 && !(await judged()), q2.slice(0, 40));

// c. 마우스로 판정한 뒤 Space로 넘어간다
ok('다음 보기형 찾음', await findChoice());
const q3 = await qid();
// 진짜 마우스 클릭 — 누른 보기 버튼에 포커스가 간 뒤 disabled가 되는 실제 사용자 상태
for (let i = 0; i < 5 && !(await judged()); i++) {
	const p = await b.ev(`const n = document.querySelectorAll('.choice')[${i}]; if (!n) return null; n.scrollIntoView({ block: 'center' }); const r = n.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2];`);
	if (!p) break;
	for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: p[0], y: p[1], button: 'left', clickCount: 1 });
	await sleep(300);
}
ok('마우스로 판정', await judged());
await key(' ');
await sleep(300);
const q4 = await qid();
ok('Space로 다음 문제', q4 !== q3 && !(await judged()), q4.slice(0, 40));

// d. 글자 입력칸에서는 숫자 · Enter를 가로채지 않는다
await b.go('/play?filter=puzzle', 1500);
let found = false;
for (let i = 0; i < 25 && !found; i++) {
	found = await b.ev(`return !!document.querySelector('input[aria-label="정답 입력"]:not(:disabled)');`);
	if (!found) { await skipBtn(); await sleep(400); }
}
ok('글자형 문제 찾음', found);
if (found) {
	const q5 = await qid();
	await b.ev(`const i = document.querySelector('input[aria-label="정답 입력"]'); i.focus(); return 1;`);
	await key('1');
	const v = await b.ev(`return document.querySelector('input[aria-label="정답 입력"]').value;`);
	ok('입력칸에 1이 그대로 들어감', v === '1', v);
	ok('입력칸 숫자로 판정 · 넘김 없음', !(await judged()) && (await qid()) === q5);
	await key('Enter');
	ok('오답 Enter로 넘어가지 않음', (await qid()) === q5);
}

// e. 의견 시트가 열려 있으면 아무것도 하지 않는다
await b.go('/play?filter=trivia', 1500);
ok('시트 시험용 보기형 찾음', await findChoice());
const q6 = await qid();
await b.ev(`document.querySelector('.fbtn')?.click(); return 1;`);
const sheet = await until(`document.querySelector('[aria-modal="true"]')`, 12);
ok('의견 시트 열림', sheet);
if (sheet) {
	await b.ev(`document.activeElement?.blur?.(); return 1;`);
	await key('1');
	await key('Enter');
	ok('시트 열린 동안 판정 · 넘김 없음', !(await judged()) && (await qid()) === q6);
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
