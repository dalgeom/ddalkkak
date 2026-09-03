/**
 * 발견형 문제의 「규칙 유일성」을 기계로 공격한다.
 *
 * /about과 /read/what-is-discover가 「발견형은 전부 대안 규칙을 코드로 만들어
 * 깨지는지 확인한 뒤에 나갑니다」라고 공언하는데 그 코드가 없었다. puzzle-reviewer는
 * 2026-08-27에 생겼고 그 시점 은행의 발견형 330개는 유일성 공격을 한 번도 받지
 * 않았다. 8일 사이 사용자 지적 3건 + 자체 검산 4건이 터졌고 전부 그 안에 있었다.
 *
 * 하는 일: 예시를 전부 만족하는 규칙을 라이브러리에서 모으고, 그것들이 물음표에
 * 내놓는 답이 갈리는지 본다. 갈리면 규칙이 안 조여진 것이다.
 *
 * **이건 깨끗함의 증명이 아니라 반례 찾기다.** 라이브러리에 없는 규칙은 못 찾는다.
 * `ok`는 유일하다는 뜻이 아니라 이 라이브러리로 못 깼다는 뜻이다.
 *
 * 보고서는 scripts/rule-attack.mjs, 회귀 가드는 ruleAttack.test.ts가 쓴다.
 */
import { PROBLEMS } from './problems';
import type { Problem } from './problems';

/* ── 수 도우미 ── */
const digits = (n: number): number[] => String(Math.abs(n)).split('').map(Number);
const dsum = (n: number): number => digits(n).reduce((a, b) => a + b, 0);
const droot = (n: number): number => (n === 0 ? 0 : 1 + ((Math.abs(n) - 1) % 9));
const rev = (n: number): number =>
	Number(String(Math.abs(n)).split('').reverse().join('')) * Math.sign(n || 1);
const isPal = (n: number): boolean =>
	String(Math.abs(n)) === String(Math.abs(n)).split('').reverse().join('');
const isPrime = (n: number): boolean => {
	if (n < 2) return false;
	for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
	return true;
};
const carries = (a: number, b: number): number => {
	let c = 0;
	let k = 0;
	const A = digits(a).reverse();
	const B = digits(b).reverse();
	for (let i = 0; i < Math.max(A.length, B.length); i++) {
		const s = (A[i] ?? 0) + (B[i] ?? 0) + k;
		if (s >= 10) {
			c++;
			k = 1;
		} else k = 0;
	}
	return c;
};
const digitwiseNoCarry = (a: number, b: number): number => {
	const A = digits(a).reverse();
	const B = digits(b).reverse();
	let out = '';
	for (let i = Math.max(A.length, B.length) - 1; i >= 0; i--) out += String((A[i] ?? 0) + (B[i] ?? 0));
	return Number(out);
};
const countBetween = (a: number, b: number, pred: (n: number) => boolean): number => {
	let n = 0;
	for (let i = Math.min(a, b) + 1; i < Math.max(a, b); i++) if (pred(i)) n++;
	return n;
};

