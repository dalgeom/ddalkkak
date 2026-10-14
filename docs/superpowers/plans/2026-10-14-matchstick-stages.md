# 성냥개비 단계 모드 1단계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** /matchstick에 60단계짜리 「단계 도전」을 더하고, 단계 후반에 새 규칙(성냥 2개 옮기기·1개 빼기·1개 더하기) 문제를 넣는다.

**Architecture:** 새 규칙 문제는 기존 생성기처럼 전수 탐색 스크립트로 만들어 JSON으로 박는다(정답 하나 보장). 판정은 `matchstick.ts`의 `moveDiff`를 규칙별 기대값과 견주는 함수 하나로 넓힌다. 단계 구성·별 계산·진행 저장은 새 모듈 `matchStages.ts`가 맡고, 화면은 기존 `/matchstick` 페이지에 모드 하나(`stage`)를 더한다.

**Tech Stack:** SvelteKit 2 · Svelte 5 runes · TypeScript · vitest · GA4(track) · Node 스크립트

---

## 왜 하는가 (2026-10-14 근거)

- 9/16~10/13 한국 랜딩 세션: 성냥개비 245(검색·추천 218, 1위) · 홈 180 · 초성 63 · 상식 52.
- 성냥개비로 들어온 사람은 무한 연습을 몇 개 풀고 끝난다. 돌아올 이유(목표·진행도)가 없다.
- 판정 지표: 재방문(7일) · 성냥개비 랜딩 세션당 참여 시간 · 단계 진행 깊이.

## 결정 사항 (사용자 승인 대상)

| 항목 | 결정 |
|---|---|
| 단계 수 | 60단계 × 5문제 = 300문제 |
| 구성 | 1–10 쉬움(1개 옮기기) · 11–20 중간 · 21–24 1개 빼기 · 25–28 1개 더하기 · 29–38 어려움 · 39–60 2개 옮기기 |
| 별 | 5문제 모두 정답 보기 없이 + 힌트 0 → ★3 · 5문제 모두 풀면(힌트 허용) ★2 · 3문제 이상 → ★1 · 그 미만 → 실패 |
| 해금 | 바로 앞 단계를 ★1 이상으로 깨면 다음 단계가 열린다 |
| 저장 | 기기(localStorage `ddal.match.stages`) — 단계 번호 → 최고 별 |
| 기존 모드 | 오늘의 성냥개비·무한 연습·타임어택·개수 도전은 그대로(1개 옮기기 741개만 씀) |
| 새 규칙 문제 출처 | 답 범위 0~19(기존 생성기와 같은 범위), 1개 옮기기로는 안 풀리고 해당 규칙으로 정답이 정확히 하나인 식만: 2개 옮기기 702 · 1개 빼기 212 · 1개 더하기 252 |
| 조작 | 옮기기: 지금처럼 집고 놓기(2개 옮기기는 두 번 옮긴 뒤 판정) · 빼기: 성냥을 누르면 빠진다 · 더하기: 빈 자리를 누르면 꽂힌다 |
| 검색 본문 | 메뉴의 「성냥개비 퍼즐이란」 등 서버 렌더 글은 건드리지 않는다(네이버 「성냥개비 문제」 1위 페이지) |
| 판정 날짜 | 11/4쯤 — `match_stage_start`/`match_stage_clear` 단계별 도달 수, 성냥개비 랜딩 재방문율(9/16~10/13 대비) |

## 파일 구조

- Create `scripts/matchstick-variants.mjs` — 새 규칙 문제 전수 생성(기존 `matchstick-gen.mjs`와 같은 식 범위)
- Create `src/lib/data/matchstick-variants.json` — 생성 결과 `{ move2: [...], remove1: [...], add1: [...] }`
- Modify `src/lib/matchstick.ts` — `MatchRule`, `RULE_DIFF`, `judgeRule`, `ruleHints`
- Modify `src/lib/matchstick.test.ts` — 규칙 판정·힌트 테스트
- Create `src/lib/matchstickVariants.test.ts` — 생성 데이터 유일해 재검증(TS 엔진으로)
- Create `src/lib/matchStages.ts` — 단계 구성 · 별 계산 · 진행 저장
- Create `src/lib/matchStages.test.ts`
- Modify `src/routes/matchstick/+page.svelte` — `stage` 모드, 메뉴 「단계 도전」, 단계 결과 화면
- Modify `scripts/ga-yesterday.py` — 단계 이벤트 줄
- Modify `promo/지표-기록.md` — 실험 기록

