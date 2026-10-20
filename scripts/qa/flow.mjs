// 3·4: 흐름 시험. 처음 온 사람(빈 프로필)으로 운영 사이트를 끝까지 눌러 본다.
import { launch, sleep, OUT, BASE } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const res = [];
const ok = (name, pass, detail = '') => { res.push({ name, pass, detail }); console.log(`${pass ? '통과' : '실패'}  ${name}${detail ? '  — ' + detail : ''}`); };

const b = await launch('flow');
await b.viewport(390);

// 0. 오류 잡기가 실제로 되는지
await b.go('/news', 800);
await b.ev(`setTimeout(()=>{throw new Error('qa-probe')},0); return 1;`);
await sleep(400);
ok('오류 잡기 장치 동작', b.errors.some((e) => e.includes('qa-probe')));
b.errors.length = 0;

// 1. 메인 — 처음 온 사람
await b.go('/', 3500);
let m = await b.ev(`
	const cards = [...document.querySelectorAll('.games .game a.main')].map(a=>a.getAttribute('href'));
	const sheet = !!document.querySelector('.sheet, [class*=newssheet], [role=dialog]');
	const bar = document.querySelector('.newsbar, [class*=news]')?.textContent.trim().slice(0,30) ?? '';
	const tabs = [...document.querySelectorAll('nav a')].filter(a=>/오늘|놀이|기록/.test(a.textContent)).map(a=>a.textContent.trim()+':'+a.getAttribute('href'));
	const dbl = [...document.querySelectorAll('section')].filter(s=>{const c=getComputedStyle(s);const inner=s.querySelector(':scope > * ');return c.borderTopWidth!=='0px' && inner && getComputedStyle(inner).borderTopWidth!=='0px' && getComputedStyle(inner).backgroundColor===c.backgroundColor;}).length;
	return { cards, sheet, bar, tabs, dbl, start: document.querySelector('.cta')?.textContent.trim() };
`);
ok('메인 놀이 카드 6장 모두 링크', m.cards.length === 6 && m.cards.every(Boolean), m.cards.join(' '));
ok('처음 온 사람에게 새 소식 시트 안 뜸', !m.sheet);
ok('하단 탭 오늘·놀이·기록', m.tabs.length >= 3, m.tabs.join(' '));
ok('메인 카드 속 카드 없음', m.dbl === 0, 'dbl=' + m.dbl);
await b.shot(OUT + 'f-home.jpg');

// 1b. 오늘의 성냥개비를 끝낸 순간 → 오늘의 10문제로 잇는 카드(10/15 성장 작업 · DailyNext)
await b.go('/matchstick', 2500);
m = await b.ev(`
	document.querySelector('.today .big').click(); await new Promise(r=>setTimeout(r,800));
	[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='정답 보기').click(); await new Promise(r=>setTimeout(r,1500));
	const card = document.querySelector('.dnext');
	const free = [...document.querySelectorAll('button')].find(x=>/무한 연습 이어서/.test(x.textContent));
	return { card: card?.innerText.replace(/\\s+/g,' ').slice(0,60) ?? null, freeGhost: !!free && free.classList.contains('ghost') };`);
ok('오늘의 성냥 끝낸 뒤 「오늘의 10문제」 카드', !!m.card, m.card ?? '');
ok('카드가 보이면 무한 연습 버튼은 테두리(초록 큰 버튼 하나)', m.freeGhost);
await b.shot(OUT + 'f-match-next.jpg');
await b.ev(`document.querySelector('.dnext').click(); return 1;`);
await sleep(3500);
m = await b.ev(`return { path: location.pathname, playing: !!document.querySelector('.exit') };`);
ok('카드를 누르면 메인에서 오늘의 10문제가 바로 시작', m.path === '/' && m.playing, JSON.stringify(m));
await b.go('/', 3500);

