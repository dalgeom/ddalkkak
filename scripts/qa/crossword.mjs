// 오늘의 낱말퍼즐(2026-11-17) — 칸 누르기로 낱말 고르기 · 다시 누르면 방향 바꾸기, 글자 수 · 한글 거절 문구, 글자 하나 열기,
// 판이 다 차면 채점(틀린 칸 빨강), 새로 고침 뒤 이어 풀기, 다 풀면 결과 · 뜻풀이 · 연속, 어제 해설 링크, 가로 넘침.
// 운영은 첫 퍼즐(11/19) 전이면 준비 중 카드만 본다 — ?day=는 dev에서만 열린다.
import { launch, sleep } from './cdp.mjs';
import { readFileSync } from 'node:fs';
// node 20은 .ts를 못 읽는다 — 첫날 번호와 첫 퍼즐의 열쇠(낱말 → 열쇠 문구)만 글자로 뽑는다
const src = readFileSync(new URL('../../src/lib/data/crosswordPuzzles.ts', import.meta.url), 'utf8');
const FIRST_DAY = Number(src.match(/CROSSWORD_FIRST_DAY\s*=\s*(\d+)/)[1]);
const block = src.match(/clues:\s*\{([^}]+)\}/)[1];
const clues = [...block.matchAll(/([가-힣]+):\s*'([^']+)'/g)].map((m) => ({ answer: m[1], clue: m[2] }));
const A = clues[0]; // 첫 가로 낱말(빨래집게) — 둘째 글자는 다른 낱말과 겹치지 않아 틀린 칸으로 남는다
const wrongA = A.answer[0] + '내' + A.answer.slice(2);

const b = await launch('crossword');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 40; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(250); } return false; };
const say = (w) => b.ev(`const i = document.querySelector('.dock form input'); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
	s.call(i, ${JSON.stringify(w)}); i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.dock form').requestSubmit(); return 1;`);
const pick = (clue) => b.ev(`const x = [...document.querySelectorAll('.clues button')].find((x) => x.innerText.includes(${JSON.stringify(clue)})); x?.click(); return !!x;`);
const msgText = `document.querySelector('.msg')?.innerText ?? ''`;
const curText = () => b.ev(`return document.querySelector('.cur')?.innerText ?? '';`);
const over = () => b.ev(`return document.documentElement.scrollWidth - innerWidth;`);
const local = process.env.QA_BASE?.includes('localhost');

for (const [w, h] of [[390, 844], [320, 568]]) {
	await b.viewport(w, h, true);
	const q = local ? `?day=${FIRST_DAY}` : '';
	await b.go(`/crossword${q}`, 800);
	await b.ev(`Object.keys(localStorage).filter((k) => k.startsWith('ddal.cw.')).forEach((k) => localStorage.removeItem(k)); return 1;`);
	await b.go(`/crossword${q}`, 800);
	ok(`${w} 푸는 법 설명`, await b.ev(`return document.querySelector('.rules h2')?.innerText === '어떻게 푸나요';`));

	if (!local) {
		// 첫 퍼즐 전엔 준비 중 카드, 그 뒤엔 판 — 어느 쪽이든 하나는 떠야 한다
		const st = await b.ev(`return { wait: !!document.querySelector('a.big.link[href="/kkeut"]'), grid: document.querySelectorAll('.grid > *').length };`);
		ok(`${w} 준비 중 카드 또는 판`, st.wait || st.grid === 25, JSON.stringify(st));
		ok(`${w} 가로 넘침 없음`, (await over()) <= 0);
		continue;
	}

	ok(`${w} 판 5×5`, await until(`document.querySelectorAll('.grid > *').length === 25`));
	// 칸 누르기 — 첫 칸은 가로 · 세로 낱말이 겹친다. 두 번 누르면 방향이 바뀐다
	await b.ev(`document.querySelector('.grid button.cell').click(); return 1;`);
	await sleep(150);
	const c1 = await curText();
	await b.ev(`document.querySelector('.grid button.cell').click(); return 1;`);
	await sleep(150);
	const c2 = await curText();
	ok(`${w} 같은 칸 다시 누르면 방향 바뀜`, c1 !== c2 && /가로/.test(c1 + c2) && /세로/.test(c1 + c2), `${c1} / ${c2}`);
	ok(`${w} 고른 낱말 칸 강조`, await b.ev(`return document.querySelectorAll('.grid .cell.on').length >= 2;`));

	ok(`${w} 열쇠 누르면 그 낱말`, (await pick(A.clue)) && (await curText()).includes(A.clue));
	await say(A.answer.slice(0, -1));
	ok(`${w} 글자 수 경고`, await until(`${msgText} === '${A.answer.length}글자예요.'`), await b.ev(`return ${msgText};`));
	await say('abcd');
	ok(`${w} 한글 아닌 말 거절`, await until(`/한글 낱말로/.test(${msgText})`));

	await b.ev(`document.querySelector('button.hint').click(); return 1;`);
	ok(`${w} 글자 하나 열기`, await until(`document.querySelectorAll('.grid .cell.opened').length === 1`));

	// 첫 낱말은 둘째 글자를 틀리게, 나머지는 바르게 — 판이 차면 틀린 칸 하나가 빨개져야 한다
	await pick(A.clue);
	await say(wrongA);
	await sleep(150);
	for (const c of clues.slice(1)) {
		if (!(await pick(c.clue))) ok(`${w} 열쇠 찾음`, false, c.clue);
		await say(c.answer);
		await sleep(120);
	}
	ok(`${w} 판이 차면 틀린 칸 표시`, await until(`/틀린 칸이 1개/.test(${msgText}) && document.querySelectorAll('.grid .cell.wrong').length === 1`),
		await b.ev(`return ${msgText};`));

	// 이어 풀기 — 새로 고쳐도 채운 칸 · 연 칸이 남는다
	await b.go(`/crossword${q}`, 800);
	ok(`${w} 새로 고침 뒤 이어 풀기`, await until(`document.querySelectorAll('.clues button.full').length === ${clues.length} && document.querySelectorAll('.grid .cell.opened').length === 1`));

	await pick(A.clue);
	await say(A.answer);
	ok(`${w} 다 풀면 결과`, await until(`document.querySelector('#cw-end h2')?.innerText === '다 풀었어요!'`));
	ok(`${w} 낱말마다 뜻풀이`, await until(`document.querySelectorAll('#cw-end .words li').length === ${clues.length} && document.querySelectorAll('#cw-end .words li span').length >= ${clues.length - 2}`),
		await b.ev(`return document.querySelectorAll('#cw-end .words li span').length + '/' + ${clues.length};`));
	ok(`${w} 글자 열기 횟수 · 연속`, await b.ev(`return /글자 열기 1번/.test(document.querySelector('#cw-end .score')?.innerText) && /1일 연속/.test(document.querySelector('.streak')?.innerText ?? '');`));
	ok(`${w} 입력창 사라짐`, await b.ev(`return !document.querySelector('.dock');`));
	// 해설 링크는 빌드 날짜 기준 어제가 첫날 이후일 때만 — 뜨면 실제로 열리는지
	const ans = await b.ev(`return Promise.all([...document.querySelectorAll('a[href^="/crossword/answer/"]')].map((a) => fetch(a.href).then((r) => a.getAttribute('href') + ' ' + r.status)));`);
	ok(`${w} 어제 해설 링크가 열림`, ans.every((s) => s.endsWith(' 200')), ans.length ? ans.join(', ') : '링크 없음(빌드 날짜 기준 어제가 첫날 전)');
	ok(`${w} 가로 넘침 없음`, (await over()) <= 0);
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
