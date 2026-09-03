/**
 * 발견형 문제의 「규칙 유일성」을 기계로 공격한다.
 *
 *   npx vite-node scripts/rule-attack.mjs            전부
 *   npx vite-node scripts/rule-attack.mjs 이상한 연산  칩 하나만
 *
 * 왜 만들었나 — /about과 /read/what-is-discover가 「발견형은 전부 대안 규칙을
 * 코드로 만들어 깨지는지 확인한 뒤에 나갑니다」라고 공언하는데, 그 코드가 레포에
 * 없었다. puzzle-reviewer는 2026-08-27에 생겼고 그 시점 은행에 있던 330개는
 * 유일성 공격을 한 번도 받지 않았다. 8일 사이에 사용자 지적 3건 + 자체 검산 4건이
 * 터졌고 전부 그 330개 안에 있었다.
 *
 * 하는 일: 예시 줄을 전부 만족하는 규칙을 라이브러리에서 모아, 그것들이 물음표에
 * 내놓는 답이 몇 종류인지 센다. 두 종류 이상이면 규칙이 안 조여진 것이다.
 *
 * 한계를 분명히 해 둔다 — 이건 「깨끗함의 증명」이 아니라 「반례 찾기」다.
 * 라이브러리에 없는 규칙은 못 찾는다. 통과했다고 유일한 것이 아니다.
 */
import { PROBLEMS } from '../src/lib/problems.ts';

/* ── 도우미 ── */
const digits = (n) => String(Math.abs(n)).split('').map(Number);
const dsum = (n) => digits(n).reduce((a, b) => a + b, 0);
const droot = (n) => (n === 0 ? 0 : 1 + ((Math.abs(n) - 1) % 9));
const rev = (n) => Number(String(Math.abs(n)).split('').reverse().join('')) * Math.sign(n || 1);
const isPal = (n) => String(Math.abs(n)) === String(Math.abs(n)).split('').reverse().join('');
const isPrime = (n) => {
	if (n < 2) return false;
	for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
	return true;
};
const carries = (a, b) => {
	let c = 0, k = 0;
	const A = digits(a).reverse(), B = digits(b).reverse();
	for (let i = 0; i < Math.max(A.length, B.length); i++) {
		const s = (A[i] ?? 0) + (B[i] ?? 0) + k;
		if (s >= 10) { c++; k = 1; } else k = 0;
	}
	return c;
};
const digitwiseNoCarry = (a, b) => {
	const A = digits(a).reverse(), B = digits(b).reverse();
	let out = '';
	for (let i = Math.max(A.length, B.length) - 1; i >= 0; i--) out += String((A[i] ?? 0) + (B[i] ?? 0));
	return Number(out);
};
const countBetween = (a, b, pred) => {
	let n = 0;
	for (let i = Math.min(a, b) + 1; i < Math.max(a, b); i++) if (pred(i)) n++;
	return n;
};

/* ── 단항 마무리 ── */
const UNARY = [
	['그대로', (x) => x],
	['자릿수 뒤집기', rev],
	['자릿수 합', dsum],
	['디지털 루트', droot],
	['절댓값', Math.abs],
	['+1', (x) => x + 1],
	['-1', (x) => x - 1],
	['×2', (x) => x * 2],
];

/* ── 이항 뼈대 ── */
const CORE = [
	['a+b', (a, b) => a + b],
	['a-b', (a, b) => a - b],
	['b-a', (a, b) => b - a],
	['|a-b|', (a, b) => Math.abs(a - b)],
	['a×b', (a, b) => a * b],
	['a×b-a-b', (a, b) => a * b - a - b],
	['a+b+ab', (a, b) => a + b + a * b],
	['a²-b²', (a, b) => a * a - b * b],
	['|a²-b²|', (a, b) => Math.abs(a * a - b * b)],
	['a²+b²', (a, b) => a * a + b * b],
	['몫×10+나머지', (a, b) => (b ? Math.floor(a / b) * 10 + (a % b) : NaN)],
	['몫+나머지', (a, b) => (b ? Math.floor(a / b) + (a % b) : NaN)],
	['이어붙이기', (a, b) => Number(`${a}${b}`)],
	['자리별 덧셈(올림 없음)', digitwiseNoCarry],
	['올림 횟수', carries],
	['사이 정수 개수', (a, b) => Math.max(0, Math.abs(a - b) - 1)],
	['사이 제곱수 개수', (a, b) => countBetween(a, b, (i) => Number.isInteger(Math.sqrt(i)))],
	['사이 소수 개수', (a, b) => countBetween(a, b, isPrime)],
	['사이 짝수 개수', (a, b) => countBetween(a, b, (i) => i % 2 === 0)],
	['(a+b) mod 12', (a, b) => (a + b) % 12],
	['(a+b) mod 10', (a, b) => (a + b) % 10],
	['(a+b) mod 24', (a, b) => (a + b) % 24],
	['100에서 남은 거리', (a, b) => Math.abs(100 - a - b)],
	['a와 b 자릿수합의 차', (a, b) => Math.abs(dsum(a) - dsum(b))],
	['자릿수합끼리 더함', (a, b) => dsum(a) + dsum(b)],
];

