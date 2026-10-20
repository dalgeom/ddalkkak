// 화면마다 눈에 보이는 상자(카드·버튼·띠)끼리 세로 간격을 잰다. 8px 미만이면 「붙음」.
import { launch, BASE, OUT } from './cdp.mjs';
const sm = await (await fetch(BASE + '/sitemap.xml?nocache=' + Date.now())).text();
const pages = [...new Set([...[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, '') || '/'),
	'/games', '/news', '/record', '/today', '/play', '/matchstick', '/matchstick/picture', '/chosung', '/cubenet', '/trivia/duel', '/matchstick/duel', '/trivia/stages', '/trivia/stages/1'])];
const b = await launch('gaps');
await b.viewport(390);
const bad = [];
for (const p of pages) {
	await b.go(p + (p.includes('?') ? '&' : '?') + 'nocache=' + Date.now(), 1500);
	const r = await b.ev(`
		// 본문의 바로 아래 자식들을 따라 내려가며(한 겹짜리 감싸개는 건너뜀) 형제 상자 사이 간격을 잰다
		const main = document.querySelector('main') || document.body;
		const out = [];
		const visible = (e) => { const c = getComputedStyle(e); return e.getBoundingClientRect().height > 0 && c.display !== 'none' && c.position !== 'fixed'; };
		const boxed = (e) => { const c = getComputedStyle(e); return c.borderTopWidth !== '0px' || (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent') || c.boxShadow !== 'none'; };
		function walk(el, depth) {
			const kids = [...el.children].filter(visible);
			const pc = getComputedStyle(el);
			const designedGap = /flex|grid/.test(pc.display) && parseFloat(pc.rowGap) >= 4;
			for (let i = 1; i < kids.length; i++) {
				if (designedGap && (c => c)(true)) { const g = kids[i].getBoundingClientRect().top - kids[i-1].getBoundingClientRect().bottom; if (g >= 0 && g <= 40) continue; }
				const a = kids[i - 1], c = kids[i];
				const gap = c.getBoundingClientRect().top - a.getBoundingClientRect().bottom;
				if ((gap < 8 || gap > 40) && (boxed(a) || boxed(c)) && a.getBoundingClientRect().height > 30 && c.getBoundingClientRect().height > 30 && Math.abs(a.getBoundingClientRect().left - c.getBoundingClientRect().left) < 30)
					out.push(Math.round(gap) + 'px: ' + a.tagName.toLowerCase() + '.' + [...a.classList].filter(x=>!x.startsWith('svelte')).join('.') + ' ↔ ' + c.tagName.toLowerCase() + '.' + [...c.classList].filter(x=>!x.startsWith('svelte')).join('.'));
			}
			if (depth < 3) for (const k of kids) if (!boxed(k)) walk(k, depth + 1);
		}
		walk(main, 0);
		return out;`);
	if (r.length) bad.push(`${p}\n    ${r.join('\n    ')}`);
}
await b.close();
console.log(bad.length ? bad.join('\n') : '붙은 곳 없음');
console.log('오류', b.errors.length ? b.errors.slice(0, 5) : '없음');
if (bad.length || b.errors.length) process.exitCode = 1;
