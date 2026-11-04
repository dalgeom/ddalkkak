// 끝말잇기 사전 굽기(2026-11-03) — 한국어기초사전(국립국어원) 전체 내려받기 JSON에서 받는 말 · 쉬운 말 · 뜻풀이를 뽑는다.
// 원본(풀면 969MB)은 저장소 밖에 둔다. 커밋하지 않는다.
//
//   npx vite-node scripts/kkeut-build.mjs -- E:/tmp/krdict-dl/x    → static/kkeut/ · src/lib/data/kkeutMeta.ts
//   npx vite-node scripts/kkeut-build.mjs -- --cand 2              → 2수 퍼즐 후보(쉬운 시작 단어 · 이기는 첫 수 · 뜻)
//   npx vite-node scripts/kkeut-build.mjs -- --check               → kkeutPuzzles.ts를 다시 쓰기 금지까지 넣어 검증
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { makeDict, charTable, movesFrom, last, winsWith, bestMoves, startsFor, puzzleMoves } from '../src/lib/kkeut.ts';
import { KKEUT_PUZZLES } from '../src/lib/data/kkeutPuzzles.ts';

const VERSION = '2026-10-19';
const ROOT = new URL('../', import.meta.url);
const at = (p) => new URL(p, ROOT);
const USAGE = '사용법: npx vite-node scripts/kkeut-build.mjs -- <원본 폴더> | --cand <수> | --check';
const args = process.argv.slice(2).filter((a) => a !== '--');
const feats = (f) => Object.fromEntries((Array.isArray(f) ? f : f ? [f] : []).map((x) => [x.att, x.val]));
const cho = (c) => Math.floor((c.charCodeAt(0) - 0xac00) / 588);
const fail = (msg) => {
	console.error(msg);
	process.exit(1);
};

function load() {
	const j = JSON.parse(readFileSync(at('static/kkeut/words.json'), 'utf8'));
	return makeDict(j.words, j.easy);
}
function defsOf(words) {
	const out = {};
	for (const w of words) out[w] = JSON.parse(readFileSync(at(`static/kkeut/defs/${cho(w)}.json`), 'utf8'))[w] ?? '';
	return out;
}
/** 퍼즐 하나의 형식 · 사전 · 이어짐 · 요일 수 검사. 어긋난 이유 목록(빈 배열 = 통과) */
function problems(d, p, prevDay) {
	const why = [];
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.date);
	const day = m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN;
	if (Number.isNaN(day)) why.push('날짜 형식');
	else if (new Date(day * 86400000).toISOString().slice(0, 10) !== p.date) why.push(`없는 날짜: ${p.date}`);
	else if (prevDay !== null && day <= prevDay) why.push('날짜 순서 · 중복');
	if (p.line.length % 2 !== 1) why.push(`line 길이 ${p.line.length}(홀수여야)`);
	const n = (p.line.length + 1) / 2;
	if (!Number.isNaN(day) && Number.isInteger(n) && puzzleMoves(day) !== n) why.push(`요일 수 ${puzzleMoves(day)}인데 ${n}수`);
	const all = [p.start, ...p.line];
	for (const w of all) if (w !== w.normalize('NFC')) why.push(`NFC 아님: ${w.normalize('NFC')}`);
	for (const w of all) if (!d.has.has(w)) why.push(`사전에 없음: ${w}`);
	if (!d.easy.has(p.start)) why.push(`시작 단어가 쉬운 말 아님: ${p.start}`);
	if (new Set(all).size !== all.length) why.push('같은 말 두 번');
	for (let i = 1; i < all.length; i++)
		if (!startsFor(last(all[i - 1])).includes(all[i][0])) why.push(`안 이어짐: ${all[i - 1]} → ${all[i]}`);
	if (movesFrom(d, last(all[all.length - 1]), new Set(all)).length > 0) why.push(`마지막 말 ${all[all.length - 1]} 뒤에 이을 말이 있음`);
	return { why, day, n };
}