// 2. 데일리 10문제 — 전부 「모르겠어요」로 넘겨 결과까지
await b.ev(`document.querySelector('.cta').click(); return 1;`);
await sleep(1500);
const steps = [];
for (let i = 0; i < 12; i++) {
	const s = await b.ev(`
		const prog = [...document.querySelectorAll('main *')].find(e=>e.childElementCount===0 && /^\\d+ \\/ 10 · /.test(e.textContent.trim()))?.textContent.trim() ?? '';
		const exit = document.querySelector('.exit');
		const top = exit ? Math.round(exit.getBoundingClientRect().top + scrollY) : -1;
		const bell = document.querySelector('.bell');
		const headerShown = !!bell && bell.getBoundingClientRect().height > 0;
		const tabbar = [...document.querySelectorAll('nav')].some(n=>/기록/.test(n.textContent) && n.getBoundingClientRect().height>0 && getComputedStyle(n).display!=='none');
		const ad = [...document.querySelectorAll('ins, .adslot, [class*=adslot]')].some(a=>a.getBoundingClientRect().height>0);
		const hint = !!document.querySelector('.hint-btn');
		const match = !!document.querySelector('.mboard');
		const kind = document.querySelector('.cubeopt') ? 'cube' : match ? 'match' : document.querySelector('.choice') ? 'choice' : document.querySelector('input[type=text]') ? 'text' : 'none';
		const result = !!document.querySelector('.np-all, .sh-btn');
		return { prog, top, headerShown, tabbar, ad, hint, kind, result };
	`);
	steps.push(s);
	if (s.result) break;
	const r = await b.ev(`
		const give = [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='모르겠어요');
		if (!give) return 'no-give';
		give.click(); await new Promise(r=>setTimeout(r,500));
		const conf = [...document.querySelectorAll('button')].find(b=>/^(넘기기|네|확인)$/.test(b.textContent.trim()) && b.offsetParent);
		if (conf && !document.querySelector('.submit')) conf.click();
		await new Promise(r=>setTimeout(r,400));
		const next = document.querySelector('.submit');
		if (!next) return 'no-next';
		next.click(); await new Promise(r=>setTimeout(r,900)); return 'ok';
	`);
	if (r !== 'ok') { ok('데일리 진행', false, `${i + 1}번에서 ${r}`); await b.shot(OUT + `f-stuck${i}.jpg`); break; }
	if (i === 0) await b.shot(OUT + 'f-q1.jpg');
}
writeFileSync(OUT + 'steps.json', JSON.stringify(steps, null, 1));
const qs = steps.filter((s) => !s.result);
ok('데일리 10문제 끝까지 → 결과 화면', steps.at(-1)?.result === true, `${qs.length}문제 진행`);
ok('진행 표시 「n / 10 · 유형」', qs.every((s, i) => s.prog.includes(`${i + 1} / 10`)), qs.map((s) => s.prog).join(' | '));
ok('푸는 동안 메뉴·종·탭·광고 숨김(로고만 남는 집중 화면)', qs.every((s) => !s.headerShown && !s.tabbar && !s.ad), JSON.stringify(qs.map((s) => [+s.headerShown, +s.tabbar, +s.ad])));
ok('「나가기」 높이 문제마다 같음', new Set(qs.map((s) => s.top)).size === 1, qs.map((s) => s.top).join(','));
ok('성냥 문제에도 힌트', qs.filter((s) => s.kind === 'match').every((s) => s.hint), qs.map((s) => s.kind + (s.hint ? '+힌트' : '')).join(' '));

// 3. 결과 화면
m = await b.ev(`
	await new Promise(r=>setTimeout(r,800));
	const t = document.body.innerText;
	const notify = [...document.querySelectorAll('button')].filter(b=>/알림/.test(b.textContent) && b.offsetParent).map(b=>b.textContent.trim());
	const green = [...document.querySelectorAll('button, a')].filter(e=>e.offsetParent && getComputedStyle(e).backgroundColor==='rgb(47, 143, 91)').map(e=>e.textContent.trim().slice(0,20));
	return { wanju: /완주/.test(t.split('다음 놀이')[0]), took: /걸렸어요/.test(t), notify, green, other: !!document.querySelector('.np-all'), tab: [...document.querySelectorAll('nav')].some(n=>/기록/.test(n.textContent) && n.getBoundingClientRect().height>0) };
`);
await b.shot(OUT + 'f-result.jpg');
ok('전부 넘겨도 「완주」라 안 함', !m.wanju && m.took);
ok('결과 화면 알림 권유 하나', m.notify.length <= 1, m.notify.join(' / '));
ok('결과 화면 초록 큰 버튼 하나 이하', m.green.length <= 1, m.green.join(' / '));
ok('결과 화면 「다음 놀이」로 이어짐', m.other);
// 오늘의 10문제를 끝낸 뒤에는 성냥 화면의 「오늘의 10문제」 카드가 숨는다
await b.go('/matchstick', 2500);
ok('데일리를 끝낸 뒤에는 「오늘의 10문제」 카드 숨김', !(await b.ev(`return !!document.querySelector('.dnext');`)));
await b.go('/', 3000);

// 11. 기록·오늘 다시 보기(완주 뒤라 열려야 함)
await b.go('/today', 2500);
m = await b.ev(`return { h1: document.querySelector('h1')?.textContent, review: document.querySelectorAll('.review, [class*=review] li, article').length, locked: /완주하면/.test(document.body.innerText) };`);
ok('완주 뒤 /today 가 열림', !m.locked, JSON.stringify(m));
await b.go('/record', 2000);
m = await b.ev(`return { facts: [...document.querySelectorAll('.fact')].map(f=>f.textContent.trim()), today: !!document.querySelector('.tod, .today, [class*=today]') };`);
ok('기록에 오늘 완주가 반영', m.facts.some((f) => /1일/.test(f)), m.facts.join(' | '));