/* ── 갈림 조건 ── */
const COND = [
	['a가 홀수', (a) => a % 2 === 1],
	['a가 짝수', (a) => a % 2 === 0],
	['a가 대칭수', (a) => isPal(a)],
	['a가 소수', (a) => isPrime(a)],
	['a > b', (a, b) => a > b],
	['a < b', (a, b) => a < b],
	['a ≥ b', (a, b) => a >= b],
	['a+b가 짝수', (a, b) => (a + b) % 2 === 0],
	['a가 두 자리', (a) => String(Math.abs(a)).length >= 2],
	['a가 b의 배수', (a, b) => b !== 0 && a % b === 0],
];

/**
 * 규칙 목록. 조건 갈림형은 「어느 가지를 탔는지」를 같이 들고 다닌다 —
 * 예시가 한쪽 가지만 밟았다면 나머지 가지는 예시가 전혀 제약하지 못하므로
 * 그런 대안은 사람이 세울 가설이 아니다(퇴화). 그걸 걸러야 신호가 보인다.
 */
function* rules() {
	for (const [un, u] of UNARY)
		for (const [cn, c] of CORE) {
			const name = un === '그대로' ? cn : `${cn} → ${un}`;
			yield { name, f: (a, b) => u(c(a, b)), 단순: true, cond: null };
		}
	for (const [dn, d] of COND)
		for (const [n1, f1] of CORE)
			for (const [n2, f2] of CORE) {
				if (n1 === n2) continue;
				yield {
					name: `${dn}이면 ${n1}, 아니면 ${n2}`,
					f: (a, b) => (d(a, b) ? f1(a, b) : f2(a, b)),
					단순: false,
					cond: d
				};
			}
}
const RULES = [...rules()];

/* ── 문제에서 예시 줄을 뽑는다 ── */
const strip = (h) => String(h).replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
const textOf = (p) => p.blocks.map((b) => (b.kind === 'pre' ? b.text : strip(b.html ?? ''))).join('\n');

/** `A ⊗ B = C` / `A ⊗ B = ?` 줄을 긁는다. 기호가 무엇이든 상관없다. */
function parseOp(txt) {
	const rows = [], q = [];
	for (const line of txt.split('\n')) {
		const m = line.match(/(-?\d+)\s*[^\d\s=]{1,3}\s*(-?\d+)\s*=\s*(-?\d+|\?)/);
		if (!m) continue;
		const [, a, b, c] = m;
		if (c === '?') q.push([+a, +b]);
		else rows.push([+a, +b, +c]);
	}
	return { rows, q };
}

/* ── 돌린다 ── */

/**
 * 자명한 연산. 「이상한 연산」이라고 내놓은 문제인데 이것 하나로 예시와 답이
 * 전부 설명되면, 그 문제가 주장하는 「발견」이 존재하지 않는 것이다.
 * (num-place-add가 그랬다 — 해설은 「올림이 없다는 게 드러난다」는데 네 줄이
 *  전부 그냥 덧셈이라 드러날 것이 없었다.)
 */
const 자명 = new Set(['a+b', 'a-b', 'b-a', '|a-b|', 'a×b']);

const only = process.argv.slice(2).join(' ').trim();
const targets = PROBLEMS.filter((p) => p.chip === '이상한 연산' && (!only || p.chip === only));
const 갈림 = [], 자명함 = [], 불가 = [];
let 안전 = 0;

