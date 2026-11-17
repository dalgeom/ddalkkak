// 가로세로 낱말퍼즐 생성기(2026-11-17) — 끝말잇기 사전(static/kkeut)의 쉬운 말로 5×5 판을 채운다.
//
//   npx vite-node scripts/crossword-build.mjs -- --cand 10 [--seed 7]   → 후보 판 + 낱말별 뜻풀이 초안
//   npx vite-node scripts/crossword-build.mjs -- --check                → crosswordPuzzles.ts 전체 검사(걸리면 exit 1)
//
// 후보는 초안이다. 열쇠는 사람이 손질한다 — 답이 문장에 없게, 쉬운 말로, 안 엇갈리는 칸이 있는 낱말은 열쇠만으로 하나로 좁혀지게.
import { readFileSync } from 'node:fs';
import { parseGrid, checkPuzzle, BLACK } from '../src/lib/crossword.ts';
import { CROSSWORD_PUZZLES, CROSSWORD_FIRST_DAY, dateOf } from '../src/lib/data/crosswordPuzzles.ts';

const ROOT = new URL('../', import.meta.url);
const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (k) => {
	const i = args.indexOf(k);
	return i >= 0 ? args[i + 1] : undefined;
};
const dict = JSON.parse(readFileSync(new URL('static/kkeut/words.json', ROOT), 'utf8'));
const all = new Set(dict.words);
const cho = (w) => Math.floor((w.charCodeAt(0) - 0xac00) / 588);
const defCache = {};
const defOf = (w) => (defCache[cho(w)] ??= JSON.parse(readFileSync(new URL(`static/kkeut/defs/${cho(w)}.json`, ROOT), 'utf8')))[w] ?? '';

if (args.includes('--check')) {
	let bad = 0;
	CROSSWORD_PUZZLES.forEach((p, i) => {
		const why = checkPuzzle(p, (w) => all.has(w));
		if (p.date !== dateOf(CROSSWORD_FIRST_DAY + i)) why.push(`날짜 순서: ${p.date} (기대 ${dateOf(CROSSWORD_FIRST_DAY + i)})`);
		if (why.length) {
			bad++;
			console.log(`✗ ${p.date}\n  ${why.join('\n  ')}`);
		}
	});
	console.log(`${CROSSWORD_PUZZLES.length}판 중 ${CROSSWORD_PUZZLES.length - bad}판 통과`);
	process.exit(bad ? 1 : 0);
}

const N = Number(opt('--cand'));
if (!N) {
	console.error('사용법: npx vite-node scripts/crossword-build.mjs -- --cand <수> [--seed <수>] | --check');
	process.exit(1);
}
const used = new Set(CROSSWORD_PUZZLES.flatMap((p) => parseGrid(p.rows).words.map((w) => w.answer)));
const pool = dict.easy.filter((w) => /^[가-힣]{2,5}$/.test(w) && !used.has(w) && defOf(w) && !defOf(w).includes(w));
const byLen = {};
for (const w of pool) (byLen[w.length] ??= []).push(w);

let seed = Number(opt('--seed') ?? 7) >>> 0;
// mulberry32 — 곱셈을 Math.imul로 해야 2^53을 넘지 않는다(그냥 곱하면 정밀도가 깨져 짧게 맴돈다)
const rnd = () => {
	seed = (seed + 0x6d2b79f5) >>> 0;
	let t = seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function fill(words) {
	const cell = Array(25).fill(null);
	const usedHere = new Set();
	let nodes = 0;
	const t0 = Date.now();
	const rec = (left) => {
		if (!left.length) return true;
		if (++nodes > 200000 || Date.now() - t0 > 2000) return false;
		let best = -1, bc = null;
		for (let k = 0; k < left.length; k++) {
			const sl = left[k];
			const c = (byLen[sl.length] || []).filter((x) => !usedHere.has(x) && sl.every((p, i) => cell[p] === null || cell[p] === x[i]));
			if (!bc || c.length < bc.length) {
				best = k;
				bc = c;
				if (!c.length) return false;
			}
		}
		const sl = left[best];
		const rest = left.filter((_, k) => k !== best);
		bc.sort(() => rnd() - 0.5);
		for (const x of bc.slice(0, 60)) {
			const prev = sl.map((p) => cell[p]);
			sl.forEach((p, i) => (cell[p] = x[i]));
			usedHere.add(x);
			if (rec(rest)) return true;
			usedHere.delete(x);
			sl.forEach((p, i) => (cell[p] = prev[i]));
		}
		return false;
	};
	return rec(words) ? cell : null;
}

let made = 0, tried = 0;
while (made < N && tried < 5000) {
	tried++;
	const black = Array(25).fill(false);
	const nb = 5 + Math.floor(rnd() * 4);
	for (let k = 0; k < nb; k++) black[Math.floor(rnd() * 25)] = true;
	const shape = Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (black[r * 5 + c] ? BLACK : '가')).join(''));
	const g = parseGrid(shape);
	if (g.words.length < 6) continue;
	// 모양 검사는 같은 규칙으로(낱말에 안 속한 칸 · 섬) — 열쇠 · 중복 검사는 아직 의미 없으니 뺀다
	const shapeWhy = checkPuzzle({ rows: shape, clues: {} }).filter((w) => w.startsWith('낱말에') || w.startsWith('떨어진'));
	if (shapeWhy.length) continue;
	const cell = fill(g.words.map((w) => w.cells));
	if (!cell) continue;
	made++;
	const rows = Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => cell[r * 5 + c] ?? BLACK).join(''));
	const gg = parseGrid(rows);
	const cnt = Array(25).fill(0);
	gg.words.forEach((w) => w.cells.forEach((i) => cnt[i]++));
	const lone = gg.words.filter((w) => w.cells.some((i) => cnt[i] === 1)).map((w) => w.answer);
	console.log(`\n── 후보 ${made} (낱말 ${gg.words.length}, 안 엇갈리는 칸이 있는 낱말 ${lone.length})`);
	console.log(rows.map((r) => '   ' + r).join('\n'));
	console.log(`\trows: [${rows.map((r) => `'${r}'`).join(', ')}],`);
	console.log('\tclues: {');
	for (const w of gg.words) console.log(`\t\t${w.answer}: '${defOf(w.answer).replace(/'/g, "\\'")}',${lone.includes(w.answer) ? ' // 열쇠만으로 좁혀져야' : ''}`);
	console.log('\t}');
}
console.log(`\n모양 ${tried}개 시도, 후보 ${made}개`);