// 4. 다시 온 사람(오늘 이미 풂) — 결과 화면이 뜨고 시트는 가리지 않는다
await b.go('/', 3500);
m = await b.ev(`return { sheet: !!document.querySelector('[role=dialog]'), result: !!document.querySelector('.np-all') };`);
ok('완주한 사람의 메인은 결과 화면, 새 소식 시트가 가리지 않음', m.result && !m.sheet, JSON.stringify(m));
m = await b.ev(`return [...document.querySelectorAll('.react .opt')].map(x=>x.textContent.trim());`);
ok('결과 화면에 한 번 누름 반응 셋(10/16)', m.length === 3, m.join(' '));
// 다시 온 사람(오늘 아직 안 풂) — 기록을 지우고 방문 흔적만 남긴다
await b.ev(`localStorage.clear(); localStorage.setItem('ddal.visit','1'); return 1;`);
await b.go('/', 3500);
m = await b.ev(`const s=document.querySelector('[role=dialog]'); return { sheet: !!s, text: s?.textContent.replace(/\\s+/g,' ').slice(0,60) };`);
ok('다시 온 사람에게 새 소식 시트 한 번', m.sheet, m.text);
await b.shot(OUT + 'f-sheet.jpg');
await b.ev(`document.querySelector('.sheet .ok').click(); return 1;`);
await b.go('/', 3000);
m = await b.ev(`return !!document.querySelector('[role=dialog]');`);
ok('닫은 뒤 다시 안 뜸', !m);

// 4b. 딸깍 5단계(10/20) — 오늘의 10문제 카드에 단계 칩(새싹~고수)
await b.ev(`localStorage.clear(); return 1;`);
await b.go('/', 3500);
m = await b.ev(`document.querySelector('.cta')?.click(); await new Promise(r=>setTimeout(r,2500));
	return { tier: document.querySelector('.chiprow .tier-chip')?.textContent.trim() ?? null, cat: document.querySelector('.chiprow .cat-chip')?.textContent.trim() ?? null, top: document.querySelector('.type-chip')?.textContent.trim() };`);
ok('오늘의 10문제 1번 카드에 단계 칩 · 분야 칩이 나란히', /^(새싹|쉬움|보통|어려움|고수)$/.test(m.tier ?? '') && !!m.cat, JSON.stringify(m));
await b.shot(OUT + 'f-daily-tier.jpg');

// 5. /play 필터
for (const [f, want] of [['cube', 'cube'], ['match', 'match'], ['trivia', 'choice']]) {
	await b.go('/play?filter=' + f, 2500);
	const kinds = [];
	for (let i = 0; i < 4; i++) {
		const k = await b.ev(`
			const chip = document.querySelector('.chip, .cat-chip, [class*=chip]')?.textContent ?? '';
			const k = document.querySelector('.cubeopt, .cube') ? 'cube' : document.querySelector('.mboard') ? 'match' : (document.querySelector('.choice') || /초등|중등|고등|어른/.test(chip)) ? 'choice' : 'other';
			const give=[...document.querySelectorAll('button')].find(b=>/^(모르겠어요|건너뛰기)$/.test(b.textContent.trim())); give?.click(); await new Promise(r=>setTimeout(r,400));
			const nx=[...document.querySelectorAll('button')].find(b=>/다음/.test(b.textContent) && b.offsetParent); nx?.click(); await new Promise(r=>setTimeout(r,700)); return k;`);
		kinds.push(k);
	}
	ok(`/play?filter=${f} 는 그 유형만`, kinds.every((k) => k === want), kinds.join(','));
}

// 5b. 상식 대결 링크 미리보기 — 친구 점수 그림 · 제목(10/15)
m = await (async () => { const h = await (await fetch(BASE + '/trivia/duel?s=4242&n=7&t=80&nocache=' + Date.now())).text(); const im = [...h.matchAll(/property="og:image" content="([^"]+)"/g)].map((x) => x[1]); const t = (h.match(/property="og:title" content="([^"]+)"/) || [])[1]; return { im, t }; })();
ok('대결 링크 미리보기 = 친구 점수 그림 하나 · 제목', m.im.length === 1 && m.im[0].endsWith('/og/duel-7.png') && (m.t || '').includes('7/10'), JSON.stringify(m));

