// 홈 「많이 찾는 분야」 줄 · 사자성어 쪽 「속담으로 찾는 사자성어」 구역(2026-11-18).
// 홈: 링크 넷이 보이고 화면 안 · 가로 넘침 없음 · 모두 200. 사자성어 쪽: 구역 · 짝 9개 · 초성 링크.
// 양성 대조: 문학 쪽에는 그 구역이 없어야 한다(구역 찾기가 아무 쪽에서나 참이 아님을 보인다).
import { launch, OUT } from './cdp.mjs';
const b = await launch('idiomhome');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	await b.go('/', 1200);
	const r = await b.ev(`const p = document.querySelector('.field-links'); if (!p) return null; p.scrollIntoView({ block: 'center' });
		const a = [...p.querySelectorAll('a')].map((x) => { const r = x.getBoundingClientRect(); return { href: x.getAttribute('href'), left: r.left, right: r.right, w: r.width }; });
		return { a, over: document.documentElement.scrollWidth - innerWidth };`);
	ok(`${w} 홈 분야 줄 링크 4개`, r?.a.length === 4, JSON.stringify(r?.a.map((x) => x.href)));
	ok(`${w} 링크가 화면 안 · 가로 넘침 없음`, !!r && r.a.every((x) => x.w > 0 && x.left >= 0 && x.right <= w) && r.over <= 0, JSON.stringify(r));
	await b.shot(`${OUT}idiomhome-${w}.jpg`);
	if (w === 390 && r) {
		const codes = await b.ev(`return Promise.all(${JSON.stringify(r.a.map((x) => x.href))}.map((u) => fetch(u).then((res) => res.status)));`);
		ok('홈 분야 링크 모두 200', codes.every((c) => c === 200), codes.join(','));
	}

	await b.go('/trivia/idiom', 1000);
	const s = await b.ev(`const h = [...document.querySelectorAll('h2')].find((x) => x.textContent.trim() === '속담으로 찾는 사자성어'); if (!h) return null;
		const sec = h.closest('section'); return { n: sec.querySelectorAll('.pv li').length, cho: !!sec.querySelector('a[href="/chosung/idiom"]'), over: document.documentElement.scrollWidth - innerWidth };`);
	ok(`${w} 사자성어 쪽 속담 구역 · 짝 9개 · 초성 링크 · 넘침 없음`, s?.n === 9 && s.cho && s.over <= 0, JSON.stringify(s));

	await b.go('/trivia/literature', 1000);
	const none = await b.ev(`return [...document.querySelectorAll('h2')].some((x) => x.textContent.trim() === '속담으로 찾는 사자성어');`);
	const hasH2 = await b.ev(`return document.querySelectorAll('h2').length;`);
	ok(`${w} (대조) 문학 쪽에는 속담 구역 없음`, none === false && hasH2 > 0, `h2 ${hasH2}개`);
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
