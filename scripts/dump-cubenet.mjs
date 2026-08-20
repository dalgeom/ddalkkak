/**
 * 전개도 쇼츠에 넣을 문제 덤프를 만든다.
 *
 *   node scripts/dump-cubenet.mjs 10        10번 문제 덤프 출력
 *   node scripts/dump-cubenet.mjs --scan    쓸 만한 문제 목록
 *
 * scene-cubenet.mjs의 `문제` 상수를 이걸로 갈아 끼운다. 이게 없어서 전개도 쇼츠가
 * problemAt(42) 하나에 묶여 있었다.
 *
 * 좋은 문제의 조건 — 오답 셋의 탈락 사유가 갈려야 한다.
 *   · 마주 보는 면이 한 화면에 같이 보이는 것 (규칙 1·2로 바로 지운다)
 *   · 정답의 왼·오만 뒤바뀐 거울상 (여기서부터가 진짜 승부다)
 * 셋이 전부 같은 사유면 해설이 "나머지는 다 틀렸어요"가 되어 배울 게 없다.
 *
 * 전개도는 거울상 사고 전력이 있는 유형이라 문제를 재구현하지 않고 사이트의
 * problemAt을 그대로 읽는다.
 */
import { problemAt, FACES, foldNet, oppositePairs } from '../src/lib/cubenet.ts';
import { CUBE_TOTAL } from '../src/lib/game.ts';

const NAME = (i) => FACES[i].name.split(' ')[1];
const LETTER = 'ABCD';

/** 오답 셋이 어떤 사유로 갈리는지 */
function analyze(p) {
	const ans = p.options[p.answer];
	const cube = foldNet(p.net.cells);
	const opp = new Map();
	for (const [a, b] of oppositePairs(cube)) {
		opp.set(a, b);
		opp.set(b, a);
	}
	const mirror = p.options.findIndex(
		(o, j) => j !== p.answer && o[0] === ans[0] && o[1] === ans[2] && o[2] === ans[1]
	);
	const pairs = p.options
		.map((o, j) => ({ o, j }))
		.filter(({ o, j }) => j !== p.answer && j !== mirror)
		.filter(({ o }) => o.some((f, x) => o.some((g, y) => x < y && opp.get(f) === g)))
		.map(({ j }) => j);
	return { mirror, pairs };
}

/** 42번 영상과 같은 결의 해설 문장 */
function explain(p) {
	const { mirror, pairs } = analyze(p);
	const names = pairs.map((j) => LETTER[j]);
	const left =
		names.length === 2 ? `<b>${names[0]}와 ${names[1]}</b>`
		: names.length === 1 ? `<b>${names[0]}</b>`
		: '';
	const a = left ? `${left}는 마주 보는 면이 함께 보여서, ` : '';
	const b =
		mirror >= 0 ?
			`<b>${LETTER[mirror]}</b>는<br>정답의 왼쪽·오른쪽이 뒤바뀐 <b>거울상</b>이라 안 됩니다.`
		:	'나머지는 접어서 만들 수 없는 모양입니다.';
	return a + b;
}

if (process.argv[2] === '--scan') {
	const rows = [];
	for (let i = 0; i < CUBE_TOTAL; i++) {
		const p = problemAt(i);
		const { mirror, pairs } = analyze(p);
		if (mirror < 0 || pairs.length !== 2) continue;
		rows.push(
			`  ${String(i).padStart(3)} · 정답 ${LETTER[p.answer]} ${p.options[p.answer].map(NAME).join('/')} · 거울상 ${LETTER[mirror]}`
		);
	}
	console.log(`오답 사유가 갈리는 문제 ${rows.length}개 (거울상 1 + 마주보는면 2)\n`);
	console.log(rows.slice(0, 40).join('\n'));
	process.exit(0);
}

const idx = Number(process.argv[2] ?? 42);
const p = problemAt(idx);
const { mirror, pairs } = analyze(p);

console.log(`/* ── 문제: src/lib/cubenet.ts problemAt(${idx}) 덤프 (dump-cubenet.mjs로 재생성) ──`);
console.log(
	`   오답 구조: ${pairs.map((j) => LETTER[j]).join('·')}는 마주 보는 면이 함께 보이고(${oppositePairs(
		foldNet(p.net.cells)
	)
		.map(([a, b]) => `${NAME(a)}↔${NAME(b)}`)
		.join(', ')}),`
);
console.log(`   ${LETTER[mirror]}는 정답 ${LETTER[p.answer]}의 왼·오가 뒤바뀐 거울상이다. */`);
console.log('const 문제 = {');
console.log(`\tcells: ${JSON.stringify(p.net.cells.map((c) => [c.r, c.c]))},`);
console.log(`\tfaceOf: ${JSON.stringify(p.net.faceOf)},`);
console.log(`\toptions: ${JSON.stringify(p.options)},`);
console.log(`\tanswer: ${p.answer},`);
console.log(`\t해설: '${explain(p)}'`);
console.log('};');
console.log(`\n// 보기: ${p.options.map((o, i) => `${LETTER[i]} ${o.map(NAME).join('/')}`).join(' | ')}`);