// 5c. 상식 대결을 링크로 받아 끝까지 — 첫 화면 1번 문제 · 결과 미리보기 그림 · 반응(10/16)
//     반응 저장(/api/feedback)은 가로채 운영 의견함에 시험 글이 쌓이지 않게 한다
await b.go('/trivia/duel?s=4242&n=7&t=80', 2500);
m = await b.ev(`
	const first = { choices: document.querySelectorAll('.choice').length, h1: document.querySelector('h1')?.textContent.trim() ?? '', btn: [...document.querySelectorAll('button')].some(x=>/대결 시작|도전하기/.test(x.textContent)) };
	window.__fb = []; const of = window.fetch; window.fetch = (u, o) => { if (String(u).includes('/api/feedback')) { window.__fb.push(o?.body); return Promise.resolve(new Response('{"ok":true}', { status: 200 })); } return of(u, o); };
	for (let i = 0; i < 10; i++) {
		document.querySelector('.choice:not([disabled])')?.click(); await new Promise(r=>setTimeout(r,250));
		[...document.querySelectorAll('button')].find(x=>/다음 문제|결과 보기/.test(x.textContent))?.click(); await new Promise(r=>setTimeout(r,350));
	}
	const img = document.querySelector('.preview'); await new Promise(r=>setTimeout(r,1500));
	const res = { score: document.querySelector('.big')?.textContent.trim(), img: img?.getAttribute('src'), loaded: img ? img.naturalWidth : 0, vs: document.querySelector('.vsres b')?.textContent.trim(), share: [...document.querySelectorAll('.cta')].map(x=>x.textContent.trim()).join('|') };
	document.querySelector('.react .opt')?.click(); await new Promise(r=>setTimeout(r,400));
	res.after = document.querySelector('.react .q')?.textContent.trim(); res.posted = window.__fb.map(x=>JSON.parse(x)).map(x=>x.kind+':'+x.quick+':'+x.page);
	return { first, res };`);
ok('대결 링크로 들어오면 첫 화면에 1번 보기가 바로 있음 · 시작 버튼 없음', m.first.choices >= 3 && !m.first.btn && /7 \/ 10/.test(m.first.h1), JSON.stringify(m.first));
// 10/20~ 링크로 받은 대결의 결과는 답장이다 — 받는 쪽(도전장 보낸 친구 7점)의 답장 그림
ok('대결 결과에 친구가 받을 답장 그림(친구 점수 번호 · 실제로 뜸) · 승패 · 보내기', (m.res.img ?? '').endsWith('/og/duel-reply-7.png') && m.res.loaded === 1200 && !!m.res.vs && /결과 보내기/.test(m.res.share), JSON.stringify(m.res));
ok('반응 누르면 고맙다는 말과 한마디 칸 · 저장 요청은 quick', /고마워요/.test(m.res.after ?? '') && m.res.posted.length === 1 && m.res.posted[0].startsWith('fun:true:/trivia/duel'), JSON.stringify(m.res.posted));
await b.shot(OUT + 'f-duel-result.jpg');

