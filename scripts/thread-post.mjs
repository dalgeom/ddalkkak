/**
 * 스레드 게시 준비 — 상태를 기록에서 뽑고, 공개할 정답과 본문 골격을 찍는다.
 *
 *   node scripts/thread-post.mjs
 *   node scripts/thread-post.mjs --후보     후보 문제를 더 많이 본다
 *
 * 왜 스크립트인가: 형식을 기억에 맡기면 어긋난다. 2026-08-24에 세 가지가
 * 한꺼번에 틀렸다.
 *
 *   1. 게시-기록.md에 8/21 행이 없어서 "마지막 게시는 8/20"으로 읽었다.
 *      실제로는 8/21에 올라가 있었다 — 기록이 비면 없는 게 아니라 모르는
 *      것인데, 없는 것으로 단정했다.
 *   2. 인터넷에 널린 넌센스("정우네 어머니 셋째 이름")를 문제로 골랐다.
 *   3. 1주차(텍스트만 올리던 시기) 형식을 끌어와 문제를 본문에 또 적었다.
 *      8/06부터 문제는 카드 이미지에 들어간다.
 *
 * 그래서 이 스크립트는 답을 알려주는 게 아니라 **틀릴 수 없게** 만든다.
 * 기록의 마지막 행에 게시 URL이 없으면 멈추고 물어보라고 한다.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8').replace(/\r\n/g, '\n');
const 많이 = process.argv.includes('--후보');

/* ═══════════ 게시 기록 ═══════════ */

/** 스레드 표의 행을 날짜 순으로. 마지막 행이 "가장 최근에 올린 것"이다. */
function 게시행() {
	const md = read('promo/게시-기록.md');
	const at = md.indexOf('## 스레드');
	if (at < 0) throw new Error('게시-기록.md에서 "## 스레드" 절을 못 찾았다');
	const 절 = md.slice(at, md.indexOf('\n## ', at + 5));
	return 절
		.split('\n')
		.filter((l) => /^\|\s*20\d\d-\d\d-\d\d/.test(l))
		.map((l) => {
			const c = l.split('|').map((x) => x.trim());
			return { 날짜: c[1].slice(0, 10), 내용: c[2], 조회: c[3], 비고: c[4] ?? '' };
		});
}

/* ═══════════ 카드 정의 ═══════════ */

/** social-card.mjs의 CARDS를 날짜 → {id, chip} 으로. 여기 있는 id는 이미 쓴 것으로 본다. */
function 카드들() {
	const src = read('scripts/social-card.mjs');
	const out = {};
	for (const m of src.matchAll(/'(20\d\d-\d\d-\d\d)':\s*\{([^}]*?)\}/gs)) {
		const id = m[2].match(/id:\s*'([^']+)'/);
		const chip = m[2].match(/chip:\s*'([^']+)'/);
		out[m[1]] = { id: id?.[1] ?? '?', chip: chip?.[1] ?? '' };
	}
	return out;
}

/* ═══════════ 문제은행 ═══════════ */

const 벗기기 = (s) => s.replace(/<[^>]+>/g, '').replace(/\\n/g, ' ');

function 문제블록() {
	const src = read('src/lib/problems.ts');
	return [...src.matchAll(/\n\t\{\n\t\tid: '([^']+)',(.*?)\n\t\},/gs)].map((m) => ({
		id: m[1],
		body: m[2]
	}));
}

function 문제(id) {
	const b = 문제블록().find((x) => x.id === id);
	if (!b) return null;
	const chip = b.body.match(/chip: '([^']+)'/)?.[1] ?? '';
	const ans = b.body.match(/answers: \[([^\]]*)\]/)?.[1] ?? '';
	const exp = b.body.match(/explain:\s*\n?\s*'((?:[^'\\]|\\.)*)'/s)?.[1] ?? '';
	const 줄 = [];
	for (const t of b.body.matchAll(/html: '((?:[^'\\]|\\.)*)'/g))
		줄.push(...t[1].split('<br>').map(벗기기));
	for (const p of b.body.matchAll(/kind: 'pre',\s*\n?\s*text:\s*'((?:[^'\\]|\\.)*)'/gs))
		줄.push(...p[1].split('\\n'));
	return {
		id,
		chip,
		줄: 줄.map((l) => l.trim()).filter(Boolean),
		답: ans.replace(/'/g, '').split(',')[0].trim(),
		해설: 벗기기(exp)
	};
}

/* ═══════════ 카드에 담을 후보 ═══════════ */

/**
 * 카드는 1080x1080에 4줄 안쪽이 예쁘다. 그림이 필요한 유형(lcd·figure)은 아예 못 담는다.
 * 규칙 찾기를 앞에 세운다 — 사이트 정체성이고, 첫 줄에서 세운 가설이 다음 줄에서
 * 무너지는 구조가 댓글을 부른다.
 */
const 좋은칩 = ['수열', '사슬', '규칙', '한글', '연산', '변환', '암호', '다의어'];