---

### Task 1: 새 규칙 문제 생성기

**Files:**
- Create: `scripts/matchstick-variants.mjs`
- Create: `src/lib/data/matchstick-variants.json` (스크립트 출력)

- [ ] **Step 1: 생성기 작성**

```js
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
			for (const cd of cForms)
				if ((plus ? a + b : a - b) === value(cd)) TRUE.push({ a, plus, b, cd });

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
```

- [ ] **Step 2: 실행**

Run: `node scripts/matchstick-variants.mjs`
Expected: `{ move2: 702, remove1: 212, add1: 252 }`

- [ ] **Step 3: 커밋**

```bash
git add scripts/matchstick-variants.mjs src/lib/data/matchstick-variants.json
git commit -m "feat(성냥개비): 새 규칙 문제 생성 — 2개 옮기기 702 · 1개 빼기 212 · 1개 더하기 252"
```

### Task 2: 규칙 판정 `judgeRule`

**Files:**
- Modify: `src/lib/matchstick.ts` (isSolved 아래)
- Test: `src/lib/matchstick.test.ts`

- [ ] **Step 1: 실패하는 테스트**

`src/lib/matchstick.test.ts` 첫 import에 `judgeRule`을 더하고 맨 끝에 붙인다.

```ts
describe('judgeRule — 규칙별 판정', () => {
	it('1개 옮기기는 기존 isSolved와 같다', () => {
		const o = parseEq('0 + 0 = 8');
		expect(judgeRule(o, parseEq('8 - 0 = 8'), 'move1')).toBe('solved');
		expect(judgeRule(o, parseEq('0 + 0 = 8'), 'move1')).toBe('more');
	});
	it('2개 옮기기는 하나만 옮긴 상태면 계속', () => {
		const o = parseEq('0 + 1 = 0');
		expect(judgeRule(o, o, 'move2')).toBe('more');
	});
	it('빼기·더하기는 한 번에 판정', () => {
		expect(judgeRule(parseEq('8 + 1 = 9'), parseEq('8 + 1 = 9'), 'remove1')).toBe('more');
		expect(judgeRule(parseEq('9 - 1 = 9'), parseEq('9 - 1 = 8'), 'add1')).toBe('solved');
		expect(judgeRule(parseEq('9 - 1 = 9'), parseEq('9 - 7 = 9'), 'add1')).toBe('wrong');
	});
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/matchstick.test.ts`
Expected: FAIL — `judgeRule is not a function`

- [ ] **Step 3: 구현** (`isSolved` 바로 아래)

```ts
/** 단계 모드의 문제 규칙(2026-10-14). 기존 741개는 전부 move1이다 */
export type MatchRule = 'move1' | 'move2' | 'remove1' | 'add1';

/** 규칙마다 끝났을 때의 뺀 수·꽂은 수 */
export const RULE_DIFF: Record<MatchRule, { removed: number; added: number }> = {
	move1: { removed: 1, added: 1 },
	move2: { removed: 2, added: 2 },
	remove1: { removed: 1, added: 0 },
	add1: { removed: 0, added: 1 }
};

/**
 * 손을 하나 쓴 뒤의 판정. 'more'는 아직 덜 옮겼다는 뜻이라 되돌리지 않고 계속 받는다.
 * 2개 옮기기에서 첫 번째를 옮긴 직후(뺀 1·꽂은 1)가 그 경우다.
 */
export function judgeRule(orig: Board, cur: Board, rule: MatchRule): 'solved' | 'more' | 'wrong' {
	const d = moveDiff(orig, cur);
	const need = RULE_DIFF[rule];
	if (d.removed === need.removed && d.added === need.added) return isTrue(cur) ? 'solved' : 'wrong';
	if (d.removed < need.removed || d.added < need.added) return d.removed > need.removed || d.added > need.added ? 'wrong' : 'more';
	return 'wrong';
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/matchstick.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/matchstick.ts src/lib/matchstick.test.ts
git commit -m "feat(성냥개비): 규칙별 판정 judgeRule — 옮기기 1·2개, 빼기, 더하기"
```

### Task 3: 생성 데이터 재검증 테스트

**Files:**
- Create: `src/lib/matchstickVariants.test.ts`