// 5d. 상식 대결 답장(&a=&b=, 10/20) — 도전장 보낸 쪽이 열면 문제 대신 결과 비교 · 미리보기는 내 점수만 · 복수전은 새 문제
m = await (async () => { const h = await (await fetch(BASE + '/trivia/duel?s=4242&n=9&t=60&a=7&b=80&nocache=' + Date.now())).text(); const im = [...h.matchAll(/property="og:image" content="([^"]+)"/g)].map((x) => x[1]); const t = (h.match(/property="og:title" content="([^"]+)"/) || [])[1]; const d = (h.match(/property="og:description" content="([^"]+)"/) || [])[1]; return { im, t, d }; })();
ok('답장 링크 미리보기 = 내 점수 그림 · 친구 점수는 감춤', m.im.length === 1 && m.im[0].endsWith('/og/duel-reply-7.png') && /답했어요/.test(m.t || '') && !/9\//.test((m.t || '') + (m.d || '')), JSON.stringify(m));
await b.go('/trivia/duel?s=4242&n=9&t=60&a=7&b=80', 2500);
m = await b.ev(`
	const r = { h1: document.querySelector('h1')?.textContent.trim(), sides: [...document.querySelectorAll('.board .side')].map(s=>s.textContent.replace(/\\s+/g,' ').trim()), won: document.querySelector('.board .side.won .who')?.textContent, cta: document.querySelector('.cta')?.textContent.trim(), choices: document.querySelectorAll('.choice').length };
	[...document.querySelectorAll('button')].find(x=>/내가 풀어 보기/.test(x.textContent))?.click(); await new Promise(r=>setTimeout(r,400));
	r.afterPlay = { choices: document.querySelectorAll('.choice').length, h1: document.querySelector('h1')?.textContent.trim() };
	return r;`);
ok('답장 열면 문제 대신 나 7 · 친구 9 비교 · 친구 승 · 복수전 버튼', m.choices === 0 && /친구가 이겼어요/.test(m.h1 ?? '') && m.sides.length === 2 && /나 7/.test(m.sides[0]) && /친구 9/.test(m.sides[1]) && m.won === '친구' && /복수전/.test(m.cta ?? ''), JSON.stringify(m));
ok('답장에서 「이 10문제 내가 풀어 보기」 → 친구 9점 도전장으로 1번부터', m.afterPlay.choices >= 3 && /9 \/ 10/.test(m.afterPlay.h1 ?? ''), JSON.stringify(m.afterPlay));
await b.shot(OUT + 'f-duel-reply.jpg');
await b.go('/trivia/duel?s=4242&n=9&t=60&a=7&b=80', 2500);
// 누르면 페이지가 바뀌어 같은 평가가 끊긴다 — 누르기와 재기를 나눈다
await b.ev(`setTimeout(() => document.querySelector('.cta')?.click(), 50); return 1;`);
await new Promise((r) => setTimeout(r, 3000));
m = await b.ev(`return { path: location.pathname, search: location.search, choices: document.querySelectorAll('.choice').length, h1: document.querySelector('h1')?.textContent.trim() };`);
ok('복수전 → 씨앗 없는 새 대결(1번부터)', m.path === '/trivia/duel' && m.search === '' && m.choices >= 3 && /친구와 겨뤄요/.test(m.h1 ?? ''), JSON.stringify(m));

// 5e. 성냥 대결(10/20) — 링크 미리보기 · 첫 화면 1번 판 · 뽑고 내려놓기 · 넘기기 5번 → 결과 · 답장 비교
m = await (async () => { const h = await (await fetch(BASE + '/matchstick/duel?s=4242&n=3&t=60&nocache=' + Date.now())).text(); const im = [...h.matchAll(/property="og:image" content="([^"]+)"/g)].map((x) => x[1]); const t = (h.match(/property="og:title" content="([^"]+)"/) || [])[1]; return { im, t }; })();
ok('성냥 대결 링크 미리보기 = 친구 점수 그림 하나 · 제목', m.im.length === 1 && m.im[0].endsWith('/og/mduel-3.png') && (m.t || '').includes('3/5'), JSON.stringify(m));
await b.go('/matchstick/duel?s=4242&n=3&t=60', 2500);
m = await b.ev(`
	const first = { h1: document.querySelector('h1')?.textContent.trim() ?? '', lit: document.querySelectorAll('.mboard .stick.lit').length, sc: document.querySelector('.sc')?.textContent.trim() };
	const s = document.querySelector('.mboard .stick.lit'); const loc = s?.getAttribute('data-loc');
	s?.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r=>setTimeout(r,300));
	first.afterPick = { lit: document.querySelectorAll('.mboard .stick.lit').length, sc: document.querySelector('.sc')?.textContent.trim() };
	document.querySelector('.mboard [data-loc="' + loc + '"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r=>setTimeout(r,300));
	first.afterPut = document.querySelectorAll('.mboard .stick.lit').length;
	for (let i = 0; i < 5; i++) { [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='넘기기')?.click(); await new Promise(r=>setTimeout(r,1900)); }
	const img = document.querySelector('.preview'); await new Promise(r=>setTimeout(r,1500));
	return { first, res: { score: document.querySelector('.big')?.textContent.trim(), img: img?.getAttribute('src'), loaded: img ? img.naturalWidth : 0, vs: document.querySelector('.vsres b')?.textContent.trim(), share: document.querySelector('.cta')?.textContent.trim() } };`);
ok('성냥 대결 첫 화면에 1번 판 · 친구 3/5 · 성냥 누르면 시작', /3 \/ 5/.test(m.first.h1) && m.first.lit > 5 && /누르면 시작/.test(m.first.sc ?? '') && m.first.afterPick.lit === m.first.lit - 1 && /맞힌 수 0/.test(m.first.afterPick.sc ?? '') && m.first.afterPut === m.first.lit, JSON.stringify(m.first));
ok('성냥 대결 넘기기 5번 → 0/5 · 졌어요 · 답장 그림(친구 3) · 결과 보내기', /^0/.test(m.res.score ?? '') && m.res.vs === '졌어요' && (m.res.img ?? '').endsWith('/og/mduel-reply-3.png') && m.res.loaded === 1200 && /결과 보내기/.test(m.res.share ?? ''), JSON.stringify(m.res));
await b.shot(OUT + 'f-mduel-result.jpg');
await b.go('/matchstick/duel?s=4242&n=3&t=60&a=4&b=50', 2500);
m = await b.ev(`return { h1: document.querySelector('h1')?.textContent.trim(), sides: [...document.querySelectorAll('.board-vs .side')].map(s=>s.textContent.replace(/\\s+/g,' ').trim()), cta: document.querySelector('.cta')?.textContent.trim(), boards: document.querySelectorAll('.mboard').length };`);
ok('성냥 대결 답장 = 나 4 · 친구 3 · 내가 이김 · 한 판 더(판 없음)', /내가 이겼어요/.test(m.h1 ?? '') && /나 4/.test(m.sides[0] ?? '') && /친구 3/.test(m.sides[1] ?? '') && /한 판 더/.test(m.cta ?? '') && m.boards === 0, JSON.stringify(m));
await b.shot(OUT + 'f-mduel-reply.jpg');

// 5f. 성냥을 마우스로 끌어 옮기기(10/20 — 여울게임터 운영자 메일 지적). 실제 마우스 이벤트로 켜진 성냥 → 빈 자리
await b.go('/matchstick/duel?s=4242', 2500);
m = await b.ev(`
	const c = (el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, loc: el.getAttribute('data-loc') }; };
	const from = document.querySelector('.mboard [data-lit="1"][data-loc^="g0"]');
	const to = document.querySelector('.mboard [data-lit="0"][data-loc^="g2"]');
	return from && to ? { from: c(from), to: c(to) } : null;`);
if (m) {
	const mouse = (type, p, buttons = 1) => b.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons, clickCount: 1 });
	await mouse('mousePressed', m.from);
	for (let i = 1; i <= 6; i++) await mouse('mouseMoved', { x: m.from.x + ((m.to.x - m.from.x) * i) / 6, y: m.from.y + ((m.to.y - m.from.y) * i) / 6 });
	await mouse('mouseReleased', m.to, 0);
	await sleep(80);
	const after = await b.ev(`return { from: document.querySelector('.mboard [data-loc="${m.from.loc}"]').getAttribute('data-lit'), to: document.querySelector('.mboard [data-loc="${m.to.loc}"]').getAttribute('data-lit'), sc: document.querySelector('.sc')?.textContent.trim(), fb: document.querySelector('.verdict')?.textContent.trim() ?? '' };`);
	ok('마우스로 끌어 옮기면 원래 자리는 비고 놓은 자리에 꽂힘 · 대결 시작', after.from === '0' && after.to === '1' && /맞힌 수/.test(after.sc ?? ''), JSON.stringify({ ...m, after }));
	// 끌지 않은 누르기는 지금까지처럼 「집기」 — 끌기 뒤 click을 삼키는 장치가 다음 누르기를 먹지 않는지
	await sleep(700);
	const tap = await b.ev(`const s = document.querySelector('.mboard [data-lit="1"]'); s.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r=>setTimeout(r,200)); return document.querySelectorAll('.mboard .stick.picked').length;`);
	ok('끌기 뒤에도 누르기로 집기가 그대로 됨', tap === 1, 'picked=' + tap);
} else ok('끌기 시험 판을 못 찾음', false, 'null');
// 같은 판을 쓰는 오늘의 성냥개비에서도 — 판이 움직이는 화면이 또 있는지
await b.go('/matchstick', 3500);
m = await b.ev(`document.querySelector('.today .big')?.click(); await new Promise(r=>setTimeout(r,900));
	const c = (el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, loc: el.getAttribute('data-loc') }; };
	const from = document.querySelector('.mboard [data-lit="1"][data-loc^="g0"]'); const to = document.querySelector('.mboard [data-lit="0"][data-loc^="g2"]');
	return from && to ? { from: c(from), to: c(to) } : null;`);
if (m) {
	const mouse = (type, p, buttons = 1) => b.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons, clickCount: 1 });
	await mouse('mousePressed', m.from);
	for (let i = 1; i <= 6; i++) await mouse('mouseMoved', { x: m.from.x + ((m.to.x - m.from.x) * i) / 6, y: m.from.y + ((m.to.y - m.from.y) * i) / 6 });
	await mouse('mouseReleased', m.to, 0);
	await sleep(80);
	const after = await b.ev(`return { from: document.querySelector('.mboard [data-loc="${m.from.loc}"]').getAttribute('data-lit'), to: document.querySelector('.mboard [data-loc="${m.to.loc}"]').getAttribute('data-lit') };`);
	ok('오늘의 성냥개비도 마우스로 끌어 옮기기', after.from === '0' && after.to === '1', JSON.stringify({ ...m, after }));
} else ok('오늘의 성냥개비 판을 못 찾음', false, 'null');

