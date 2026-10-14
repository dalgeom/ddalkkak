/**
 * 성냥개비 새 규칙 문제 생성기 — 단계 모드(2026-10-14)용.
 *
 * 식의 범위는 matchstick-gen.mjs와 같다: A op B = C, A·B 한 자리, C는 0~9 또는 10~19.
 * 규칙마다 「1개 옮기기로는 안 풀리고, 그 규칙으로 참이 되는 식이 정확히 하나」인 것만 고른다.
 *   move2   성냥 2개를 옮긴다(뺀 수 = 꽂은 수 = 2)
 *   remove1 성냥 1개를 뺀다(뺀 수 1, 꽂은 수 0)
 *   add1    성냥 1개를 더한다(뺀 수 0, 꽂은 수 1)
 *
 * 실행: node scripts/matchstick-variants.mjs
 * 출력: src/lib/data/matchstick-variants.json
 */
import { writeFileSync } from 'node:fs';

const SEG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
const toMask = (s) => [...s].reduce((m, ch) => m | (1 << (ch.charCodeAt(0) - 97)), 0);
const D2M = SEG.map(toMask);
const pc = (n) => {
	let c = 0;
	while (n) {
		n &= n - 1;
		c++;
	}
	return c;
};

const cForms = [...Array.from({ length: 10 }, (_, c) => [c]), ...Array.from({ length: 10 }, (_, c) => [1, c])];
const value = (cd) => (cd.length === 1 ? cd[0] : 10 + cd[1]);
const str = (a, plus, b, cd) => `${a} ${plus ? '+' : '-'} ${b} = ${cd.join('')}`;

/** 참인 식 전부(같은 범위) */
const TRUE = [];
for (let a = 0; a <= 9; a++)
	for (let b = 0; b <= 9; b++)
		for (const plus of [true, false])
			for (const cd of cForms) if ((plus ? a + b : a - b) === value(cd)) TRUE.push({ a, plus, b, cd });

/** o → t 로 갈 때 뺀 성냥 수·꽂은 성냥 수(연산자 세로획 포함). 자릿수가 다르면 null */
function diff(o, t) {
	if (o.cd.length !== t.cd.length) return null;
	const om = [o.a, o.b, ...o.cd].map((d) => D2M[d]);
	const tm = [t.a, t.b, ...t.cd].map((d) => D2M[d]);
	let rem = 0;
	let add = 0;
	om.forEach((m, i) => {
		rem += pc(m & ~tm[i]);
		add += pc(tm[i] & ~m);
	});
	if (o.plus && !t.plus) rem++;
	if (!o.plus && t.plus) add++;
	return { rem, add };
}

const NEED = { move2: [2, 2], remove1: [1, 0], add1: [0, 1] };
const out = { move2: [], remove1: [], add1: [] };

for (let a = 0; a <= 9; a++)
	for (let b = 0; b <= 9; b++)
		for (const plus of [true, false])
			for (const cd of cForms) {
				const o = { a, plus, b, cd };
				if ((plus ? a + b : a - b) === value(cd)) continue; // 이미 참
				const ds = TRUE.map((t) => ({ t, d: diff(o, t) })).filter((x) => x.d);
				if (ds.some((x) => x.d.rem === 1 && x.d.add === 1)) continue; // 1개 옮기기로 풀리면 제외
				for (const [rule, [r, ad]] of Object.entries(NEED)) {
					const hits = ds.filter((x) => x.d.rem === r && x.d.add === ad);
					if (hits.length === 1) {
						const t = hits[0].t;
						out[rule].push({ displayed: str(a, plus, b, cd), solution: str(t.a, t.plus, t.b, t.cd) });
					}
				}
			}

writeFileSync('src/lib/data/matchstick-variants.json', JSON.stringify(out, null, '\t') + '\n');
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