if (args[0] === '--cand') {
	const n = Number(args[1]);
	if (args[1] === undefined || !Number.isInteger(n) || n < 1) fail(USAGE);
	const d = load();
	const t = charTable(d);
	const rows = [];
	for (const s of d.words) {
		if (!d.easy.has(s) || t.win.get(last(s)) !== n) continue;
		const wins = movesFrom(d, last(s), new Set([s])).filter((w) => t.lose.get(last(w)) === n - 1);
		rows.push({ s, wins });
	}
	rows.sort((a, b) => a.wins.length - b.wins.length);
	for (const r of rows.slice(0, 80)) {
		const df = defsOf([r.s, ...r.wins.slice(0, 3)]);
		console.log(`${r.s}(${df[r.s].slice(0, 30)}) → 이기는 첫 수 ${r.wins.length}개: ${r.wins.slice(0, 3).map((w) => `${w}(${df[w].slice(0, 24)})`).join(' · ')}`);
	}
	console.log(`후보 ${rows.length}개 중 이기는 첫 수가 적은 80개`);
} else if (args[0] === '--check') {
	const d = load();
	const t = charTable(d);
	let bad = 0;
	let prevDay = null;
	for (const p of KKEUT_PUZZLES) {
		const { why, day, n } = problems(d, p, prevDay);
		if (!Number.isNaN(day)) prevDay = day;
		const t0 = Date.now();
		if (!why.length && !winsWith(d, p.line[0], n, new Set([p.start]), t)) why.push(`${n}수 안에 반드시 이기지 못함`);
		// 길의 컴퓨터 말은 최선 수 후보 안에 있어야 컴퓨터가 실제로 그 말을 낸다(kkeutGame.ts puzzleReply)
		for (let i = 1; !why.length && i < p.line.length; i += 2) {
			const ms = movesFrom(d, last(p.line[i - 1]), new Set([p.start, ...p.line.slice(0, i)]));
			if (!bestMoves(t, ms).includes(p.line[i])) why.push(`컴퓨터 말 ${p.line[i]}: 최선 수 후보가 아님`);
		}
		console.log(`${why.length ? '실패' : '통과'}  ${p.date} ${p.start} → ${p.line[0]} (${n}수, ${Date.now() - t0}ms)${why.length ? ' — ' + why.join(' · ') : ''}`);
		if (why.length) bad++;
	}
	console.log(`검사 ${KKEUT_PUZZLES.length}개 · 실패 ${bad}개`);
	if (bad) process.exitCode = 1;
} else {
	const dir = args[0];
	if (!dir || dir.startsWith('--')) fail(USAGE);
	const files = readdirSync(dir).filter((x) => x.endsWith('.json')).sort();
	if (files.length !== 11) fail(`원본 JSON이 ${files.length}개다(11개여야) — 아무것도 쓰지 않았다: ${dir}`);
	const rows = [];
	for (const f of files) {
		for (const e of JSON.parse(readFileSync(join(dir, f), 'utf8')).LexicalResource.Lexicon.LexicalEntry) {
			const fe = feats(e.feat);
			const L = Array.isArray(e.Lemma) ? e.Lemma[0] : e.Lemma;
			const w = feats(L.feat).writtenForm;
			const s = Array.isArray(e.Sense) ? e.Sense[0] : e.Sense;
			const df = s ? (feats(s.feat).definition ?? '') : '';
			if (fe.lexicalUnit === '단어' && fe.partOfSpeech === '명사' && /^[가-힣]{2,}$/.test(w)) rows.push({ w, lv: fe.vocabularyLevel, df });
		}
	}
	const words = [...new Set(rows.map((r) => r.w))].sort();
	if (words.length < 27000) fail(`받는 말이 ${words.length}개뿐이다(27000 이상이어야) — 아무것도 쓰지 않았다`);
	const easy = [...new Set(rows.filter((r) => r.lv === '초급' || r.lv === '중급').map((r) => r.w))].sort();
	const defs = Array.from({ length: 19 }, () => ({}));
	for (const r of rows) {
		const b = defs[cho(r.w)];
		if (!b[r.w] && r.df) b[r.w] = r.df.split(/(?<=[.。])\s/)[0].slice(0, 80);
	}
	mkdirSync(at('static/kkeut/defs'), { recursive: true });
	const meta = { source: `한국어기초사전(국립국어원) ${VERSION}판`, license: 'CC BY-SA 2.0 KR', url: 'https://krdict.korean.go.kr' };
	writeFileSync(at('static/kkeut/words.json'), JSON.stringify({ ...meta, words, easy }));
	defs.forEach((b, i) => writeFileSync(at(`static/kkeut/defs/${i}.json`), JSON.stringify(b)));
	writeFileSync(
		at('src/lib/data/kkeutMeta.ts'),
		`// scripts/kkeut-build.mjs가 만든다 — 손으로 고치지 않는다\nexport const KKEUT_WORDS = ${words.length};\nexport const KKEUT_DICT = '${VERSION}';\n`
	);
	const kb = (p) => Math.round(statSync(at(p)).size / 1024);
	console.log(`받는 말 ${words.length} · 쉬운 말 ${easy.length} · words.json ${kb('static/kkeut/words.json')}KB · 뜻 조각 가장 큰 것 ${Math.max(...defs.map((_, i) => kb(`static/kkeut/defs/${i}.json`)))}KB`);
}