- [ ] **Step 1: 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { parseEq, isTrue, moveDiff, RULE_DIFF, type MatchRule } from './matchstick';
import V from './data/matchstick-variants.json';

/** 생성기(JS)와 다른 길(TS 엔진)로 「정답이 정확히 하나」를 다시 센다 */
const TRUE: string[] = [];
for (let a = 0; a <= 9; a++)
	for (let b = 0; b <= 9; b++)
		for (const op of ['+', '-'])
			for (const c of [...Array(20).keys()])
				if ((op === '+' ? a + b : a - b) === c) TRUE.push(`${a} ${op} ${b} = ${c}`);

function hits(displayed: string, rule: MatchRule) {
	const o = parseEq(displayed);
	const need = RULE_DIFF[rule];
	return TRUE.filter((t) => {
		const b = parseEq(t);
		if (b.cLen !== o.cLen) return false;
		const d = moveDiff(o, b);
		return d.removed === need.removed && d.added === need.added;
	});
}

describe('matchstick-variants.json', () => {
	for (const rule of ['move2', 'remove1', 'add1'] as const) {
		it(`${rule} — 표시식은 거짓, 그 규칙의 답은 정확히 하나, 1개 옮기기로는 안 풀린다`, () => {
			const list = (V as Record<string, { displayed: string; solution: string }[]>)[rule];
			expect(list.length).toBeGreaterThan(100);
			for (const p of list) {
				expect(isTrue(parseEq(p.displayed)), p.displayed).toBe(false);
				expect(hits(p.displayed, rule), p.displayed).toEqual([p.solution]);
				expect(hits(p.displayed, 'move1'), p.displayed).toEqual([]);
			}
		});
	}
});
```

- [ ] **Step 2: 실행**

Run: `npx vitest run src/lib/matchstickVariants.test.ts`
Expected: PASS(3 tests)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/matchstickVariants.test.ts
git commit -m "test(성냥개비): 새 규칙 문제의 정답 하나를 TS 엔진으로 재검증"
```

### Task 4: 규칙별 힌트 `ruleHints`

**Files:**
- Modify: `src/lib/matchstick.ts` (`moveHints` 아래)
- Test: `src/lib/matchstick.test.ts`

- [ ] **Step 1: 실패하는 테스트**

```ts
describe('ruleHints', () => {
	it('1개 옮기기는 moveHints와 같다', () => {
		const p = { displayed: '0 + 0 = 8', solution: '8 - 0 = 8' };
		expect(ruleHints(p, 'move1')).toEqual(moveHints(p));
	});
	it('빼기는 빼는 곳 하나, 더하기는 꽂는 곳 하나', () => {
		expect(ruleHints({ displayed: '9 - 1 = 9', solution: '9 - 1 = 8' }, 'add1')).toEqual(['성냥을 꽂는 곳: = 뒤 숫자 「9」']);
	});
	it('2개 옮기기는 빼는 곳 둘 → 꽂는 곳 둘', () => {
		const p = (V as any).move2[0];
		const h = ruleHints(p, 'move2');
		expect(h).toHaveLength(2);
		expect(h[0]).toMatch(/^성냥을 빼는 곳: /);
		expect(h[1]).toMatch(/^꽂는 곳: /);
		expect(h.join(' ')).not.toMatch(/undefined/);
	});
});
```

(파일 맨 위에 `import V from './data/matchstick-variants.json';` 추가)

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/lib/matchstick.test.ts` · Expected: FAIL `ruleHints is not a function`

- [ ] **Step 3: 구현** — `moveHints` 안의 `where`를 밖으로 빼서 함께 쓴다.

```ts
/** 판 위 자리 이름 — moveHints·ruleHints가 쓴다 */
function spotName(o: Board, gi: number): string {
	const d = digitsOf(o);
	if (gi === 0) return `맨 앞 숫자 「${d[0]}」`;
	if (gi === 1) return `기호 뒤 숫자 「${d[1]}」`;
	if (o.cLen === 1) return `= 뒤 숫자 「${d[2]}」`;
	return `= 뒤 「${d[2]}${d[3]}」의 ${gi === 2 ? '앞자리' : '뒷자리'} 「${d[gi]}」`;
}

