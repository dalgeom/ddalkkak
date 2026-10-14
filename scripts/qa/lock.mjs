import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('lock');
await b.viewport(390, 844);
await b.go('/trivia', 2500);
await b.ev(`scrollTo(0, 400); return 1;`); await sleep(300);
await b.ev(`document.querySelector('.fbtn').click(); return 1;`); await sleep(700);
const y0 = await b.ev(`return Math.round(scrollY);`);
// 막 위를 손가락으로 쓸기
await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 200 }] });
for (let i = 1; i <= 8; i++) { await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 200 - i * 20 }] }); await sleep(20); }
await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await sleep(400);
// 막 위에서 휠
await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 200, y: 150, deltaX: 0, deltaY: 400 });
await sleep(400);
const y1 = await b.ev(`return Math.round(scrollY);`);
console.log(`열린 동안 뒤 화면 스크롤: ${y0} → ${y1} ${y0 === y1 ? '통과(잠김)' : '실패'}`);
// 시트 안 글 칸 · 내용은 그대로 쓸 수 있는지(내용이 짧아 스크롤은 없음) — 시트가 열려 있는지만
console.log('시트 열림 유지', await b.ev(`return !!document.querySelector('.sheet.show');`));
await b.ev(`document.querySelector('.dim').click(); return 1;`); await sleep(700);
await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 200, y: 300, deltaX: 0, deltaY: 400 });
await sleep(500);
const y2 = await b.ev(`return Math.round(scrollY);`);
console.log(`닫은 뒤 스크롤: ${y1} → ${y2} ${y2 > y1 ? '통과(풀림)' : '실패'}`);
await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (y0 !== y1 || !(y2 > y1) || b.errors.length) process.exitCode = 1;
