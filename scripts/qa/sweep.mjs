// 1·2: 전 화면 훑기(콘솔 오류 · 가로 넘침 · 깨진 이미지 · 공통 머리) + 내부 링크 응답 확인
import { launch, BASE, sleep, OUT } from './cdp.mjs';
import { writeFileSync } from 'node:fs';

const sm = await (await fetch(BASE + '/sitemap.xml?nocache=' + Date.now())).text();
const fromMap = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(BASE, '') || '/');
const extra = ['/games', '/news', '/record', '/today', '/play', '/play?filter=cube', '/play?filter=trivia', '/play?filter=puzzle', '/play?filter=match',
	'/matchstick', '/matchstick/picture', '/chosung', '/cubenet', '/trivia/duel', '/trivia/duel?s=4242&n=7&t=80', '/matchstick/duel', '/matchstick/duel?s=4242&n=3&t=60', '/matchstick/duel?s=4242&n=3&t=60&a=4&b=50', '/trivia/stages', '/trivia/stages/1', '/trivia/stages/20'];
const pages = [...new Set([...fromMap, ...extra])];

const NARROW = ['/', '/games', '/news', '/record', '/play', '/matchstick', '/matchstick/picture', '/chosung', '/trivia', '/discover', '/cubenet', '/read', '/archive', '/about', '/guide', '/trivia/duel', '/matchstick/duel', '/trivia/korean-history', '/discover/number'];
const b = await launch('sweep');
const rows = [];
const links = new Set();
for (const w of [390, 320]) {
	await b.viewport(w);
	for (const p of pages) {
		if (w === 320 && !NARROW.includes(p)) continue;
		await b.go(p, 1500);
		const r = await b.ev(`
			await new Promise(r=>setTimeout(r,300));
			const W = innerWidth;
			const over = [...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && (r.right>W+1 || r.left< -1) && getComputedStyle(e).position!=='fixed' && !e.closest('.fold,.mboard,svg,ins,.adslot,[class*=ad]');}).slice(0,3).map(e=>e.tagName+'.'+[...e.classList].join('.')+' '+Math.round(e.getBoundingClientRect().right));
			const imgs = [...document.images].filter(i=>i.complete && i.naturalWidth===0 && !/google|doubleclick/.test(i.src)).map(i=>i.src).slice(0,3);
			const hrefs = [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/') && !h.startsWith('//'));
			return { w: W, sw: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, over, imgs, hrefs,
				og: document.querySelectorAll('meta[property="og:image"]').length, cover: !!document.querySelector('header.cover'), h1: document.querySelector('h1')?.textContent.trim().slice(0,30) ?? '', title: document.title.slice(0,40) };
		`);
		r.hrefs.forEach((h) => links.add(h.split('#')[0] || '/'));
		rows.push({ p, w, ...r, hrefs: undefined });
	}
}
await b.close();

// 링크 응답 — 같은 경로는 한 번만
const status = [];
for (const l of [...links].sort()) {
	if (l.startsWith('/api')) continue;
	try {
		const res = await fetch(BASE + l + (l.includes('?') ? '&' : '?') + 'nocache=' + Date.now(), { redirect: 'manual' });
		const body = res.status === 200 ? await res.text() : '';
		const notFound = res.status !== 200 || /<title>[^<]*(404|Not Found|찾을 수 없)/i.test(body);
		status.push({ l, s: res.status, bad: notFound });
	} catch (e) { status.push({ l, s: 'ERR ' + e.message, bad: true }); }
	await sleep(60);
}
writeFileSync(OUT + 'sweep.json', JSON.stringify({ rows, status, errors: b.errors, stats: b.stats }, null, 1));
console.log('화면', rows.length, '· 링크', status.length);
console.log('가로 넘침', rows.filter((r) => r.sw > r.w + 1 || r.over.length).map((r) => `${r.w} ${r.p} sw=${r.sw} ${r.over.join(', ')}`));
console.log('깨진 이미지', rows.filter((r) => r.imgs.length).map((r) => `${r.p} ${r.imgs}`));
console.log('미리보기 그림 태그가 1개가 아님', rows.filter((r) => r.og !== 1).map((r) => `${r.p} ${r.og}개`));
console.log('공통 머리 없음', [...new Set(rows.filter((r) => !r.cover).map((r) => r.p))]);
console.log('나쁜 링크', status.filter((s) => s.bad));
console.log('오류', b.errors.length ? b.errors : '없음');
console.log('막은 서버 기록 요청', b.stats.length);
if (rows.some((r) => r.sw > r.w + 1 || r.over.length || r.imgs.length || r.og !== 1) || status.some((s) => s.bad) || b.errors.length) process.exitCode = 1;
