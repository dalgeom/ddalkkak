// 인앱(네이버 앱 등 Android) 알림 우회(2026-11-10) — 알림 API가 없는 인앱에서 초성 분야 3개를 맞히면
// 「크롬으로 열고 알림 받기」 카드가 뜨는지, 그 주소가 크롬 intent인지, 크롬 쪽 도착(?push=1)에서 알림 카드가 바로 뜨는지,
// 정식 브라우저에서는 인앱 카드가 안 뜨는지, 휴대폰 폭에서 넘치지 않는지.
// 인앱 카드 쪽은 정답을 알아야 해서 dev 서버(소스 모듈 import)에서만 돈다. 운영에서는 도착 쪽만 본다.
import { launch, sleep, OUT, BASE } from './cdp.mjs';
const NAVER =
	'Mozilla/5.0 (Linux; Android 14; SM-S918N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.10.1)';
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const errors = [];

// 크롬 쪽 도착 — 정식 브라우저라 알림 카드가 바로 떠야 한다
{
	const b = await launch('pushback');
	for (const [w, h] of [[390, 844], [320, 568]]) {
		await b.viewport(w, h, true);
		await b.go('/chosung?push=1', 2000);
		for (let i = 0; i < 30 && !(await b.ev(`return !!document.querySelector('.push');`)); i++) await sleep(300);
		const r = await b.ev(`const p = document.querySelector('.push'); if (!p) return null; const x = p.getBoundingClientRect();
			return { text: p.innerText, l: x.left, r: x.right, over: document.documentElement.scrollWidth - innerWidth, btn: !!p.querySelector('button.go') };`);
		ok(`${w} 크롬 도착(?push=1) — 메뉴에 알림 카드`, !!r && r.btn && /알려드릴까요/.test(r.text), r ? r.text.split('\n')[0] : '없음');
		ok(`${w} 카드 폭 안 · 넘침 없음`, !!r && r.l >= 0 && r.r <= w && r.over <= 0);
		await b.shot(`${OUT}pushback-${w}.jpg`);
		await b.go('/chosung', 1500);
		ok(`${w} ?push=1 없으면 메뉴에 카드 없음`, !(await b.ev(`return !!document.querySelector('.push');`)));
	}
	errors.push(...b.errors);
	await b.close();
}

const dev = /localhost|127\.0\.0\.1/.test(BASE);
if (!dev) console.log('건너뜀  인앱 카드 — 정답 확인에 소스 모듈이 필요해 dev 서버에서만 돈다');
else {
	const b = await launch('pushinapp');
	await b.send('Network.setUserAgentOverride', { userAgent: NAVER });
	await b.send('Page.addScriptToEvaluateOnNewDocument', { source: 'delete window.PushManager;' });
	const until = async (cond) => { for (let i = 0; i < 40; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(300); } return false; };
	// 지금 초성에 맞는 낱말을 소스에서 찾아 넣는다(같은 초성이 여럿이면 차례로)
	const solve = `const m = await import('/src/lib/chosung.ts');
		const cho = [...document.querySelectorAll('.card .tiles .tile')].map((t) => t.innerText.trim()).join('');
		const cands = m.CHOSUNG_WORDS.filter((x) => m.chosungOf(x.word).replace(/\\s/g, '') === cho).map((x) => x.word);
		const inp = document.querySelector('.card .ans input');
		const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
		for (const w of cands) {
			if (!inp.isConnected) break;
			set.call(inp, w); inp.dispatchEvent(new Event('input', { bubbles: true }));
			inp.form.requestSubmit();
			await new Promise((r) => setTimeout(r, 250));
			if (document.querySelector('.feedback.ok')) return w;
		}
		return 'X:' + cho + ':' + cands.join(',');`;
	const next = `[...document.querySelectorAll('button')].find((x) => /다음 문제/.test(x.innerText))?.click(); return 1;`;
	for (const [w, h] of [[390, 844], [320, 568]]) {
		await b.viewport(w, h, true);
		await b.go('/chosung', 800);
		await b.ev(`localStorage.clear(); return 1;`);
		await b.go('/chosung?c=animal', 1500);
		ok(`${w} UA가 네이버 앱 · PushManager 없음`, await b.ev(`return /NAVER\\(inapp/.test(navigator.userAgent) && !('PushManager' in window);`));
		let got = [];
		for (let i = 0; i < 3; i++) {
			await until(`document.querySelector('.card input')`);
			got.push(await b.ev(solve));
			if (i < 2) { await b.ev(next); await sleep(500); }
		}
		ok(`${w} 세 개 맞힘`, got.every((x) => !x.startsWith('X:')), got.join(' / '));
		await until(`document.querySelector('.push')`);
		const r = await b.ev(`const p = document.querySelector('.push'); if (!p) return null; const a = p.querySelector('a.go'); const x = p.getBoundingClientRect();
			return { text: p.innerText, href: a?.getAttribute('href') ?? '', l: x.left, r: x.right, over: document.documentElement.scrollWidth - innerWidth };`);
		ok(`${w} 인앱 카드 — 「크롬으로 열고 알림 받기」`, !!r && /크롬으로 열고 알림 받기/.test(r.text) && /네이버 앱 안에서는/.test(r.text), r ? r.text.replace(/\n/g, ' / ') : '없음');
		ok(`${w} 주소가 크롬 intent → /chosung?push=1`, !!r && /^intent:\/\/[^#]+\/chosung\?push=1#Intent;scheme=https?;package=com\.android\.chrome;/.test(r.href), r?.href);
		ok(`${w} 카드 폭 안 · 넘침 없음`, !!r && r.l >= 0 && r.r <= w && r.over <= 0);
		await b.shot(`${OUT}pushinapp-${w}.jpg`);
	}
	errors.push(...b.errors);
	await b.close();
}

console.log('오류', errors.length ? errors : '없음');
if (fail || errors.length) process.exitCode = 1;
