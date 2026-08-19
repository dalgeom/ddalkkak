import { describe, it, expect } from 'vitest';
import { PROBLEMS } from './problems';
import { TRIVIA } from './trivia';
import type { Problem } from './problems';

/**
 * 내용 중복 린터 — "같은 내용, 다른 id"를 기계가 잡는다.
 *
 * id 유니크 검사로는 못 잡는다. 실제로 케이크 자르기가 답이 7과 8로 갈린 채 둘 들어
 * 있었고, 훈민정음 창제 왕을 카테고리만 바꿔 두 번 물었다. 그때는 사람이 인벤토리를
 * 눈으로 훑어 찾았는데, 그 방식은 다음에 또 놓친다.
 *
 * 완벽한 의미 비교는 못 한다. 지문의 문자 3-그램 자카드로 "거의 같은 문장"만 잡고,
 * 발견 메커니즘이 같은데 표현이 다른 경우는 여전히 사람 몫이다(명세 PART 10).
 *
 * 문턱(0.45)은 임의로 고른 값이 아니라 정리를 마친 은행의 최댓값 바로 위다.
 * 지금 통과한다는 뜻이 아니라, 이보다 닮은 문제가 새로 들어오면 반드시 걸린다는 뜻.
 */
const LIMIT = 0.45;

/**
 * 문제 유형마다 반복되는 상용구를 걷어낸다.
 * "'X'의 뜻으로 가장 알맞은 것은?" 같은 틀은 서로 다른 속담 문제끼리도 3-그램을
 * 잔뜩 공유하게 만들어, 걷어내지 않으면 오탐이 진짜 중복을 덮는다.
 */
const BOILERPLATE = [
	/의뜻으로가장(알맞은|적절한)것은/g,
	/은?어디서유래했을까요?/g,
	/다음중/g,
	/무엇일까요?/g,
	/물음표에들어갈(수는|것은|글자는|말은|단어는|날짜는|요일은)/g,
	/의규칙을찾아라/g,
	/이클럽에가입할수있는/g,
	/를?모두고르시오/g,
	/후보중가입할수있는/g
];

function textOf(p: Problem): string {
	const raw = p.blocks
		.map((b) =>
			b.kind === 'text' ? b.html
			: b.kind === 'pre' ? b.text
			: b.kind === 'lcd' || b.kind === 'glyph' ? b.lines.join(' ')
			: b.kind === 'colors' ? b.rows.join(' ')
			: ''
		)
		.join(' ')
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, '')
		.toLowerCase();
	return BOILERPLATE.reduce((s, re) => s.replace(re, ''), raw);
}

function trigrams(s: string): Set<string> {
	const out = new Set<string>();
	for (let i = 0; i + 3 <= s.length; i++) out.add(s.slice(i, i + 3));
	return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
	if (!a.size || !b.size) return 0;
	let inter = 0;
	for (const g of a) if (b.has(g)) inter++;
	return inter / (a.size + b.size - inter);
}

/** 문턱을 넘은 쌍 — 유사도 높은 순 */
function suspects(bank: Problem[], limit: number): string[] {
	const prepared = bank
		.map((p) => ({ id: p.id, text: textOf(p) }))
		.filter((p) => p.text.length >= 12) // 그림 위주 문제는 지문으로 잴 수 없다
		.map((p) => ({ ...p, grams: trigrams(p.text) }));

	const hits: { pair: string; sim: number }[] = [];
	for (let i = 0; i < prepared.length; i++) {
		for (let j = i + 1; j < prepared.length; j++) {
			const sim = jaccard(prepared[i].grams, prepared[j].grams);
			if (sim >= limit) hits.push({ pair: `${prepared[i].id} ↔ ${prepared[j].id}`, sim });
		}
	}
	return hits.sort((a, b) => b.sim - a.sim).map((h) => `${h.pair} (${(h.sim * 100).toFixed(0)}%)`);
}

describe('내용 중복 린터', () => {
	it('발견형에 거의 같은 지문의 쌍이 없다', () => {
		const hits = suspects(PROBLEMS, LIMIT);
		expect(hits, `중복 의심:\n  ${hits.join('\n  ')}`).toEqual([]);
	});

	it('상식에 거의 같은 지문의 쌍이 없다', () => {
		const hits = suspects(TRIVIA, LIMIT);
		expect(hits, `중복 의심:\n  ${hits.join('\n  ')}`).toEqual([]);
	});

	it('린터가 실제로 잡는다 — 문장을 베낀 문제를 넣으면 걸린다', () => {
		const original = PROBLEMS.find((p) => textOf(p).length >= 30)!;
		const clone = { ...original, id: original.id + '-copy' };
		expect(suspects([original, clone], LIMIT).length).toBe(1);
	});
});