for (const p of targets) {
	const { rows, q } = parseOp(textOf(p));
	if (rows.length < 3 || q.length !== 1) { 불가.push([p.id, `줄을 못 읽었다(예시 ${rows.length})`]); continue; }
	const 공식 = Number(p.answers?.[0]);
	const fit = [];
	for (const r of RULES) {
		let ok = true;
		for (const [a, b, c] of rows) {
			let v;
			try { v = r.f(a, b); } catch { ok = false; break; }
			if (!Number.isFinite(v) || v !== c) { ok = false; break; }
		}
		if (!ok) continue;
		if (r.cond) {
			const t = rows.filter(([a, b]) => r.cond(a, b)).length;
			if (t === 0 || t === rows.length) continue; // 퇴화 — 예시가 한쪽 가지만 밟는다
		}
		const v = r.f(...q[0]);
		if (!Number.isFinite(v)) continue;
		// 예시 답이 전부 0 이상인데 음수를 내놓는 대안은 사람이 세울 가설이 아니다
		if (v < 0 && rows.every(([, , c]) => c >= 0)) continue;
		fit.push({ ...r, v });
	}
	if (!fit.length) { 불가.push([p.id, `맞는 규칙을 못 찾음(공식답 ${공식})`]); continue; }
	// 공식답을 내는 규칙이 하나도 없으면 라이브러리가 진짜 규칙을 모르는 것이다 — 결함 판정 불가
	if (!fit.some((r) => r.v === 공식)) {
		불가.push([p.id, `공식답 ${공식}을 내는 규칙이 라이브러리에 없다 — 진짜 규칙을 모른다`]);
		continue;
	}
	const 다른 = fit.filter((r) => r.v !== 공식);
	if (다른.length) { 갈림.push([p, 공식, 다른]); continue; }
	const 자 = fit.find((r) => 자명.has(r.name));
	if (자) 자명함.push([p, 자, 공식]);
	else 안전++;
}

if (갈림.length) {
	console.log(`\n████ 답이 갈린다 — ${갈림.length}건\n`);
	for (const [p, 공식, 다른] of 갈림) {
		console.log(`  ✗ ${p.id}   공식답 ${공식}`);
		const seen = new Set();
		for (const r of 다른) {
			if (seen.has(r.v)) continue;
			seen.add(r.v);
			console.log(`       ${String(r.v).padEnd(7)} ← ${r.name}`);
		}
		console.log('');
	}
}
if (자명함.length) {
	console.log(`████ 「이상한 연산」인데 자명한 연산이다 — ${자명함.length}건\n`);
	for (const [p, r, 공식] of 자명함)
		console.log(`  ! ${p.id}   「${r.name}」 하나로 예시와 답(${공식})이 전부 설명된다`);
	console.log('');
}
if (불가.length) {
	console.log(`──── 판단 불가 ${불가.length}건 (라이브러리 한계, 결함이라는 뜻이 아니다)\n`);
	for (const [id, why] of 불가) console.log(`  · ${id} — ${why}`);
}
console.log(`\n── 이상한 연산 ${targets.length}개 — 갈림 ${갈림.length} · 자명 ${자명함.length} · 반례 없음 ${안전} · 판단 불가 ${불가.length}`);
console.log(`   규칙 ${RULES.length}종. 퇴화 조건형과 「공식답을 못 내는 라이브러리」는 뺐다.`);
console.log(`   「반례 없음」은 유일성의 증명이 아니라 이 라이브러리로 못 깼다는 뜻이다.`);


/* ═══════════ 수열·사슬 ═══════════ */

/** `1 4 9 16 ?` 또는 `77 → 49 → 36 → ?` 에서 수열을 뽑는다 */
function parseSeq(txt) {
	for (const line of txt.split('\n')) {
		const toks = line.split(/[\s,→]+/).map((t) => t.trim()).filter(Boolean);
		if (toks.length < 4) continue;
		if (!toks.every((t) => /^-?\d+$/.test(t) || t === '?')) continue;
		const qi = toks.indexOf('?');
		if (qi === -1 || toks.filter((t) => t === '?').length !== 1) continue;
		return { nums: toks.map((t) => (t === '?' ? null : Number(t))), qi };
	}
	return null;
}