function 후보(쓴id) {
	const out = [];
	for (const { id, body } of 문제블록()) {
		if (쓴id.has(id)) continue;
		const chip = body.match(/chip: '([^']+)'/)?.[1] ?? '';
		if (!좋은칩.includes(chip)) continue;
		const kinds = new Set([...body.matchAll(/kind: '(\w+)'/g)].map((m) => m[1]));
		for (const k of kinds) if (k !== 'text' && k !== 'pre') { kinds.add('X'); break; }
		if (kinds.has('X')) continue; // 그림이 필요한 문제
		const p = 문제(id);
		if (!p || !p.줄.length || p.줄.length > 5) continue;
		if (Math.max(...p.줄.map((l) => l.length)) > 30) continue;
		out.push(p);
	}
	// 칩 순서대로 모아 보여준다
	return out.sort((a, b) => 좋은칩.indexOf(a.chip) - 좋은칩.indexOf(b.chip));
}

/* ═══════════ 찍는다 ═══════════ */

const 행 = 게시행();
const 카드 = 카드들();
const 마지막 = 행[행.length - 1];
const 오늘 = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

console.log('━'.repeat(64));
console.log(`오늘(KST) ${오늘}`);
console.log(`기록상 마지막 게시  ${마지막.날짜}  ${마지막.내용}`);

const url확인 = /threads\.com|threads\.net/.test(마지막.비고);
if (!url확인) {
	console.log('');
	console.log('⚠  마지막 행에 게시 URL이 없다.');
	console.log('   기록이 비었다는 것은 "안 올렸다"가 아니라 "모른다"는 뜻이다.');
	console.log('   사용자에게 그 글을 올렸는지 먼저 물어라. 단정하지 마라.');
	console.log('   (8/24에 이걸 단정해서 공개할 정답과 카드를 둘 다 틀렸다)');
}

const 마지막카드 = 카드[마지막.날짜];
if (마지막카드) {
	const p = 문제(마지막카드.id);
	console.log('');
	console.log(`■ 오늘 본문에서 공개할 정답 — ${마지막.날짜} 카드 [${마지막카드.id}]`);
	if (p) {
		for (const l of p.줄) console.log(`    ${l}`);
		console.log(`  답: ${p.답}`);
		console.log(`  해설: ${p.해설}`);
	} else {
		console.log(`  ⚠ problems.ts에 ${마지막카드.id}가 없다 — trivia.ts인지 확인해라`);
	}
}

const 오늘카드 = 카드[오늘];
console.log('');
if (오늘카드) {
	const p = 문제(오늘카드.id);
	console.log(`■ 오늘 카드 — 이미 정의됨 [${오늘카드.id}] ${오늘카드.chip}`);
	if (p) {
		for (const l of p.줄) console.log(`    ${l}`);
		console.log(`  답: ${p.답}`);
	}
	console.log(`  만들기: node scripts/social-card.mjs ${오늘}`);
} else {
	console.log(`■ 오늘 카드 — 아직 없다. social-card.mjs의 CARDS에 '${오늘}' 추가해라.`);
}

const 쓴 = new Set(Object.values(카드).map((c) => c.id));
const 후보들 = 후보(쓴);
console.log('');
console.log(`■ 아직 안 쓴 후보 ${후보들.length}개${많이 ? '' : ' (앞 6개만 — 전체는 --후보)'}`);
for (const p of 후보들.slice(0, 많이 ? 99 : 6)) {
	console.log(`  [${p.chip}] ${p.id}  답 ${p.답}`);
	for (const l of p.줄) console.log(`      ${l}`);
}

console.log('');
console.log('━'.repeat(64));
console.log('■ 본문 형식 — 어기지 마라 (자세히는 promo/스레드-본문-형식.md)');
console.log('');
console.log('  · 문제는 카드 이미지에만. 본문에 문제를 다시 적지 않는다.');
console.log('    (promo/스레드-첫주.md는 이미지 이전 시기 원고다. 형식으로 쓰지 마라)');
console.log('  · 지난 문제 정답 공개로 글을 연다. 새 문제가 먼저 오지 않는다.');
console.log('  · 오늘 문제는 어디서 막히는지 한 줄만. 내용을 적지 않는다.');
console.log('  · 본문에 핸들을 태그하지 않는다. 개인 반응은 각 댓글의 답글로.');
console.log('  · 답글에 정답을 쓰지 않고 판정도 하지 않는다. 공개는 본문에서만.');
console.log('  · 금요일 문제 정답은 월요일 공개(주말 미게시).');
console.log('');
console.log('  골격:');
console.log('    [지난] 문제 정답입니다.');
console.log('');
console.log('    답은 「○○」 — 한 줄 해설.');
console.log('    왜 그렇게 되는지 한두 줄.');
console.log('');
console.log('    [댓글 반응 한 줄 — 핸들 없이 수만]');
console.log('');
console.log('    오늘 건 ○○입니다.');
console.log('    어디서 막히는지 한 줄.');
console.log('');
console.log('    → ddalkkak.app');
console.log('━'.repeat(64));
