/**
 * 성냥개비 쇼츠에 넣을 문제 블록을 만든다.
 *
 *   node scripts/dump-matchstick.mjs --scan     쓸 만한 문제 목록
 *   node scripts/dump-matchstick.mjs 84         84번 문제 블록 출력
 *
 * scene-matchstick.mjs의 `문제` 상수를 이걸로 갈아 끼운다. 이게 없어서 성냥개비 쇼츠가
 * '0 + 2 = 6' 하나에 묶여 있었다 — 어느 성냥이 어디로 가는지를 손으로 좌표까지 잡아야
 * 했기 때문이다.
 *
 * 두 식을 일곱 마디(7-세그먼트)로 펼쳐 차이를 구하면 옮길 성냥이 저절로 나온다.
 * 사라진 마디가 하나, 생긴 마디가 하나여야 '성냥 하나만 옮기는' 문제다.
 *
 * 쇼츠에 쓸 수 있는 모양은 '한 자리 X (+|-) 한 자리 Y = 한 자리 Z' 하나뿐이다.
 * 씬의 레이아웃이 그 형태로 짜여 있다(자릿수가 늘면 글자가 작아져 세로 화면에서 안 읽힌다).
 */
import { readFileSync } from 'node:fs';

const BANK = JSON.parse(readFileSync('src/lib/data/matchstick-problems.json', 'utf-8'));

/** 숫자 0~9가 켜는 마디. MatchstickBoard.svelte와 같은 순서다. */
const DIGIT_SEGS = [
	'abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'
];

const bare = (e) => e.replace(/ /g, '');

/** 식을 (자리, 마디) 집합으로 편다. 연산자 h·v와 등호 e1·e2도 마디로 센다. */
function segset(expr) {
	const out = new Set();
	[...bare(expr)].forEach((ch, i) => {
		if (/\d/.test(ch)) for (const g of DIGIT_SEGS[+ch]) out.add(`${i},${g}`);
		else if (ch === '+') out.add(`${i},h`), out.add(`${i},v`);
		else if (ch === '-') out.add(`${i},h`);
		else if (ch === '=') out.add(`${i},e1`), out.add(`${i},e2`);
	});
	return out;
}

/** 옮기는 성냥 하나를 찾는다. 아니면 null. */
function move(p) {
	const a = segset(p.displayed);
	const b = segset(p.solution);
	const gone = [...a].filter((x) => !b.has(x));
	const born = [...b].filter((x) => !a.has(x));
	if (gone.length !== 1 || born.length !== 1) return null;
	const parse = (s) => {
		const [slot, seg] = s.split(',');
		return [Number(slot), seg];
	};
	return { from: parse(gone[0]), to: parse(born[0]) };
}

/** 쇼츠 레이아웃에 들어가는 모양인가 — 한 자리 세 개 */
const fits = (p) => /^\d[+-]\d=\d$/.test(bare(p.displayed)) && /^\d[+-]\d=\d$/.test(bare(p.solution));

if (process.argv[2] === '--scan') {
	const rows = [];
	BANK.forEach((p, i) => {
		if (!fits(p)) return;
		const m = move(p);
		if (!m) return;
		const before = bare(p.displayed);
		const after = bare(p.solution);
		// 숫자 둘이 함께 바뀌는 것이 화면에서 제일 놀랍다
		const changed = [...before].filter((c, k) => c !== after[k]).length;
		rows.push({ i, before: p.displayed, after: p.solution, changed, opKept: before[1] === after[1] });
	});
	rows.sort((a, b) => b.changed - a.changed || a.i - b.i);
	console.log(`쇼츠에 쓸 수 있는 문제 ${rows.length}개 — 바뀌는 글자가 많은 순\n`);
	for (const r of rows.slice(0, 30)) {
		console.log(
			`  #${String(r.i).padStart(3)}  ${r.before}  →  ${r.after}   글자 ${r.changed}개 변화${r.opKept ? '' : ' · 연산자도 바뀜'}`
		);
	}
	console.log(`\n  (전체 ${rows.length}개. 번호를 주면 블록을 만들어 준다)`);
	process.exit(0);
}

const idx = Number(process.argv[2] ?? 84);
const p = BANK[idx];
if (!p) {
	console.error(`${idx}번 문제가 없다 (0~${BANK.length - 1})`);
	process.exit(1);
}
if (!fits(p)) {
	console.error(`쇼츠 레이아웃에 안 맞는다: ${p.displayed} → ${p.solution}`);
	console.error("한 자리 X (+|-) 한 자리 Y = 한 자리 Z 만 된다.");
	process.exit(1);
}
const m = move(p);
if (!m) {
	console.error(`성냥 하나만 옮기는 문제가 아니다: ${p.displayed} → ${p.solution}`);
	process.exit(1);
}

const NAME = { a: '윗획', b: '오른위', c: '오른아래', d: '아랫획', e: '왼아래', f: '왼위', g: '가운데', h: '가로획', v: '세로획' };
/** 받침을 보고 을/를을 고른다 — '윗획를'처럼 굳으면 매번 어색해진다 */
const particle = (w) => {
	const last = w.charCodeAt(w.length - 1);
	return last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0 ? '을' : '를';
};
const where = ([slot, seg]) => {
	const n = NAME[seg] ?? seg;
	return `${bare(p.displayed)[slot]}의 ${n}${particle(n)}`;
};

console.log(`/* ── 문제: matchstick-problems.json #${idx} (dump-matchstick.mjs로 재생성) ── */`);
console.log('const 문제 = {');
console.log(`\tdisplayed: '${p.displayed}',`);
console.log(`\tsolution: '${p.solution}',`);
console.log(`\tfrom: [${m.from[0]}, '${m.from[1]}'], // ${where(m.from)} 집어`);
console.log(`\tto: [${m.to[0]}, '${m.to[1]}']    // ${bare(p.solution)[m.to[0]]} 자리로 옮긴다`);
console.log('};');