/** 앞 항들로 다음 항을 내는 규칙들 */
const SEQ = [
	['등차', (a) => a.at(-1) + (a.at(-1) - a.at(-2))],
	['등비', (a) => (a.at(-2) ? a.at(-1) * (a.at(-1) / a.at(-2)) : NaN)],
	['계차의 등차', (a) => { const d = a.at(-1) - a.at(-2), e = a.at(-2) - a.at(-3); return a.at(-1) + d + (d - e); }],
	['앞 둘의 합', (a) => a.at(-1) + a.at(-2)],
	['앞 둘의 차', (a) => Math.abs(a.at(-1) - a.at(-2))],
	['앞 둘의 곱', (a) => a.at(-1) * a.at(-2)],
	['n²', (a) => (a.length + 1) ** 2],
	['n²+n', (a) => (a.length + 1) ** 2 + a.length + 1],
	['n³', (a) => (a.length + 1) ** 3],
	['×n', (a) => a.at(-1) * (a.length + 1)],
	['자릿수 곱', (a) => digits(a.at(-1)).reduce((x, y) => x * y, 1)],
	['자릿수 합', (a) => dsum(a.at(-1))],
	['자릿수 제곱합', (a) => digits(a.at(-1)).reduce((x, y) => x + y * y, 0)],
	['앞항 뒤집기', (a) => rev(a.at(-1))],
	['앞항×2', (a) => a.at(-1) * 2],
	['앞항÷2', (a) => a.at(-1) / 2],
	['다항식 보간', (a) => {
		// 라그랑주: n=1..k에 a를 맞추고 k+1을 낸다. 어떤 유한 수열에도 맞으므로
		// 이것 하나만 fit하면 「규칙이 없다」는 뜻이고, 다른 규칙과 답이 갈리면 무시한다.
		const k = a.length, x = k + 1;
		let s = 0;
		for (let i = 0; i < k; i++) {
			let t = a[i];
			for (let j = 0; j < k; j++) if (j !== i) t = (t * (x - (j + 1))) / (i - j);
			s += t;
		}
		return Math.round(s * 1e6) / 1e6;
	}]
];

const seqTargets = PROBLEMS.filter((p) => ['수열', '사슬'].includes(p.chip));
const 수열갈림 = [], 수열불가 = [];
let 수열안전 = 0;
for (const p of seqTargets) {
	const parsed = parseSeq(textOf(p));
	if (!parsed || parsed.qi !== parsed.nums.length - 1) { 수열불가.push([p.id, '끝에 물음표가 있는 수열 줄을 못 읽었다']); continue; }
	const known = parsed.nums.slice(0, -1);
	if (known.length < 3) { 수열불가.push([p.id, `항이 ${known.length}개뿐`]); continue; }
	const 공식 = Number(p.answers?.[0]);
	const fit = [];
	for (const [name, f] of SEQ) {
		if (name === '다항식 보간') continue; // 항상 맞으므로 경쟁 가설로 안 센다
		let ok = true;
		for (let i = 3; i < known.length; i++) {
			let v; try { v = f(known.slice(0, i)); } catch { ok = false; break; }
			if (!Number.isFinite(v) || v !== known[i]) { ok = false; break; }
		}
		if (!ok) continue;
		let v; try { v = f(known); } catch { continue; }
		if (Number.isFinite(v)) fit.push([name, v]);
	}
	if (!fit.length) { 수열불가.push([p.id, `맞는 규칙을 못 찾음(공식답 ${공식})`]); continue; }
	if (!fit.some(([, v]) => v === 공식)) { 수열불가.push([p.id, `공식답 ${공식}을 내는 규칙이 없다 — 진짜 규칙을 모른다`]); continue; }
	const 다른 = fit.filter(([, v]) => v !== 공식);
	if (다른.length) 수열갈림.push([p, 공식, 다른]);
	else 수열안전++;
}

console.log(`\n\n═══════════ 수열·사슬 ${seqTargets.length}개 ═══════════`);
if (수열갈림.length) {
	console.log(`\n████ 답이 갈린다 — ${수열갈림.length}건\n`);
	for (const [p, 공식, 다른] of 수열갈림) {
		console.log(`  ✗ ${p.id}   공식답 ${공식}`);
		const seen = new Set();
		for (const [n, v] of 다른) { if (seen.has(v)) continue; seen.add(v); console.log(`       ${String(v).padEnd(7)} ← ${n}`); }
	}
}
console.log(`\n── 갈림 ${수열갈림.length} · 반례 없음 ${수열안전} · 판단 불가 ${수열불가.length}`);
for (const [id, why] of 수열불가) console.log(`  · ${id} — ${why}`);


/* ═══════════ 숫자 클럽 ═══════════ */

