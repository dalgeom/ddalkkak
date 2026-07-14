/**
 * 성냥개비 등식 생성기 (실행형 생성기 1호)
 *
 * "성냥개비 하나를 옮겨 등식을 참으로 만들어라" 문제를 전수 탐색으로 생성한다.
 * - 형태: A op B = C  (A, B는 한 자리, C는 한두 자리, op는 + 또는 -)
 * - 이동: 아무 획 하나를 떼어 다른 빈 자리에 붙인다 (숫자 획 ↔ 연산자 세로획 포함, = 는 불변)
 * - 채택 조건: 표시된 식은 거짓 + 참이 되는 결과 등식이 정확히 하나 (유일해 증명)
 *
 * 실행: node scripts/matchstick-gen.mjs
 * 출력: scripts/matchstick-problems.json + 콘솔 요약
 */
import { writeFileSync } from 'node:fs';

const SEG = {
	0: 'abcdef',
	1: 'bc',
	2: 'abdeg',
	3: 'abcdg',
	4: 'bcfg',
	5: 'acdfg',
	6: 'acdefg',
	7: 'abc',
	8: 'abcdefg',
	9: 'abcdfg'
};
const toMask = (s) => [...s].reduce((m, ch) => m | (1 << (ch.charCodeAt(0) - 97)), 0);
const D2M = Object.fromEntries(Object.entries(SEG).map(([d, s]) => [Number(d), toMask(s)]));
const M2D = new Map(Object.entries(D2M).map(([, m], i) => [m, i]));
const BITS = [0, 1, 2, 3, 4, 5, 6];

function evaluate(digits, opPlus, cLen) {
	const a = digits[0];
	const b = digits[1];
	const c = cLen === 1 ? digits[2] : digits[2] * 10 + digits[3];
	return opPlus ? a + b === c : a - b === c;
}

function eqString(digits, opPlus, cLen) {
	const c = cLen === 1 ? `${digits[2]}` : `${digits[2]}${digits[3]}`;
	return `${digits[0]} ${opPlus ? '+' : '-'} ${digits[1]} = ${c}`;
}

/** 한 번의 이동으로 도달 가능한 모든 유효 상태를 순회 */
function* oneMove(masks, opPlus) {
	const removals = [];
	const additions = [];
	masks.forEach((m, gi) => {
		for (const bit of BITS) {
			if (m & (1 << bit)) removals.push({ gi, bit });
			else additions.push({ gi, bit });
		}
	});
	// 연산자: '+'는 세로획을 뗄 수 있고, '-'는 세로획을 받을 수 있다
	if (opPlus) removals.push({ op: true });
	else additions.push({ op: true });

	for (const rm of removals) {
		for (const ad of additions) {
			if (!rm.op && !ad.op && rm.gi === ad.gi && rm.bit === ad.bit) continue;
			const next = masks.slice();
			let nextOp = opPlus;
			if (rm.op) nextOp = false;
			else next[rm.gi] &= ~(1 << rm.bit);
			if (ad.op) nextOp = true;
			else next[ad.gi] |= 1 << ad.bit;
			const digits = next.map((m) => M2D.get(m));
			if (digits.some((d) => d === undefined)) continue;
			yield { digits, opPlus: nextOp };
		}
	}
}

const results = [];

for (let a = 0; a <= 9; a++) {
	for (let b = 0; b <= 9; b++) {
		for (const opPlus of [true, false]) {
			const cForms = [];
			for (let c = 0; c <= 9; c++) cForms.push([c]);
			for (let c2 = 0; c2 <= 9; c2++) cForms.push([1, c2]);

			for (const cDigits of cForms) {
				const digits = [a, b, ...cDigits];
				const cLen = cDigits.length;
				if (evaluate(digits, opPlus, cLen)) continue; // 표시식이 이미 참이면 제외

				const masks = digits.map((d) => D2M[d]);
				const solutions = new Set();
				for (const st of oneMove(masks, opPlus)) {
					if (evaluate(st.digits, st.opPlus, cLen)) {
						solutions.add(eqString(st.digits, st.opPlus, cLen));
					}
				}
				if (solutions.size === 1) {
					results.push({
						displayed: eqString(digits, opPlus, cLen),
						solution: [...solutions][0]
					});
				}
			}
		}
	}
}

writeFileSync(
	new URL('./matchstick-problems.json', import.meta.url),
	JSON.stringify(results, null, '\t')
);

console.log(`유일해 성냥개비 문제: ${results.length}개 생성`);
console.log('샘플:');
const step = Math.max(1, Math.floor(results.length / 10));
for (let i = 0; i < results.length && i < step * 10; i += step) {
	console.log(`  ${results[i].displayed}   →   ${results[i].solution}`);
}
