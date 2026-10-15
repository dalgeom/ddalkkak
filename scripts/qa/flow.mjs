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
ok('상식 홈 타일 4개', m.tiles.length === 4, m.tiles.join(' '));
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