// 5g. 상식 단계 도전(10/20, 「딸깍 5단계」) — 지도 · 잠금 · 한 판 풀고 결과 · 진행 저장
await b.go('/trivia/stages', 2500);
await b.ev(`localStorage.removeItem('ddal.trivia.stages'); return 1;`);
await b.go('/trivia/stages', 2500);
m = await b.ev(`
	const tiers = [...document.querySelectorAll('.tier h3')].map(h=>h.textContent.trim());
	const firsts = [...document.querySelectorAll('.tier')].map(t=>t.querySelector('.stile')?.tagName);
	const second = document.querySelector('.tier .stile:nth-child(2)')?.className ?? '';
	return { tiers, firsts, second };`);
ok('상식 단계 지도 — 새싹 · 쉬움 · 보통 · 어려움, 단계마다 첫 판 열림, 둘째 판 잠김', m.tiers.length === 4 && /새싹/.test(m.tiers[0]) && /어려움/.test(m.tiers[3]) && m.firsts.every((t) => t === 'A') && /locked/.test(m.second), JSON.stringify(m));
await b.go('/trivia/stages/2', 2500);
m = await b.ev(`return document.querySelector('h1')?.textContent.trim() ?? '';`);
ok('잠긴 판을 주소로 열면 앞 판 안내', /잠긴 판/.test(m), m);
await b.go('/trivia/stages/1', 2500);
m = await b.ev(`
	for (let i = 0; i < 5; i++) {
		document.querySelector('.choice:not([disabled])')?.click(); await new Promise(r=>setTimeout(r,250));
		[...document.querySelectorAll('button')].find(x=>/다음 문제|결과 보기/.test(x.textContent))?.click(); await new Promise(r=>setTimeout(r,300));
	}
	const stars = (document.querySelector('.stars')?.getAttribute('aria-label') ?? '');
	const n = Number((stars.match(/\\d/) || ['-1'])[0]);
	return { h1: document.querySelector('h1')?.textContent.trim(), marks: (document.querySelector('.marks')?.textContent.match(/✅|❌/g) || []).length, n, saved: JSON.parse(localStorage.getItem('ddal.trivia.stages') || '{}'), next: document.querySelector('.cta')?.getAttribute('href') ?? null, again: !![...document.querySelectorAll('button')].find(x=>/다시 하기/.test(x.textContent)) };`);