/** 뺀 자리·꽂은 자리 이름 목록(성냥 하나당 하나, 같은 칸에서 둘이면 두 번) */
function spots(p: MatchProblem): { from: string[]; to: string[] } {
	const o = parseEq(p.displayed);
	const s = parseEq(p.solution);
	const op = `기호 「${o.opPlus ? '+' : '−'}」`;
	const from: string[] = [];
	const to: string[] = [];
	o.glyphs.forEach((m, i) => {
		for (let k = 0; k < popcount(m & ~s.glyphs[i]); k++) from.push(spotName(o, i));
		for (let k = 0; k < popcount(s.glyphs[i] & ~m); k++) to.push(spotName(o, i));
	});
	if (o.opPlus && !s.opPlus) from.push(op);
	if (!o.opPlus && s.opPlus) to.push(op);
	return { from, to };
}

/** 단계 모드 힌트. move1은 moveHints 그대로, 빼기·더하기는 한 줄, 2개 옮기기는 빼는 곳 → 꽂는 곳 */
export function ruleHints(p: MatchProblem, rule: MatchRule): string[] {
	if (rule === 'move1') return moveHints(p);
	const { from, to } = spots(p);
	if (rule === 'remove1') return [`성냥을 빼는 곳: ${from[0]}`];
	if (rule === 'add1') return [`성냥을 꽂는 곳: ${to[0]}`];
	return [`성냥을 빼는 곳: ${from.join(', ')}`, `꽂는 곳: ${to.join(', ')}`];
}
```

그리고 `moveHints` 본문의 `where`를 `spotName(o, …)`로 바꾼다(문구는 그대로 — 기존 moveHints 테스트가 지킨다).

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/lib/matchstick.test.ts` · Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/matchstick.ts src/lib/matchstick.test.ts
git commit -m "feat(성냥개비): 규칙별 힌트 ruleHints"
```

### Task 5: 단계 구성·별·저장 `matchStages.ts`

**Files:**
- Create: `src/lib/matchStages.ts`
- Test: `src/lib/matchStages.test.ts`

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, it, expect } from 'vitest';
import { STAGES, STAGE_SIZE, starsFor, isUnlocked, nextStage, RULE_LABEL } from './matchStages';

describe('matchStages', () => {
	it('60단계 × 5문제, 문제가 겹치지 않는다', () => {
		expect(STAGES).toHaveLength(60);
		for (const s of STAGES) expect(s).toHaveLength(STAGE_SIZE);
		const keys = STAGES.flat().map((p) => `${p.rule}|${p.displayed}`);
		expect(new Set(keys).size).toBe(keys.length);
	});
	it('구성 — 1단계 쉬운 옮기기, 21단계 빼기, 25단계 더하기, 39단계부터 2개 옮기기', () => {
		expect(STAGES[0].every((p) => p.rule === 'move1')).toBe(true);
		expect(STAGES[20].every((p) => p.rule === 'remove1')).toBe(true);
		expect(STAGES[24].every((p) => p.rule === 'add1')).toBe(true);
		expect(STAGES[38].every((p) => p.rule === 'move2')).toBe(true);
		expect(STAGES[59].every((p) => p.rule === 'move2')).toBe(true);
	});
	it('구성은 고정이다 — 배포 후 바뀌면 기기에 저장된 진행이 다른 문제를 가리킨다', () => {
		expect(STAGES[0][0].displayed).toBe(STAGES[0][0].displayed); // 아래 줄은 Task 5 Step 4에서 실제 값으로 박는다
	});
	it('별', () => {
		expect(starsFor(['clean', 'clean', 'clean', 'clean', 'clean'])).toBe(3);
		expect(starsFor(['clean', 'hinted', 'clean', 'clean', 'clean'])).toBe(2);
		expect(starsFor(['clean', 'revealed', 'clean', 'hinted', 'revealed'])).toBe(1);
		expect(starsFor(['revealed', 'revealed', 'revealed', 'clean', 'clean'])).toBe(0);
	});
	it('해금과 이어하기', () => {
		expect(isUnlocked({}, 1)).toBe(true);
		expect(isUnlocked({}, 2)).toBe(false);
		expect(isUnlocked({ 1: 1 }, 2)).toBe(true);
		expect(nextStage({})).toBe(1);
		expect(nextStage({ 1: 3, 2: 1 })).toBe(3);
		expect(nextStage(Object.fromEntries(STAGES.map((_, i) => [i + 1, 3])))).toBe(60);
	});
	it('규칙 이름', () => {
		expect(RULE_LABEL.move2).toBe('성냥 2개 옮기기');
	});
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/lib/matchStages.test.ts` · Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```ts
/**
 * 성냥개비 단계 도전(2026-10-14) — 60단계 × 5문제.
 *
 * 성냥개비는 검색 입구 1위인데(9/16~10/13 랜딩 245세션) 들어온 사람이 무한 연습 몇 개 풀고
 * 끝났다. 「몇 단계까지 깼다」는 목표와 진행도로 다시 올 이유를 만든다.
 *
 * 구성은 고정이다. 기기에 「12단계 ★2」로 저장되므로 배포 뒤에 순서가 바뀌면 진행이 다른
 * 문제를 가리킨다 — matchStages.test.ts가 첫 문제를 박아 둔다. 바꿔야 하면 저장 키를 새로 판다.
 */
import problems from './data/matchstick-problems.json';
import variants from './data/matchstick-variants.json';
import { seededOrder } from './game';
import { levelOf } from './matchstickLevels';
import type { MatchProblem, MatchRule } from './matchstick';

export interface StageProblem extends MatchProblem {
	rule: MatchRule;
}

export const STAGE_SIZE = 5;

export const RULE_LABEL: Record<MatchRule, string> = {
	move1: '성냥 1개 옮기기',
	move2: '성냥 2개 옮기기',
	remove1: '성냥 1개 빼기',
	add1: '성냥 1개 더하기'
};

const BANK = problems as MatchProblem[];
const V = variants as Record<'move2' | 'remove1' | 'add1', MatchProblem[]>;
const byLevel = (lv: 'easy' | 'hard' | null) => BANK.filter((p) => levelOf(p.displayed, p.solution) === lv);

/** [단계 수, 규칙, 문제 풀, 섞는 씨앗] — 위에서부터 차례로 쌓는다 */
const PARTS: [number, MatchRule, MatchProblem[], number][] = [
	[10, 'move1', byLevel('easy'), 1401],
	[10, 'move1', byLevel(null), 1402],
	[4, 'remove1', V.remove1, 1403],
	[4, 'add1', V.add1, 1404],
	[10, 'move1', byLevel('hard'), 1405],
	[22, 'move2', V.move2, 1406]
];

export const STAGES: StageProblem[][] = PARTS.flatMap(([n, rule, pool, seed]) => {
	const order = seededOrder(pool.length, seed).slice(0, n * STAGE_SIZE);
	return Array.from({ length: n }, (_, s) =>
		order.slice(s * STAGE_SIZE, (s + 1) * STAGE_SIZE).map((i) => ({ ...pool[i], rule }))
	);
});

export type StageResult = 'clean' | 'hinted' | 'revealed';

/** ★3 전부 깨끗이 · ★2 전부 풀기(힌트 허용) · ★1 셋 이상 · 0 실패 */
export function starsFor(rs: StageResult[]): 0 | 1 | 2 | 3 {
	const solved = rs.filter((r) => r !== 'revealed').length;
	if (solved === rs.length && rs.every((r) => r === 'clean')) return 3;
	if (solved === rs.length) return 2;
	if (solved >= 3) return 1;
	return 0;
}

/** 단계 번호(1부터) → 최고 별 */
export type StageProgress = Record<number, number>;

export const isUnlocked = (p: StageProgress, no: number) => no === 1 || (p[no - 1] ?? 0) >= 1;

/** 이어할 단계 — 아직 못 깬 첫 단계, 다 깼으면 마지막 단계 */
export function nextStage(p: StageProgress): number {
	for (let no = 1; no <= STAGES.length; no++) if (!((p[no] ?? 0) >= 1)) return no;
	return STAGES.length;
}

const KEY = 'ddal.match.stages';

export function loadStages(): StageProgress {
	try {
		return JSON.parse(localStorage.getItem(KEY) || '{}');
	} catch {
		return {};
	}
}

export function saveStages(p: StageProgress): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(p));
	} catch {
		/* 사생활 보호 창 등 — 진행이 안 남을 뿐 놀이는 막지 않는다 */
	}
}
```