const PRED = [
	['3의 배수', (n) => n % 3 === 0],
	['짝수', (n) => n % 2 === 0],
	['홀수', (n) => n % 2 === 1],
	['제곱수', (n) => Number.isInteger(Math.sqrt(n))],
	['소수', isPrime],
	['2의 거듭제곱', (n) => n > 0 && (n & (n - 1)) === 0],
	['삼각수', (n) => Number.isInteger((Math.sqrt(8 * n + 1) - 1) / 2)],
	['자릿수합이 3의 배수', (n) => dsum(n) % 3 === 0],
	['자릿수합이 짝수', (n) => dsum(n) % 2 === 0],
	['자릿수합이 9의 배수', (n) => dsum(n) % 9 === 0],
	['대칭수', isPal],
	['두 자리', (n) => String(n).length === 2],
	['세 자리', (n) => String(n).length === 3],
	['연속 자연수 합으로 표현 가능', (n) => n > 0 && (n & (n - 1)) !== 0],
	['약수 개수가 홀수', (n) => { let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return c % 2 === 1; }],
	['자릿수가 증가한다', (n) => digits(n).every((d, i, a) => i === 0 || d > a[i - 1])],
	['자릿수가 연속이다', (n) => digits(n).every((d, i, a) => i === 0 || d === a[i - 1] + 1)],
	['자릿수에 0이 없다', (n) => !digits(n).includes(0)],
	['5의 배수', (n) => n % 5 === 0],
	['4의 배수', (n) => n % 4 === 0],
	['자릿수 합이 10 이상', (n) => dsum(n) >= 10],
	['10으로 나눈 나머지가 짝수', (n) => (n % 10) % 2 === 0]
];

const clubTargets = PROBLEMS.filter((p) => p.chip === '클럽');
const 클럽갈림 = [], 클럽불가 = [];
let 클럽안전 = 0;
for (const p of clubTargets) {
	const txt = textOf(p);
	const grab = (k) => txt.match(new RegExp(k + '[^:：]*[:：]\s*(.+)'))?.[1] ?? '';
	const nums = (s) => s.split(/[,、]/).map((x) => x.trim()).filter(Boolean);
	const M = nums(grab('회원')), R = nums(grab('거절'));
	const candLine = txt.split('\n').find((l) => /①/.test(l)) ?? '';
	const C = [...candLine.matchAll(/[①②③④⑤]\s*([^\s①②③④⑤]+)/g)].map((m) => m[1]);
	if (![...M, ...R, ...C].length || ![...M, ...R, ...C].every((x) => /^-?\d+$/.test(x))) continue; // 낱말형은 기계 몫이 아니다
	const m = M.map(Number), r = R.map(Number), c = C.map(Number);
	const 공식 = new Set((p.answers?.[0] ?? '').split(/[,\s]+/).filter(Boolean).map(Number));
	const fit = [];
	for (const [name, f] of PRED) {
		if (!m.every(f) || r.some(f)) continue;
		fit.push([name, new Set(c.filter(f))]);
	}
	const key = (s) => [...s].sort((a, b) => a - b).join(',');
	if (!fit.length) { 클럽불가.push([p.id, `회원/거절을 가르는 성질을 못 찾음`]); continue; }
	if (!fit.some(([, s]) => key(s) === key(공식))) { 클럽불가.push([p.id, `공식답(${key(공식)})을 내는 성질이 없다 — 진짜 규칙을 모른다`]); continue; }
	const 다른 = fit.filter(([, s]) => key(s) !== key(공식));
	if (다른.length) 클럽갈림.push([p, key(공식), 다른, key]);
	else 클럽안전++;
}

const 숫자클럽 = 클럽갈림.length + 클럽불가.length + 클럽안전;
console.log(`\n\n═══════════ 클럽 — 숫자형 ${숫자클럽}개 (낱말형 ${clubTargets.length - 숫자클럽}개는 사전 지식이 필요해 기계 몫이 아니다) ═══════════`);
if (클럽갈림.length) {
	console.log(`\n████ 다른 성질도 회원/거절을 가르는데 뽑히는 후보가 다르다 — ${클럽갈림.length}건\n`);
	for (const [p, 공식, 다른, key] of 클럽갈림) {
		console.log(`  ✗ ${p.id}   공식답 {${공식}}`);
		for (const [n, s] of 다른) console.log(`       {${key(s)}} ← ${n}`);
	}
}
console.log(`\n── 갈림 ${클럽갈림.length} · 반례 없음 ${클럽안전} · 판단 불가 ${클럽불가.length}`);
for (const [id, why] of 클럽불가) console.log(`  · ${id} — ${why}`);