ok('상식 단계 1판을 끝까지 → 별 · 5칸 표시 · 통과면 진행 저장과 2판 링크', m.marks === 5 && m.again && (m.n > 0 ? m.saved['1'] === m.n && m.next === '/trivia/stages/2' : /조금만 더/.test(m.h1 ?? '') && !m.saved['1']), JSON.stringify(m));
await b.shot(OUT + 'f-tstage-result.jpg');
await b.ev(`localStorage.setItem('ddal.trivia.stages', JSON.stringify({ 1: 3 })); return 1;`);
await b.go('/trivia/stages', 2500);
m = await b.ev(`const t = document.querySelector('.tier'); return { star: t.querySelector('.stile')?.textContent.trim(), second: t.querySelector('.stile:nth-child(2)')?.tagName, sub: t.querySelector('.th p')?.textContent.trim() };`);
ok('1판 ★3이 지도에 · 2판이 열림 · 통과 수', /★★★/.test(m.star ?? '') && m.second === 'A' && /1판 통과/.test(m.sub ?? ''), JSON.stringify(m));
await b.shot(OUT + 'f-tstage-map.jpg');

// 6. 상식 홈 — 견본 눌러 보기 · 접기 · 타일
await b.go('/trivia', 2000);
m = await b.ev(`
	const h0 = document.documentElement.scrollHeight;
	const tiles = [...document.querySelectorAll('.modes .mode')].map(a=>a.textContent.trim().slice(0,8)+':'+a.getAttribute('href'));
	const ch = document.querySelector('.samples button, .samples .choices button, .samples li button');
	ch?.click(); await new Promise(r=>setTimeout(r,300));
	const opened = !!document.querySelector('.samples details[open]');
	const more = [...document.querySelectorAll('button')].find(b=>/모두 보기/.test(b.textContent)); more?.click(); await new Promise(r=>setTimeout(r,400));
	return { tiles, opened, h0, h1: document.documentElement.scrollHeight, inDom: document.querySelectorAll('.samples .sample').length };
`);
ok('상식 홈 타일 4개 · 단계 도전 있음', m.tiles.length === 4 && m.tiles.some((t) => t.endsWith(':/trivia/stages')), m.tiles.join(' '));
ok('상식 견본 보기를 누르면 정답이 펼쳐짐', m.opened);
ok('「모두 보기」로 펼치면 길어짐, 20문제는 처음부터 페이지에 있음', m.h1 > m.h0 + 1000 && m.inDom === 20, `${m.h0}→${m.h1}, 문제 ${m.inDom}`);

// 7. 전개도 — 연습 시작 타일
await b.go('/cubenet', 2000);
m = await b.ev(`
	const t=[...document.querySelectorAll('.mode')].find(x=>/연습 시작/.test(x.textContent)); t?.click(); await new Promise(r=>setTimeout(r,800));
	const opts=[...document.querySelectorAll('section.q button')]; opts[0]?.click(); await new Promise(r=>setTimeout(r,800));
	return { tile: !!t, q: !!document.querySelector('section.q'), opts: opts.length, after: document.querySelector('section.q')?.innerText.slice(0,80).replace(/\\s+/g,' ') };
`);
ok('전개도 「연습 시작」 → 문제 → 답 고르면 판정', m.tile && m.q && m.opts >= 2, m.after);
await b.shot(OUT + 'f-cube.jpg');