- [ ] **Step 4: 고정 테스트를 실제 값으로 박기**

Run: `npx vitest run src/lib/matchStages.test.ts` 후, 콘솔이나 `node -e`로 `STAGES[0][0].displayed`·`STAGES[38][0].displayed` 값을 읽어 Step 1의 「구성은 고정이다」 테스트를 다음처럼 바꾼다(값은 읽은 그대로):

```ts
	it('구성은 고정이다 — 배포 후 바뀌면 기기에 저장된 진행이 다른 문제를 가리킨다', () => {
		expect(STAGES[0][0].displayed).toBe('<읽은 값>');
		expect(STAGES[38][0].displayed).toBe('<읽은 값>');
	});
```

- [ ] **Step 5: 통과 확인** — Run: `npx vitest run src/lib/matchStages.test.ts` · Expected: PASS(6 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/matchStages.ts src/lib/matchStages.test.ts
git commit -m "feat(성냥개비): 단계 구성·별·진행 저장 matchStages"
```

### Task 6: 화면 — `stage` 모드 놀이

**Files:**
- Modify: `src/routes/matchstick/+page.svelte`

- [ ] **Step 1: 현재 문제를 한 변수로 모은다**

`pIdx`를 쓰는 세 곳(보드 `label`, 힌트 `moveHints(problems[pIdx])`, `reveal`의 `problems[pIdx].solution`)을 `prob`로 바꾼다.

```ts
	import { judgeRule, ruleHints } from '$lib/matchstick';
	import { STAGES, RULE_LABEL, starsFor, isUnlocked, nextStage, loadStages, saveStages, type StageProblem, type StageProgress, type StageResult } from '$lib/matchStages';

	type Mode =
		| { type: 'free' }
		| { type: 'time'; seconds: number }
		| { type: 'count'; total: number }
		| { type: 'today' }
		| { type: 'stage'; no: number };

	/** 지금 판의 문제. 은행 문제는 move1, 단계 문제는 자기 규칙을 갖는다 */
	let prob = $state<StageProblem>({ displayed: '', solution: '', rule: 'move1' });
	let stageProgress = $state<StageProgress>({});
	let stageIdx = $state(0);
	let stageResults = $state<StageResult[]>([]);
```

`nextProblem` 끝에서 `pIdx = idx;` 다음 줄에 `prob = { ...problems[idx], rule: 'move1' };`, `orig = parseEq(prob.displayed);`로 바꾼다. 단계 모드는 맨 앞에서 갈라진다.

```ts
	function nextProblem(first = false) {
		if (mode.type === 'stage') {
			prob = STAGES[mode.no - 1][stageIdx];
			pIdx = -1;
			orig = parseEq(prob.displayed);
			cur = cloneBoard(orig);
			picked = null;
			attempts = 0;
			solvedThis = 'no';
			hintStep = 0;
			feedback = '';
			animFrom = null;
			return;
		}
		// …기존 본문 그대로…
	}
```

- [ ] **Step 2: 규칙별 조작**

`handleStick`의 앞부분을 규칙별로 가른다. 빼기·더하기는 손에 들지 않고 바로 반영 후 판정, 옮기기는 지금처럼 집고 놓은 뒤 판정한다.

```ts
	function handleStick(loc: PickLoc, lit: boolean) {
		if (screen !== 'play' || solvedThis !== 'no' || !cur || !orig) return;

		if (prob.rule === 'remove1') {
			if (!lit) return;
			applyRemove(loc);
			return judge();
		}
		if (prob.rule === 'add1') {
			if (lit) return;
			applyAdd(loc);
			return judge();
		}
		if (!picked) {
			if (!lit) return;
			picked = loc;
			applyRemove(loc);
			return;
		}
		if (!lit && sameLoc(picked, loc)) {
			applyAdd(loc);
			picked = null;
			return;
		}
		if (lit) return;
		applyAdd(loc);
		picked = null;
		judge();
	}

	function judge() {
		const r = judgeRule(orig!, cur!, prob.rule);
		if (r === 'more') {
			feedback = '하나 더 옮겨요';
			return;
		}
		if (r === 'solved') return win();
		attempts++;
		feedback = '아직 아니에요!';
		shaking = true;
		setTimeout(() => {
			shaking = false;
			revert();
		}, 420);
	}
```

기존 `if (isSolved(orig, cur)) { … }` 블록 본문을 `function win() { … }`로 옮기고, 그 안에 단계 분기를 더한다.

```ts
	function win() {
		solvedThis = 'won';
		stats.solved++;
		stats.streak++;
		if (stats.streak > stats.best) stats.best = stats.streak;
		if (mode.type !== 'stage') markDone();
		persist();
		if (mode.type === 'stage') {
			stageResults = [...stageResults, hintStep > 0 ? 'hinted' : 'clean'];
			feedback = attempts === 0 ? '딸깍! 한 번에 맞혔어요' : `딸깍! ${attempts + 1}번 만에 맞혔어요`;
			return;
		}
		// …기존 today/free/time/count 분기 그대로…
	}
```

`reveal()`은 `cur = parseEq(prob.solution);`, `feedback = \`정답: ${prob.solution.replace('-', '−')}\`;`로 바꾸고, 단계 모드면 `markDone()` 대신 `stageResults = [...stageResults, 'revealed'];`.

`showHint()`의 상한 `2`를 `ruleHints(prob, prob.rule).length`로 바꾸고, 템플릿의 `moveHints(problems[pIdx])`를 `ruleHints(prob, prob.rule)`로, 힌트 버튼 조건 `hintStep < 2`도 같은 길이로 바꾼다.

- [ ] **Step 3: 단계 시작·다음·끝**

```ts
	function startStage(no: number) {
		if (!isUnlocked(stageProgress, no)) return;
		stageIdx = 0;
		stageResults = [];
		track('match_stage_start', { stage: no });
		startMode({ type: 'stage', no });
	}

	function nextInStage() {
		if (mode.type !== 'stage') return;
		if (stageIdx + 1 < STAGES[mode.no - 1].length) {
			stageIdx++;
			nextProblem();
			return;
		}
		const stars = starsFor(stageResults);
		if (stars > (stageProgress[mode.no] ?? 0)) {
			stageProgress = { ...stageProgress, [mode.no]: stars };
			saveStages(stageProgress);
		}
		track(stars ? 'match_stage_clear' : 'match_stage_fail', { stage: mode.no, stars });
		screen = 'result';
	}
```

`onMount`의 `load()` 다음에 `stageProgress = loadStages();`를 더한다.

- [ ] **Step 4: 놀이 화면 템플릿**

topbar의 분기에 단계 모드를 더한다(규칙이 단계마다 달라지므로 늘 보여 준다).

```svelte
		{:else if mode.type === 'stage'}
			<div class="run-score">{mode.no}단계 · {stageIdx + 1} / {STAGES[mode.no - 1].length}</div>
			<div class="rule">{RULE_LABEL[prob.rule]}</div>
```

풀린 뒤(`solvedThis !== 'no'`) 버튼 분기에 단계 모드를 더한다.

```svelte
		{:else if mode.type === 'stage'}
			<button class="btn wide" onclick={nextInStage}>
				{stageIdx + 1 < STAGES[mode.no - 1].length ? '다음 문제 →' : '단계 결과 보기 →'}
			</button>
```

정답 보기 뒤에도 같은 버튼이 보여야 한다 — `reveal()`은 단계 모드에서 자동으로 넘기지 않는다.

- [ ] **Step 5: 확인** — Run: `npx vitest run` · `npm run build` · Expected: 모두 PASS / 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/routes/matchstick/+page.svelte
git commit -m "feat(성냥개비): 단계 모드 놀이 — 규칙별 조작·판정·힌트"
```

### Task 7: 화면 — 메뉴 「단계 도전」과 결과

**Files:**
- Modify: `src/routes/matchstick/+page.svelte`

- [ ] **Step 1: 메뉴 섹션** — 오늘의 성냥개비 카드 다음, 가이드 배너 앞에 둔다.

```svelte
		<section class="msec stages">
			<h2 class="mh">단계 도전</h2>
			<p class="mp">60단계. 뒤로 갈수록 성냥 2개 옮기기·빼기·더하기 문제가 나와요.</p>
			<button class="big" onclick={() => startStage(nextStage(stageProgress))}>
				{nextStage(stageProgress)}단계 {Object.keys(stageProgress).length ? '이어하기' : '시작하기'}
				<span class="arr" aria-hidden="true">→</span>
			</button>
			<div class="sgrid">
				{#each STAGES as _, i (i)}
					{@const no = i + 1}
					{@const st = stageProgress[no] ?? 0}
					<button class="stile" class:cleared={st > 0} disabled={!isUnlocked(stageProgress, no)} onclick={() => startStage(no)} aria-label="{no}단계 {st ? `별 ${st}개` : ''}">
						<b>{no}</b><span>{st ? '★'.repeat(st) : ''}</span>
					</button>
				{/each}
			</div>
		</section>
```

```css
	.sgrid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
		margin-top: 12px;
	}
	.stile {
		min-height: 48px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--panel);
		color: var(--text);
		font-family: inherit;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		cursor: pointer;
	}
	.stile b {
		font-size: 14px;
		font-weight: 800;
	}
	.stile span {
		font-size: 10px;
		color: var(--accent-text);
		min-height: 12px;
	}
	.stile.cleared {
		border-color: var(--accent);
	}
	.stile:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.rule {
		font-size: 13px;
		font-weight: 800;
		color: var(--accent-text);
	}
