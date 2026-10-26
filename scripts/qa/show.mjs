// 초성 퀴즈 띄우기(/chosung/show, 2026-10-26) — 진행 화면이 탭 · 헤더를 덮는지, 초성이 화면을 넘지 않는지,
// 키보드(리모컨)로 끝까지 가는지, 뒤로가기 한 번이 진행 화면만 닫는지(설정 화면에 남는지), 분야 쪽 입구가 그 분야를 골라 여는지.
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('show');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
/** 화면이 준비될 때까지(하이드레이션 · 개발 서버 첫 컴파일) 조건을 최대 15초 기다린다 */
const until = async (cond) => { for (let i = 0; i < 50; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(300); } return false; };
const key = async (k, code, vk) => {
	await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk });
	await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
};

for (const [w, h] of [[390, 844], [320, 568], [1280, 720]]) {
	await b.viewport(w, h, w < 1000);
	await b.go('/chosung/show?c=animal', 800);
	await until(`/동물/.test(document.querySelector('.chips button.on')?.innerText ?? '')`);
	const pre = await b.ev(`return { picked: document.querySelector('.chips button.on')?.innerText ?? '', over: document.documentElement.scrollWidth - innerWidth };`);
	ok(`${w} 분야 쪽에서 온 분야가 골라져 있음`, /동물/.test(pre.picked), pre.picked);
	ok(`${w} 설정 화면 가로 넘침 없음`, pre.over <= 0, String(pre.over));
	await b.ev(`document.querySelector('button.cta').click(); return 1;`);
	await until(`document.querySelector('.stage .cho')`);
	await sleep(300);
	const st = await b.ev(`
		const s = document.querySelector('.stage'); if (!s) return null;
		const r = s.getBoundingClientRect(), c = document.querySelector('.cho').getBoundingClientRect();
		const bottom = document.elementFromPoint(innerWidth / 2, innerHeight - 5);
		return { cover: r.left <= 0 && r.top <= 0 && r.right >= innerWidth && r.bottom >= innerHeight, choFits: c.left >= 0 && c.right <= innerWidth,
			bottomInStage: s.contains(bottom), hintHidden: getComputedStyle(document.querySelector('.hint')).visibility === 'hidden' };`);
	ok(`${w} 진행 화면이 화면 전체를 덮음(하단 탭 위)`, !!st && st.cover && st.bottomInStage, JSON.stringify(st));
	ok(`${w} 초성이 화면 안에 들어옴`, !!st && st.choFits);
	ok(`${w} 처음엔 힌트 · 정답이 가려져 있음`, !!st && st.hintHidden);
	await key('ArrowRight', 'ArrowRight', 39); await key('ArrowRight', 'ArrowRight', 39);
	await sleep(200);
	const shown = await b.ev(`const a = document.querySelector('.answer'); return a ? getComputedStyle(a).visibility : 'none';`);
	ok(`${w} 오른쪽 화살표 두 번이면 정답`, shown === 'visible', shown);
	await b.shot(`${OUT}show-${w}.jpg`);
	for (let i = 0; i < 40; i++) await key('PageDown', 'PageDown', 34);
	await sleep(200);
	const end = await b.ev(`return document.querySelector('.end .big')?.innerText ?? '';`);
	ok(`${w} 리모컨(PageDown)으로 끝 장면까지`, /끝/.test(end), end);
	await b.ev(`history.back(); return 1;`);
	await sleep(700);
	const after = await b.ev(`return { stage: !!document.querySelector('.stage'), path: location.pathname, lock: document.documentElement.style.overflow };`);
	ok(`${w} 뒤로가기 한 번 = 진행 화면만 닫힘 · 스크롤 잠금 풀림`, !after.stage && after.path === '/chosung/show' && after.lock !== 'hidden', JSON.stringify(after));
}

await b.viewport(390, 844);
await b.go('/chosung/animal', 1500);
const href = await b.ev(`return document.querySelector('a.show')?.getAttribute('href') ?? '';`);
ok('분야 쪽에 그 분야로 여는 띄우기 입구', href === '/chosung/show?c=animal', href);
await b.go('/chosung', 1500);
const hub = await b.ev(`return !!document.querySelector('a[href="/chosung/show"]');`);
ok('초성 첫 화면에 띄우기 입구', hub);

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