/* ── 본문 뽑기 ── */
const strip = (h: unknown): string =>
	String(h)
		.replace(/<br\s*\/?>/g, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ');
const textOf = (p: Problem): string =>
	p.blocks
		.map((b) => ('text' in b && b.kind === 'pre' ? b.text : strip((b as { html?: string }).html ?? '')))
		.join('\n');

/* ═══════════ 이상한 연산 ═══════════ */

const UNARY: [string, (x: number) => number][] = [
	['그대로', (x) => x],
	['자릿수 뒤집기', rev],
	['자릿수 합', dsum],
	['디지털 루트', droot],
	['절댓값', Math.abs],
	['+1', (x) => x + 1],
	['-1', (x) => x - 1],
	['×2', (x) => x * 2]
];

const CORE: [string, (a: number, b: number) => number][] = [
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
	['자릿수합끼리 더함', (a, b) => dsum(a) + dsum(b)]
];

const COND: [string, (a: number, b: number) => boolean][] = [
	['a가 홀수', (a) => a % 2 === 1],
	['a가 짝수', (a) => a % 2 === 0],
	['a가 대칭수', (a) => isPal(a)],
	['a가 소수', (a) => isPrime(a)],
	['a > b', (a, b) => a > b],
	['a < b', (a, b) => a < b],
	['a ≥ b', (a, b) => a >= b],
	['a+b가 짝수', (a, b) => (a + b) % 2 === 0],
	['a가 두 자리', (a) => String(Math.abs(a)).length >= 2],
	['a가 b의 배수', (a, b) => b !== 0 && a % b === 0]
];

type Rule = {
	name: string;
	f: (a: number, b: number) => number;
	cond: ((a: number, b: number) => boolean) | null;
};

/**
 * 조건 갈림형은 「어느 가지를 탔는지」를 들고 다닌다 — 예시가 한쪽 가지만 밟았다면
 * 나머지 가지는 예시가 전혀 제약하지 못하므로 사람이 세울 가설이 아니다(퇴화).
 */
function buildRules(): Rule[] {
	const out: Rule[] = [];
	for (const [un, u] of UNARY)
		for (const [cn, c] of CORE)
			out.push({ name: un === '그대로' ? cn : `${cn} → ${un}`, f: (a, b) => u(c(a, b)), cond: null });
	for (const [dn, d] of COND)
		for (const [n1, f1] of CORE)
			for (const [n2, f2] of CORE) {
				if (n1 === n2) continue;
				out.push({
					name: `${dn}이면 ${n1}, 아니면 ${n2}`,
					f: (a, b) => (d(a, b) ? f1(a, b) : f2(a, b)),
					cond: d
				});
			}
	return out;
}
const RULES = buildRules();
export const 규칙수 = RULES.length;

/**
 * 자명한 연산. 「이상한 연산」이라고 내놓았는데 이것 하나로 예시와 답이 전부
 * 설명되면 그 문제가 주장하는 「발견」이 존재하지 않는다 — num-place-add가 그랬다.
 */
const 자명 = new Set(['a+b', 'a-b', 'b-a', '|a-b|', 'a×b']);

function parseOp(txt: string): { rows: [number, number, number][]; q: [number, number][] } {
	const rows: [number, number, number][] = [];
	const q: [number, number][] = [];
	for (const line of txt.split('\n')) {
		const m = line.match(/(-?\d+)\s*[^\d\s=]{1,3}\s*(-?\d+)\s*=\s*(-?\d+|\?)/);
		if (!m) continue;
		const [, a, b, c] = m;
		if (c === '?') q.push([+a, +b]);
		else rows.push([+a, +b, +c]);
	}
	return { rows, q };
}

export type Alt = { 답: number | string; 규칙: string };
export type Finding = { id: string; 종류: '갈림' | '자명'; 공식답: number | string; 대안: Alt[] };
export type Skipped = { id: string; 이유: string };
export type Report = { 적발: Finding[]; 통과: string[]; 판단불가: Skipped[]; 검사수: number };

export function attackOps(): Report {
	const targets = PROBLEMS.filter((p) => p.chip === '이상한 연산');
	const 적발: Finding[] = [];
	const 통과: string[] = [];
	const 판단불가: Skipped[] = [];

	for (const p of targets) {
		const { rows, q } = parseOp(textOf(p));
		if (rows.length < 3 || q.length !== 1) {
			판단불가.push({ id: p.id, 이유: `줄을 못 읽었다(예시 ${rows.length})` });
			continue;
		}
		const 공식 = Number(p.answers?.[0]);
		const fit: { name: string; v: number }[] = [];
		for (const r of RULES) {
			let ok = true;
			for (const [a, b, c] of rows) {
				let v: number;
				try {
					v = r.f(a, b);
				} catch {
					ok = false;
					break;
				}
				if (!Number.isFinite(v) || v !== c) {
					ok = false;
					break;
				}
			}
			if (!ok) continue;
			if (r.cond) {
				const t = rows.filter(([a, b]) => r.cond!(a, b)).length;
				if (t === 0 || t === rows.length) continue; // 퇴화 — 예시가 한쪽 가지만 밟는다
			}
			let v: number;
			try {
				v = r.f(...q[0]);
			} catch {
				continue;
			}
			if (!Number.isFinite(v)) continue;
			// 예시 답이 전부 0 이상인데 음수를 내는 대안은 사람이 세울 가설이 아니다
			if (v < 0 && rows.every(([, , c]) => c >= 0)) continue;
			fit.push({ name: r.name, v });
		}
		if (!fit.length) {
			판단불가.push({ id: p.id, 이유: `맞는 규칙을 못 찾음(공식답 ${공식})` });
			continue;
		}
		// 공식답을 내는 규칙이 하나도 없으면 라이브러리가 진짜 규칙을 모르는 것이다
		if (!fit.some((r) => r.v === 공식)) {
			판단불가.push({ id: p.id, 이유: `공식답 ${공식}을 내는 규칙이 없다 — 진짜 규칙을 모른다` });
			continue;
		}
		const 다른 = fit.filter((r) => r.v !== 공식);
		if (다른.length) {
			const seen = new Set<number>();
			const 대안: Alt[] = [];
			for (const r of 다른) {
				if (seen.has(r.v)) continue;
				seen.add(r.v);
				대안.push({ 답: r.v, 규칙: r.name });
			}
			적발.push({ id: p.id, 종류: '갈림', 공식답: 공식, 대안 });
			continue;
		}
		const 자 = fit.find((r) => 자명.has(r.name));
		if (자) 적발.push({ id: p.id, 종류: '자명', 공식답: 공식, 대안: [{ 답: 공식, 규칙: 자.name }] });
		else 통과.push(p.id);
	}
	return { 적발, 통과, 판단불가, 검사수: targets.length };
}

/* ═══════════ 수열·사슬 ═══════════ */

const SEQ: [string, (a: number[]) => number][] = [
	['등차', (a) => a[a.length - 1] + (a[a.length - 1] - a[a.length - 2])],
	['등비', (a) => (a[a.length - 2] ? a[a.length - 1] * (a[a.length - 1] / a[a.length - 2]) : NaN)],
	[
		'계차의 등차',
		(a) => {
			const d = a[a.length - 1] - a[a.length - 2];
			const e = a[a.length - 2] - a[a.length - 3];
			return a[a.length - 1] + d + (d - e);
		}
	],
	['앞 둘의 합', (a) => a[a.length - 1] + a[a.length - 2]],
	['앞 둘의 차', (a) => Math.abs(a[a.length - 1] - a[a.length - 2])],
	['앞 둘의 곱', (a) => a[a.length - 1] * a[a.length - 2]],
	['n²', (a) => (a.length + 1) ** 2],
	['n²+n', (a) => (a.length + 1) ** 2 + a.length + 1],
	['n³', (a) => (a.length + 1) ** 3],
	['×n', (a) => a[a.length - 1] * (a.length + 1)],
	['자릿수 곱', (a) => digits(a[a.length - 1]).reduce((x, y) => x * y, 1)],
	['자릿수 합', (a) => dsum(a[a.length - 1])],
	['자릿수 제곱합', (a) => digits(a[a.length - 1]).reduce((x, y) => x + y * y, 0)],
	['앞항 뒤집기', (a) => rev(a[a.length - 1])],
	['앞항×2', (a) => a[a.length - 1] * 2],
	['앞항÷2', (a) => a[a.length - 1] / 2]
];

function parseSeq(txt: string): number[] | null {
	for (const line of txt.split('\n')) {
		const toks = line
			.split(/[\s,→]+/)
			.map((t) => t.trim())
			.filter(Boolean);
		if (toks.length < 4) continue;
		if (!toks.every((t) => /^-?\d+$/.test(t) || t === '?')) continue;
		if (toks.filter((t) => t === '?').length !== 1) continue;
		if (toks[toks.length - 1] !== '?') continue; // 물음표가 끝에 있는 것만 다룬다
		return toks.slice(0, -1).map(Number);
	}
	return null;
}

export function attackSeqs(): Report {
	const targets = PROBLEMS.filter((p) => p.chip === '수열' || p.chip === '사슬');
	const 적발: Finding[] = [];
	const 통과: string[] = [];
	const 판단불가: Skipped[] = [];

	for (const p of targets) {
		const known = parseSeq(textOf(p));
		if (!known || known.length < 3) {
			판단불가.push({ id: p.id, 이유: '끝에 물음표가 있는 수열 줄을 못 읽었다' });
			continue;
		}
		const 공식 = Number(p.answers?.[0]);
		const fit: { name: string; v: number }[] = [];
		for (const [name, f] of SEQ) {
			/**
			 * 규칙마다 필요한 앞 항 수가 다르다. 「계차의 등차」는 셋이 필요하지만
			 * 「앞항÷2」는 하나면 된다. 예전에는 i=3부터 일괄로 검사해서, 항이 넷인
			 * 수열에서는 마지막 한 자리만 보고 통과시켰다 — nm-digit-chain(77→49→36→18)이
			 * 「앞항÷2」로 새는 것처럼 보였는데 77÷2=38.5라 첫 자리에서 죽는 규칙이었다.
			 * 그래서 계산이 되는 가장 이른 자리부터 끝까지 전부 맞아야 하고,
			 * 확인한 자리가 둘 미만이면 한 점에 맞춘 것이라 세지 않는다.
			 */
			let ok = true;
			let 확인 = 0;
			for (let i = 1; i < known.length; i++) {
				let v: number;
				try {
					v = f(known.slice(0, i));
				} catch {
					continue; // 이 자리에서는 아직 계산이 안 된다
				}
				if (!Number.isFinite(v)) continue;
				확인++;
				if (v !== known[i]) {
					ok = false;
					break;
				}
			}
			if (!ok || 확인 < 2) continue;
			let v: number;
			try {
				v = f(known);
			} catch {
				continue;
			}
			if (Number.isFinite(v)) fit.push({ name, v });
		}
		if (!fit.length) {
			판단불가.push({ id: p.id, 이유: `맞는 규칙을 못 찾음(공식답 ${공식})` });
			continue;
		}
		if (!fit.some((r) => r.v === 공식)) {
			판단불가.push({ id: p.id, 이유: `공식답 ${공식}을 내는 규칙이 없다 — 진짜 규칙을 모른다` });
			continue;
		}
		const 다른 = fit.filter((r) => r.v !== 공식);
		if (다른.length) {
			const seen = new Set<number>();
			const 대안: Alt[] = [];
			for (const r of 다른) {
				if (seen.has(r.v)) continue;
				seen.add(r.v);
				대안.push({ 답: r.v, 규칙: r.name });
			}
			적발.push({ id: p.id, 종류: '갈림', 공식답: 공식, 대안 });
		} else 통과.push(p.id);
	}
	return { 적발, 통과, 판단불가, 검사수: targets.length };
}

/* ═══════════ 클럽(숫자형) ═══════════ */

const PRED: [string, (n: number) => boolean][] = [
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
	[
		'약수 개수가 홀수',
		(n) => {
			let c = 0;
			for (let i = 1; i <= n; i++) if (n % i === 0) c++;
			return c % 2 === 1;
		}
	],
	['자릿수가 증가한다', (n) => digits(n).every((d, i, a) => i === 0 || d > a[i - 1])],
	['자릿수가 연속이다', (n) => digits(n).every((d, i, a) => i === 0 || d === a[i - 1] + 1)],
	['자릿수에 0이 없다', (n) => !digits(n).includes(0)],
	['5의 배수', (n) => n % 5 === 0],
	['4의 배수', (n) => n % 4 === 0],
	['자릿수 합이 10 이상', (n) => dsum(n) >= 10],
	['10으로 나눈 나머지가 짝수', (n) => (n % 10) % 2 === 0]
];

export function attackClubs(): Report & { 낱말형: number } {
	const targets = PROBLEMS.filter((p) => p.chip === '클럽');
	const 적발: Finding[] = [];
	const 통과: string[] = [];
	const 판단불가: Skipped[] = [];
	let 낱말형 = 0;

	for (const p of targets) {
		const txt = textOf(p);
		const grab = (k: string) => txt.match(new RegExp(k + '[^:：]*[:：]\\s*(.+)'))?.[1] ?? '';
		const split = (s: string) =>
			s
				.split(/[,、]/)
				.map((x) => x.trim())
				.filter(Boolean);
		const M = split(grab('회원'));
		const R = split(grab('거절'));
		const candLine = txt.split('\n').find((l) => /①/.test(l)) ?? '';
		const C = [...candLine.matchAll(/[①②③④⑤]\s*([^\s①②③④⑤]+)/g)].map((m) => m[1]);
		const all = [...M, ...R, ...C];
		// 낱말형은 사전·언어 지식이 필요해 기계 몫이 아니다
		if (!all.length || !all.every((x) => /^-?\d+$/.test(x))) {
			낱말형++;
			continue;
		}
		const m = M.map(Number);
		const r = R.map(Number);
		const c = C.map(Number);
		const 공식 = new Set(
			(p.answers?.[0] ?? '')
				.split(/[,\s]+/)
				.filter(Boolean)
				.map(Number)
		);
		const key = (s: Set<number>) => [...s].sort((a, b) => a - b).join(',');
		const fit: { name: string; s: Set<number> }[] = [];
		for (const [name, f] of PRED) {
			if (!m.every(f) || r.some(f)) continue;
			fit.push({ name, s: new Set(c.filter(f)) });
		}
		if (!fit.length) {
			판단불가.push({ id: p.id, 이유: '회원/거절을 가르는 성질을 못 찾음' });
			continue;
		}
		if (!fit.some((x) => key(x.s) === key(공식))) {
			판단불가.push({ id: p.id, 이유: `공식답(${key(공식)})을 내는 성질이 없다 — 진짜 규칙을 모른다` });
			continue;
		}
		const 다른 = fit.filter((x) => key(x.s) !== key(공식));
		if (다른.length) {
			const seen = new Set<string>();
			const 대안: Alt[] = [];
			for (const x of 다른) {
				const k = key(x.s);
				if (seen.has(k)) continue;
				seen.add(k);
				대안.push({ 답: `{${k}}`, 규칙: x.name });
			}
			적발.push({ id: p.id, 종류: '갈림', 공식답: `{${key(공식)}}`, 대안 });
		} else 통과.push(p.id);
	}
	return { 적발, 통과, 판단불가, 검사수: targets.length - 낱말형, 낱말형 };
}

/** 세 엔진을 한 번에 — 적발된 문제 id만 모아 준다 */
export function 적발된_id(): string[] {
	return [attackOps(), attackSeqs(), attackClubs()]
		.flatMap((r) => r.적발.map((f) => f.id))
		.sort();
}
