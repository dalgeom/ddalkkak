// 아이폰 엔진(WebKit) 시험 — 크롬 흉내로는 안 보이는 사파리 문제를 잡는다(10/14: 시트 닫을 때 깜빡임).
// Playwright는 저장소 밖 E:/tmp/pw에 둔다(용량 · C 드라이브). 없으면:
//   mkdir E:\tmp\pw && cd /d E:\tmp\pw && npm init -y && npm i playwright@1.49.1
//   set PLAYWRIGHT_BROWSERS_PATH=E:\tmp\pw\browsers && npx playwright install webkit
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const PW = process.env.QA_PW || 'E:/tmp/pw';
if (!existsSync(PW + '/node_modules/playwright')) {
	console.log(`실패  Playwright가 없다(${PW}) — webkit.mjs 맨 위 설치 명령`);
	process.exit(1);
}
process.env.PLAYWRIGHT_BROWSERS_PATH ||= PW + '/browsers';
const { webkit, devices } = createRequire(PW + '/package.json')('playwright');

const BASE = process.env.QA_BASE || 'https://ddalkkak.app';
const res = [];
const ok = (n, p, d = '') => { res.push(p); console.log(`${p ? '통과' : '실패'}  ${n}${d ? '  — ' + d : ''}`); };
const browser = await webkit.launch();
const errs = [];
async function ctxOf(device) {
	const ctx = await browser.newContext({ ...devices[device] });
	await ctx.route(/googletagmanager|google-analytics|googlesyndication|doubleclick|\/api\/stat|\/api\/push|\/api\/feedback/, (r) => r.fulfill({ status: 204, body: '' }));
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errs.push(`[${device}] ${e.message}`));
	return { ctx, page };
}

// 1. 시트 닫을 때 막이 다시 진해지지 않고, 다 투명해진 뒤 지워진다(3회)
{
	const { ctx, page } = await ctxOf('iPhone 13');
	await page.goto(BASE + '/games', { waitUntil: 'load' });
	await page.waitForTimeout(2000);
	let bad = '';
	for (let k = 0; k < 3; k++) {
		await page.click('.fbtn');
		await page.waitForTimeout(800);
		const opened = await page.evaluate(() => !!document.querySelector('.sheet.show'));
		await page.evaluate(() => { window.__ops = []; (function f() { const d = document.querySelector('.dim'); if (d) { window.__ops.push(+getComputedStyle(d).opacity); requestAnimationFrame(f); } })(); });
		await page.mouse.click(195, 20);
		await page.waitForTimeout(900);
		const ops = await page.evaluate(() => window.__ops);
		const up = ops.some((v, i) => i > 0 && v > ops[i - 1] + 0.02);
		const left = await page.evaluate(() => document.querySelectorAll('.dim').length);
		if (!opened || up || (ops.at(-1) ?? 1) > 0.05 || left) bad += ` ${k + 1}회(열림 ${opened} · 다시 진해짐 ${up} · 마지막 ${ops.at(-1)} · 남은 막 ${left})`;
	}
	ok('시트 닫을 때 깜빡임 없음(3회)', !bad, bad);
	// 2. 스플래시 — 메인에서 다른 화면에 갔다 로고로 돌아와도 다시 안 뜸
	await page.goto(BASE + '/', { waitUntil: 'load' });
	await page.waitForTimeout(1800);
	await page.evaluate(() => [...document.querySelectorAll('a[href="/games"]')].find((a) => a.offsetParent)?.click());
	await page.waitForTimeout(1200);
	await page.click('header .logo');
	await page.waitForTimeout(200);
	const sp = await page.evaluate(() => { const e = document.querySelector('.splash'); return !!e && getComputedStyle(e).display !== 'none' && +getComputedStyle(e).opacity > 0.1; });
	ok('로고로 메인에 돌아와도 스플래시 안 뜸', !sp);
	await ctx.close();
}

// 3. 작은 아이폰(SE) · 아이폰 13 — 주요 화면 가로 넘침
for (const dev of ['iPhone SE', 'iPhone 13']) {
	const { ctx, page } = await ctxOf(dev);
	const over = [];
	for (const p of ['/', '/games', '/trivia', '/chosung', '/matchstick', '/record', '/trivia/duel']) {
		await page.goto(BASE + p, { waitUntil: 'load' });
		await page.waitForTimeout(1300);
		const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
		if (o > 1) over.push(`${p} +${o}px`);
	}
	ok(`${dev} 주요 화면 가로 넘침 없음`, !over.length, over.join(', '));
	await ctx.close();
}

await browser.close();
ok('WebKit 페이지 오류 없음', !errs.length, errs.slice(0, 4).join(' | '));
console.log(`\n${res.filter(Boolean).length} / ${res.length} 통과`);
if (res.some((p) => !p)) process.exitCode = 1;