```

- [ ] **Step 2: 결과 화면** — `{:else}` 결과 카드 맨 앞에 단계 분기.

```svelte
	{#if mode.type === 'stage'}
		{@const stars = starsFor(stageResults)}
		<div class="card result">
			<h2>{mode.no}단계 {stars ? '통과!' : '아쉬워요'}</h2>
			<div class="big-score">{stars ? '★'.repeat(stars) : '☆'}</div>
			<div class="emoji-row">{stageResults.map((r) => (r === 'clean' ? '🟩' : r === 'hinted' ? '🟨' : '⬜')).join(' ')}</div>
			{#if stars && mode.no < STAGES.length}
				<button class="btn wide" onclick={() => startStage(mode.no + 1)}>{mode.no + 1}단계로 →</button>
			{/if}
			<button class="btn ghost wide" onclick={() => startStage(mode.no)}>이 단계 다시 하기</button>
			<button class="btn ghost wide" onclick={toMenu}>모드 선택으로</button>
		</div>
	{:else}
		<!-- 기존 결과 카드 -->
	{/if}
```

- [ ] **Step 3: 확인** — Run: `npx vitest run` · `npm run build` · `npx svelte-check` 오류 수가 22개(기존)에서 늘지 않는지

- [ ] **Step 4: 커밋**

```bash
git add src/routes/matchstick/+page.svelte
git commit -m "feat(성냥개비): 메뉴 단계 도전 판과 단계 결과 화면"
```

### Task 8: 계측·기록·배포

**Files:**
- Modify: `scripts/ga-yesterday.py` (NEW 목록의 성냥개비 줄 뒤)
- Modify: `promo/지표-기록.md`

- [ ] **Step 1: 보고 줄**

```python
    ("match_stage_start", "성냥 단계 도전 시작"),
    ("match_stage_clear", "성냥 단계 통과"),
    ("match_stage_fail", "성냥 단계 실패"),
```

- [ ] **Step 2: 지표 기록** — 「## 재방문·활성 — 성냥개비 단계 도전 (2026-10-14)」 절: 근거(랜딩 245세션), 구성, 판정(11/4쯤: 단계별 시작·통과 수, 성냥개비 랜딩 재방문율 9/16~10/13 대비).

- [ ] **Step 3: 전체 검증** — `rtk proxy npx vitest run` (exit 0) · `rtk proxy npm run build` (exit 0)

- [ ] **Step 4: 커밋·푸시(main 푸시 = Cloudflare Pages 자동 배포) 후 운영 번들에 `match_stage_start`가 들어갔는지 확인**

```bash
git add scripts/ga-yesterday.py promo/지표-기록.md
git commit -m "chore(성냥개비): 단계 도전 계측 보고·지표 기록"
git push origin main
```

---

## 자체 점검

- 결정 사항의 모든 행이 Task에 대응한다: 단계 수·구성(Task 5), 별·해금·저장(Task 5), 조작(Task 6), 메뉴·결과(Task 7), 문제 출처(Task 1·3), 판정(Task 8). 검색 본문은 Task 7이 새 섹션만 더하고 기존 글을 건드리지 않는다.
- 이름 일관성: `judgeRule`·`RULE_DIFF`·`ruleHints`·`STAGES`·`starsFor`·`isUnlocked`·`nextStage`·`loadStages`·`saveStages`·`RULE_LABEL`.
- Task 5 Step 4의 고정 값은 실행 결과를 읽어 박는 단계라 계획에 값을 미리 적지 않았다.
