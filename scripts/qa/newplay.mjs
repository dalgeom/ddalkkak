// 놀이 연습 세 쪽(2026-11-25) — /sudoku · /scramble · /equation. 판 · 푸는 법이 보이는지, 「답 보기」 → 풀이 → 「다음 판」,
// 새로 고쳐도 몇 번째 판인지 남는지, 놀이 탭(/games)에 카드 셋, 가로 넘침.
import { launch, sleep } from './cdp.mjs';

const b = await launch('newplay');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 40; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(250); } return false; };
const kicker = `document.querySelector('.card.play .kicker')?.innerText ?? ''`;
const click = (label) => b.ev(`const x = [...document.querySelectorAll('.card.play button')].find((x) => x.innerText.trim() === ${JSON.stringify(label)}); x?.click(); return !!x;`);

const PAGES = [
	['sudoku', '스도쿠'],
	['scramble', '글자 섞기'],
	['equation', '방정식']
];

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	for (const [kind, title] of PAGES) {
		await b.go(`/${kind}`, 800);
		await b.ev(`localStorage.removeItem('ddal.practice.${kind}'); return 1;`);
		await b.go(`/${kind}`, 800);
		ok(`${w} /${kind} 제목`, await b.ev(`return (document.querySelector('h1')?.innerText ?? '').replace(/\\s/g, '').includes(${JSON.stringify(title.replace(/\s/g, ''))});`));
		ok(`${w} /${kind} 첫 판`, await until(`/^1번째/.test(${kicker})`), await b.ev(`return ${kicker};`));
		ok(`${w} /${kind} 푸는 법`, await b.ev(`return document.querySelector('.rules h2')?.innerText === '어떻게 푸나요';`));
		ok(`${w} /${kind} 답 보기 → 풀이`, (await click('답 보기')) && (await until(`(document.querySelector('.card.play .exp')?.innerText ?? '').length > 15`)),
			await b.ev(`return (document.querySelector('.card.play .exp')?.innerText ?? '없음').slice(0, 60);`));
		ok(`${w} /${kind} 다음 판`, (await click('다음 판')) && (await until(`/^2번째/.test(${kicker}) && !document.querySelector('.card.play .exp')`)),
			await b.ev(`return ${kicker};`));
		await b.go(`/${kind}`, 800);
		ok(`${w} /${kind} 새로 고침 뒤 2번째 판`, await until(`/^2번째/.test(${kicker})`), await b.ev(`return ${kicker};`));
		ok(`${w} /${kind} 가로 넘침 없음`, (await b.ev(`return document.documentElement.scrollWidth - innerWidth;`)) <= 0);
		await b.ev(`localStorage.removeItem('ddal.practice.${kind}'); return 1;`);
	}

	await b.go('/games', 800);
	const links = await b.ev(`return ['/sudoku', '/scramble', '/equation'].filter((p) => document.querySelector('.games a.main[href="' + p + '"]')).length;`);
	ok(`${w} 놀이 탭 카드 셋`, links === 3, `${links}/3`);
	ok(`${w} 놀이 탭 가로 넘침 없음`, (await b.ev(`return document.documentElement.scrollWidth - innerWidth;`)) <= 0);
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
