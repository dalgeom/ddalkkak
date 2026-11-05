// 도구 쪽(2026-11-04) — 끝말잇기 단어 찾기 · 초성으로 단어 찾기(11/5) · 성냥 문제 만들기 · 상식 퀴즈 띄우기 · 학습지 · 도구 모음.
// 결과가 실제로 나오는지(양성), 가로 넘침, 스크린샷.
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('tools');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 50; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(300); } return false; };
const over = () => b.ev(`return document.documentElement.scrollWidth - innerWidth;`);

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	// 끝말잇기 단어 찾기
	await b.go('/kkeut/words?q=%EB%A0%A5', 800);
	const got = await until(`document.querySelectorAll('ul.words li').length > 0`);
	await until(`document.querySelector('ul.words .def')`);
	const kw = await b.ev(`return { n: document.querySelectorAll('ul.words li').length, hb: document.querySelectorAll('ul.words .badge').length, def: [...document.querySelectorAll('ul.words .def')].filter(e => e.innerText.trim()).length };`);
	ok(`${w} 단어 찾기 — 「력」 이을 말이 나옴`, got && kw.n > 0 && kw.def > 0, JSON.stringify(kw));
	ok(`${w} 단어 찾기 가로 넘침 없음`, (await over()) <= 0);
	await b.shot(`${OUT}tools-kkeut-${w}.jpg`);
	await b.go('/kkeut/words?q=%EC%9D%B4', 800);
	await until(`document.querySelectorAll('ul.words li').length > 0`);
	const hb = await b.ev(`document.querySelectorAll('.tabs button')[1].click(); await new Promise(r => setTimeout(r, 200)); const li = [...document.querySelectorAll('ul.words li')]; return { n: li.length, all: li.every(l => l.querySelector('.badge')) };`);
	ok(`${w} 「이」 한방 단어만 보기 — 전부 한방 배지`, hb.n > 0 && hb.all, JSON.stringify(hb));

	// 초성으로 단어 찾기 — ㅅㄱ에 결과 · 뜻풀이가 나오고, 초성 퀴즈 정답(사과)은 빠진다
	await b.go('/chosung/find?q=' + encodeURIComponent('ㅅㄱ'), 800);
	const cg = await until(`document.querySelectorAll('ul.words li').length > 0`);
	await until(`document.querySelector('ul.words .def')`);
	const cf = await b.ev(`const w = [...document.querySelectorAll('ul.words .w')].map(e => e.innerText); return { n: w.length, siege: w.includes('시계'), apple: w.includes('사과'), def: [...document.querySelectorAll('ul.words .def')].filter(e => e.innerText.trim()).length, common: document.querySelectorAll('.hb .hc').length };`);
	ok(`${w} 초성 찾기 — ㅅㄱ에 시계가 나오고 사과는 빠짐`, cg && cf.siege && !cf.apple && cf.def > 0 && cf.common > 0, JSON.stringify(cf));
	const cm = await b.ev(`const i = document.querySelector('.field input'); i.value = '사ㄱ'; i.dispatchEvent(new Event('input', {bubbles:true})); await new Promise(r => setTimeout(r, 300)); return [...document.querySelectorAll('ul.words .w')].map(e => e.innerText);`);
	ok(`${w} 초성 찾기 — 사ㄱ은 「사」로 시작하는 두 글자만`, cm.length > 0 && cm.every((x) => x.length === 2 && x[0] === '사'), JSON.stringify(cm));
	// 분야 거르기(11/5) — ?c=animal이면 동물 이름만(가재), 동물 아닌 ㄱㅈ 말(가족)은 빠진다
	await b.go('/chosung/find?c=animal&q=' + encodeURIComponent('ㄱㅈ'), 800);
	await until(`document.querySelectorAll('ul.words li').length > 0`);
	const fa = await b.ev(`const w = [...document.querySelectorAll('ul.words .w')].map(e => e.innerText); return { w, on: document.querySelector('.fields button.on')?.innerText };`);
	ok(`${w} 초성 찾기 분야 — ㄱㅈ 동물에 가재가 나오고 가족은 빠짐`, fa.on === '동물' && fa.w.includes('가재') && !fa.w.includes('가족') && fa.w.length < 30, JSON.stringify(fa));
	const fb = await b.ev(`document.querySelector('.fields button').click(); await new Promise(r => setTimeout(r, 300)); return { n: document.querySelectorAll('ul.words li').length, url: location.search };`);
	ok(`${w} 초성 찾기 분야 — 「전체」로 돌리면 늘어나고 주소에서 c가 빠짐`, fb.n > fa.w.length && !fb.url.includes('c='), JSON.stringify(fb));
	ok(`${w} 초성 찾기 가로 넘침 없음`, (await over()) <= 0);
	await b.shot(`${OUT}tools-chosung-find-${w}.jpg`);

	// 성냥 문제 만들기 — 링크로 들어오면 바로 문제가 나온다
	await b.go('/matchstick/make?q=13-7%3D6&r=move1', 800);
	const mm = await until(`document.querySelectorAll('.plist .pi').length > 0`);
	const mk = await b.ev(`return { n: document.querySelectorAll('.plist .pi').length, one: document.querySelectorAll('.plist .badge.one').length, sheet: !!document.querySelector('body > .print-sheet') };`);
	ok(`${w} 문제 만들기 — 13-7=6에서 문제가 나옴`, mm && mk.n > 0 && mk.one > 0, JSON.stringify(mk));
	ok(`${w} 인쇄 쪽이 body 끝에 붙음`, mk.sheet);
	ok(`${w} 문제 만들기 가로 넘침 없음`, (await over()) <= 0);
	await b.shot(`${OUT}tools-make-${w}.jpg`);
	const bad = await b.ev(`const i = document.querySelector('#eq'); i.value = '5+3=9'; i.dispatchEvent(new Event('input', {bubbles:true})); await new Promise(r => setTimeout(r, 50)); document.querySelector('.box .go').click(); await new Promise(r => setTimeout(r, 200)); return document.querySelector('.err')?.innerText || '';`);
	ok(`${w} 틀린 식이면 알려 줌`, bad.includes('맞지 않는 식'), bad.slice(0, 40));
	const st = await b.ev(`document.querySelector('.dock .db').click(); await new Promise(r => setTimeout(r, 300)); const s = document.querySelector('.stage'); const r = s?.getBoundingClientRect(); const a0 = document.querySelector('.stage .answer.show'); document.querySelector('.stage .board').click(); await new Promise(r => setTimeout(r, 150)); const a1 = document.querySelector('.stage .answer.show'); return { full: !!r && r.width >= innerWidth - 1 && r.height >= innerHeight - 1, hidden0: !a0, shown1: !!a1 };`);
	ok(`${w} 크게 띄우기 — 화면을 덮고 누르면 답이 열림`, st.full && st.hidden0 && st.shown1, JSON.stringify(st));
	await b.shot(`${OUT}tools-make-stage-${w}.jpg`);
	await b.ev(`history.back(); await new Promise(r => setTimeout(r, 400)); return 1;`);
	ok(`${w} 뒤로가기로 진행 화면 닫힘`, !(await b.ev(`return !!document.querySelector('.stage');`)));

	// 상식 퀴즈 띄우기 — 받아 온 문제가 화면을 덮고, 누를 때마다 정답 → 해설
	await b.go('/trivia/show', 800);
	ok(`${w} 상식 띄우기 가로 넘침 없음`, (await over()) <= 0);
	await b.shot(`${OUT}tools-tshow-${w}.jpg`);
	await b.ev(`document.querySelector('.setup .cta').click(); return 1;`);
	const ts0 = await until(`document.querySelector('.stage .opts .opt')`);
	const ts = await b.ev(`const s = document.querySelector('.stage').getBoundingClientRect(); const n = document.querySelectorAll('.stage .opt').length; const r0 = document.querySelectorAll('.stage .opt.right').length; const e0 = !!document.querySelector('.stage .exp.show'); const bd = document.querySelector('.stage .board'); bd.click(); await new Promise(r => setTimeout(r, 150)); const r1 = document.querySelectorAll('.stage .opt.right').length; bd.click(); await new Promise(r => setTimeout(r, 150)); const e2 = !!document.querySelector('.stage .exp.show'); const pos = document.querySelector('.stage .pos').innerText; return { full: s.width >= innerWidth - 1 && s.height >= innerHeight - 1, n, r0, e0, r1, e2, pos, fits: bd.scrollHeight <= bd.clientHeight + 1 };`);
	ok(`${w} 상식 띄우기 — 보기 넷 · 정답 → 해설 순서`, ts0 && ts.full && ts.n === 4 && ts.r0 === 0 && !ts.e0 && ts.r1 === 1 && ts.e2 && /^1 \/ 10/.test(ts.pos), JSON.stringify(ts));
	await b.shot(`${OUT}tools-tshow-stage-${w}.jpg`);
	await b.ev(`history.back(); await new Promise(r => setTimeout(r, 400)); return 1;`);
	ok(`${w} 뒤로가기로 상식 진행 화면 닫힘`, !(await b.ev(`return !!document.querySelector('.stage');`)));

	// 학습지 — 초성 20문제가 바로 나오고, 인쇄 쪽에 문제 장 · 답 장이 같은 수로 실린다
	await b.go('/print', 800);
	await until(`document.querySelectorAll('.paper .p-i').length > 0`);
	const pc = await b.ev(`const s = document.querySelector('body > .print-sheet'); return { prev: document.querySelectorAll('.paper .p-i').length, q: s?.querySelectorAll('.p-list .p-i').length, a: s?.querySelectorAll('.p-ans li').length, brk: !!s?.querySelector('.p-break'), cho: [...document.querySelectorAll('.paper .p-cho')].every(e => /^[ㄱ-ㅎ]+$/.test(e.innerText.trim())) };`);
	ok(`${w} 학습지 초성 — 20문제 · 답 20개 · 쪽 나눔`, pc.prev === 20 && pc.q === 20 && pc.a === 20 && pc.brk && pc.cho, JSON.stringify(pc));
	ok(`${w} 학습지 가로 넘침 없음`, (await over()) <= 0);
	await b.shot(`${OUT}tools-print-${w}.jpg`);
	const pm = await b.ev(`[...document.querySelectorAll('.setup .chips button')].find(x => x.innerText.includes('성냥'))?.click(); await new Promise(r => setTimeout(r, 400)); const s = document.querySelector('body > .print-sheet'); const q = [...document.querySelectorAll('.paper .p-q')].map(e => e.innerText); return { prev: document.querySelectorAll('.paper .p-i svg').length, q: s?.querySelectorAll('.p-list .p-i').length, uniq: new Set(q).size === q.length };`);
	ok(`${w} 학습지 성냥 — 10문제 그림 · 문제 10 + 답 10`, pm.prev === 10 && pm.q === 20 && pm.uniq, JSON.stringify(pm));
	ok(`${w} 학습지 성냥 가로 넘침 없음`, (await over()) <= 0);
	await b.shot(`${OUT}tools-print-match-${w}.jpg`);
	await b.send('Emulation.setEmulatedMedia', { media: 'print' });
	const pr = await b.ev(`const s = document.querySelector('body > .print-sheet'); return { sheet: getComputedStyle(s).display !== 'none', app: [...document.body.children].filter(e => e !== s && getComputedStyle(e).display !== 'none' && e.offsetHeight > 0).length };`);
	await b.send('Emulation.setEmulatedMedia', { media: '' });
	ok(`${w} 인쇄할 때 학습지만 보임`, pr.sheet && pr.app === 0, JSON.stringify(pr));

	// 도구 모음 — 도구 카드 10개, 링크가 모두 열리고, 홈에서 들어가는 길이 있다
	await b.go('/chosung/animal', 800);
	ok(`${w} 동물 분야 쪽에 「초성으로 동물 이름 찾기」 입구`, await b.ev(`return !!document.querySelector('a.show[href="/chosung/find?c=animal"]');`));
	await b.go('/tools', 800);
	const tl = await b.ev(`const a = [...document.querySelectorAll('.tl a')]; const st = await Promise.all(a.map(x => fetch(x.href).then(r => r.status))); return { n: a.length, bad: st.filter(s => s !== 200).length, ld: !!document.querySelector('script[type="application/ld+json"]') };`);
	ok(`${w} 도구 모음 — 카드 10개 · 링크 모두 200 · JSON-LD`, tl.n === 10 && tl.bad === 0 && tl.ld, JSON.stringify(tl));
	ok(`${w} 도구 모음 가로 넘침 없음`, (await over()) <= 0);
	await b.shot(`${OUT}tools-hub-${w}.jpg`);
	await b.go('/', 800);
	ok(`${w} 홈에 도구 모음 들어가는 길`, await b.ev(`return !!document.querySelector('a.tools-in[href="/tools"]') && !!document.querySelector('footer a[href="/tools"]');`));
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