// 8. 성냥 — 모드 타일
await b.go('/matchstick', 2500);
m = await b.ev(`
	const tiles=[...document.querySelectorAll('.modes .mode')].map(x=>x.textContent.trim().slice(0,6));
	const time=[...document.querySelectorAll('.mode')].find(x=>/타임어택/.test(x.textContent)); time.click(); await new Promise(r=>setTimeout(r,300));
	const opts=document.querySelectorAll('.opt').length;
	const grid=[...document.querySelectorAll('button')].find(b=>/60단계 전체 보기/.test(b.textContent)); grid?.click(); await new Promise(r=>setTimeout(r,300));
	const cells=document.querySelectorAll('#stages button, #stages a').length;
	const free=[...document.querySelectorAll('.mode')].find(x=>/무한 연습/.test(x.textContent)); free.click(); await new Promise(r=>setTimeout(r,900));
	return { tiles, opts, cells, board: !!document.querySelector('.mboard'), hint: [...document.querySelectorAll('button')].some(b=>/힌트/.test(b.textContent)) };
`);
ok('성냥 모드 타일 6개', m.tiles.length === 6, m.tiles.join(' '));
ok('타임어택 누르면 3·5·10분 펼침', m.opts === 3);
ok('단계판 펼치기', m.cells >= 60, 'cells=' + m.cells);
ok('무한 연습 시작 → 판·힌트', m.board && m.hint);

// 9. 그림 퍼즐 — 한 문제 정답 보기까지
await b.go('/matchstick/picture', 2000);
m = await b.ev(`
	document.querySelector('.pcard').click(); await new Promise(r=>setTimeout(r,500));
	const idle=document.querySelectorAll('rect.slot').length;
	const lit=[...document.querySelectorAll('rect.hit')].find(h=>h.getAttribute('aria-label').includes('성냥 있음'));
	lit.dispatchEvent(new MouseEvent('click',{bubbles:true})); await new Promise(r=>setTimeout(r,300));
	const held=document.querySelectorAll('rect.slot').length;
	const litName=lit.getAttribute('aria-label').split(' — ')[0];
	const empty=[...document.querySelectorAll('rect.hit')].find(h=>h.getAttribute('aria-label').includes('빈 자리') && !h.getAttribute('aria-label').startsWith(litName+' '));
	empty.dispatchEvent(new MouseEvent('click',{bubbles:true})); await new Promise(r=>setTimeout(r,300));
	const moved=document.body.innerText.match(/옮긴 성냥\\s*(\\d)/)?.[1];
	return { idle, held, moved };
`);
ok('그림 퍼즐: 평소 빈 자리 숨김, 집으면 보임, 놓으면 옮긴 수 1', m.idle === 0 && m.held > 0 && m.moved === '1', JSON.stringify(m));

// 10. 초성 — 오늘의 초성 · 분야 풀기
await b.go('/chosung', 2000);
m = await b.ev(`
	const btn=[...document.querySelectorAll('button, a')].find(b=>/풀어 보기/.test(b.textContent)); btn?.click(); await new Promise(r=>setTimeout(r,800));
	const input=document.querySelector('input'); return { started: !!input, tiles: document.querySelectorAll('.tile, [class*=cho]').length };
`);
ok('오늘의 초성 풀어 보기 → 입력칸', m.started);
await b.shot(OUT + 'f-cho.jpg');

// 12. 탭 막대 이동
for (const [tab, path] of [['놀이', '/games'], ['기록', '/record'], ['오늘', '/']]) {
	const r = await b.ev(`const a=[...document.querySelectorAll('nav a')].find(a=>a.textContent.trim()==='${tab}'); a.click(); await new Promise(r=>setTimeout(r,1500)); return location.pathname;`);
	ok(`탭 「${tab}」 → ${path}`, r === path, r);
}

await b.close();
ok('흐름 전체에서 콘솔 오류·HTTP 오류 없음', b.errors.length === 0, b.errors.slice(0, 8).join(' || '));
ok('정답률·알림 서버 기록은 전부 가로챔(운영 숫자 오염 없음)', true, `${b.stats.length}건: ${[...new Set(b.stats)].slice(0, 4).join(', ')}`);
writeFileSync(OUT + 'flow.json', JSON.stringify(res, null, 1));
console.log(`\n${res.filter((r) => r.pass).length} / ${res.length} 통과`);
if (res.some((r) => !r.pass)) process.exitCode = 1;
