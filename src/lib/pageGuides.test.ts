import { describe, it, expect } from 'vitest';
import { CHOSUNG_CATEGORIES } from './data/chosung';
import { chosungOf } from './chosung';
import { MATCH_KINDS, kindOf } from './matchstickKinds';
import { MATCH_LEVELS, levelOf } from './matchstickLevels';
import { parseEq, isSolved } from './matchstick';
import PROBLEMS from './data/matchstick-problems.json';

/**
 * 초성 분야·성냥개비 유형 페이지의 두 번째 글(guide·extra)에 적은 수치를 실제 데이터와
 * 맞춰 본다. 9/30에 「같은 틀에 낱말만 바뀐 페이지」로 보이지 않게 분야마다 세어 본 사실로
 * 글을 채웠다 — 숫자가 틀리면 그 글은 없는 게 낫다. 낱말·문제가 늘어 어긋나면 여기서 깨진다.
 */
const words = (slug: string) => CHOSUNG_CATEGORIES.find((c) => c.slug === slug)!.words.map((w) => w[0]);
const ending = (slug: string, tail: string) => words(slug).filter((w) => w.endsWith(tail));
const byLen = (slug: string, n: number) => words(slug).filter((w) => w.length === n);

describe('초성 분야 두 번째 글의 수치', () => {
	it('동물: 「리」 9 · 「이」 7 · 「어」 6 · 「새」 2 · 글자 수 39/39/5', () => {
		expect(words('animal').length).toBe(83);
		expect(ending('animal', '리').length).toBe(9);
		expect(ending('animal', '이').length).toBe(7);
		expect(ending('animal', '어').sort()).toEqual(['악어', '오징어', '문어', '상어', '금붕어', '고등어'].sort());
		expect(ending('animal', '새')).toEqual(['앵무새', '참새']);
		expect([2, 3, 4].map((n) => byLen('animal', n).length)).toEqual([39, 39, 5]);
		expect(byLen('animal', 4).sort()).toEqual(['고슴도치', '불가사리', '반딧불이', '카멜레온', '하이에나'].sort());
		expect(chosungOf('독수리')).toBe('ㄷㅅㄹ');
		expect(chosungOf('부엉이')).toBe('ㅂㅇㅇ');
	});

	it('음식: 꼬리 찌개 4 · 밥 5 · 탕 4(솜사탕 뺌) · 면 5 · 국수 3 · 국 3 = 24, 세 글자 41, 두 글자 28, 다섯 글자 4', () => {
		expect(words('food').length).toBe(83);
		const tails = ['찌개', '밥', '탕', '면', '국수', '국'].map((t) => ending('food', t).filter((w) => w !== '솜사탕').length);
		expect(tails).toEqual([4, 5, 4, 5, 3, 3]);
		expect(tails.reduce((a, b) => a + b)).toBe(24);
		expect(byLen('food', 3).length).toBe(41);
		expect(byLen('food', 2).length).toBe(28);
		expect(chosungOf('칼국수')).toBe(chosungOf('콩국수'));
		expect(byLen('food', 5).sort()).toEqual(['순두부찌개', '아이스크림', '오므라이스', '바나나우유'].sort());
		expect(chosungOf('순두부찌개')).toBe('ㅅㄷㅂㅉㄱ');
		expect(chosungOf('김치찌개')).toBe('ㄱㅊㅉㄱ');
	});

	it('과일·채소: 두 글자 42 · 네 글자 5 · 과일 34 + 토마토 · 방울토마토 + 채소 34 · 「추」 7', () => {
		const ws = words('fruit-vegetable');
		expect(ws.length).toBe(70);
		expect(byLen('fruit-vegetable', 2).length).toBe(42);
		expect(ending('fruit-vegetable', '추').length).toBe(7);
		expect(byLen('fruit-vegetable', 4).sort()).toEqual(['파인애플', '블루베리', '브로콜리', '파프리카', '아보카도'].sort());
		// 첫 묶음은 과일 20 → 토마토 → 채소 21, 10/15 묶음은 과일 10 → 채소 10 순서로 적혀 있다
		expect(ws.indexOf('토마토')).toBe(20);
		expect(ws.slice(0, 20)).toContain('코코넛');
		expect(ws.slice(21, 42).length).toBe(21);
		expect(ws.slice(42, 52)).toContain('리치');
		expect(ws.slice(52, 62)).toContain('양상추');
		// 10/23 묶음은 감귤(과일) → 방울토마토(헷갈리는 쪽) → 단호박(채소)
		expect(ws.slice(62, 65)).toEqual(['감귤', '방울토마토', '단호박']);
		// 10/26 묶음은 청포도(과일), 10/27 묶음은 완두콩(채소), 10/28 묶음은 샤인머스캣(과일), 10/29 묶음은 자몽(과일), 10/30 묶음은 땅콩(채소)
		expect(ws.slice(65)).toEqual(['청포도', '완두콩', '샤인머스캣', '자몽', '땅콩']);
		expect(ws.slice(0, 20).length + ws.slice(42, 52).length + 1 + 1 + 1 + 1).toBe(34);
		expect(ws.slice(21, 42).length + ws.slice(52, 62).length + 1 + 1 + 1).toBe(34);
		expect(byLen('animal', 2).length).toBe(39);
	});

	it('나라: 「아」 12 · 「국」 6 · 「드」 6 · 「아」 중 세 글자는 러시아뿐', () => {
		expect(words('country').length).toBe(63);
		const a = ending('country', '아');
		expect(a.length).toBe(12);
		expect(a.filter((w) => w.length <= 4 - 1)).toEqual(['러시아']);
		expect(ending('country', '국').length).toBe(6);
		expect(ending('country', '드').length).toBe(6);
		expect(words('country').filter((w) => chosungOf(w)[0] === 'ㅇ').length).toBe(14);
		expect(chosungOf('핀란드')).toBe(chosungOf('폴란드'));
	});

	it('사자성어: 첫 초성 ㅇ 19 · 되풀이 짝 · 첫 글자 묶음', () => {
		const ws = words('idiom');
		expect(ws.filter((w) => chosungOf(w)[0] === 'ㅇ').length).toBe(19);
		for (const w of ['우왕좌왕', '이심전심', '설상가상', '애지중지']) expect(w[1], w).toBe(w[3]);
		for (const w of ['막상막하', '백발백중', '동고동락', '자업자득', '반신반의', '자화자찬']) expect(w[0], w).toBe(w[2]);
		for (const w of ['시시비비', '전전긍긍', '유유상종']) expect(w[0], w).toBe(w[1]);
		for (const w of ['일석이조', '일취월장', '일거양득', '일편단심', '동문서답', '동고동락', '동병상련', '우왕좌왕', '우유부단', '이심전심', '이구동성', '십중팔구', '사면초가'])
			expect(ws, w).toContain(w);
	});
});

const P = PROBLEMS as { displayed: string; solution: string }[];
const glyphDigits = (s: string) => s.replace(/[^0-9]/g, '').split('');
const bits = (x: number) => x.toString(2).split('1').length - 1;

describe('성냥개비 두 번째 글의 수치', () => {
	it('한 숫자 안: 293문제, 3→2·9→0 36번, 6→9 21번, 왼쪽 190 · 답 103', () => {
		const self = P.filter((p) => kindOf(p.displayed, p.solution) === 'self');
		expect(self.length).toBe(293);
		const t: Record<string, number> = {};
		let left = 0;
		for (const p of self) {
			const a = parseEq(p.displayed);
			const b = parseEq(p.solution);
			const i = a.glyphs.findIndex((g, j) => g !== b.glyphs[j]);
			const k = `${glyphDigits(p.displayed)[i]}→${glyphDigits(p.solution)[i]}`;
			t[k] = (t[k] ?? 0) + 1;
			const ansLen = p.displayed.split('=')[1].replace(/[^0-9]/g, '').length;
			if (i < a.glyphs.length - ansLen) left++;
		}
		expect(t['3→2']).toBe(36);
		expect(t['9→0']).toBe(36);
		expect(t['6→9']).toBe(21);
		expect(Math.min(...Object.values(t))).toBe(21);
		expect(left).toBe(190);
	});

	it('숫자끼리: 237문제, 8이 내주는 경우 106, 7→1 43, 3→9 46, 답이 끼는 171(98+73)', () => {
		const tr = P.filter((p) => kindOf(p.displayed, p.solution) === 'transfer');
		expect(tr.length).toBe(237);
		const give: Record<string, number> = {};
		const take: Record<string, number> = {};
		const flow = { ansToLeft: 0, leftToAns: 0, leftLeft: 0 };
		for (const p of tr) {
			const a = parseEq(p.displayed);
			const b = parseEq(p.solution);
			const da = glyphDigits(p.displayed);
			const db = glyphDigits(p.solution);
			const ch = a.glyphs.map((g, i) => (g !== b.glyphs[i] ? i : -1)).filter((i) => i >= 0);
			const g = ch.find((i) => bits(a.glyphs[i]) > bits(b.glyphs[i]))!;
			const r = ch.find((i) => bits(a.glyphs[i]) < bits(b.glyphs[i]))!;
			give[`${da[g]}→${db[g]}`] = (give[`${da[g]}→${db[g]}`] ?? 0) + 1;
			take[`${da[r]}→${db[r]}`] = (take[`${da[r]}→${db[r]}`] ?? 0) + 1;
			const ansStart = a.glyphs.length - p.displayed.split('=')[1].replace(/[^0-9]/g, '').length;
			if (g >= ansStart) flow.ansToLeft++;
			else if (r >= ansStart) flow.leftToAns++;
			else flow.leftLeft++;
		}
		expect((give['8→0'] ?? 0) + (give['8→6'] ?? 0) + (give['8→9'] ?? 0)).toBe(106);
		expect(give['7→1']).toBe(43);
		expect(take['3→9']).toBe(46);
		expect(take['1→7']).toBe(38);
		expect(take['5→9']).toBe(38);
		expect(flow).toEqual({ ansToLeft: 98, leftToAns: 73, leftLeft: 66 });
	});

	it('연산자: 211문제, −→+ 152 · +→− 59, 8이 내주는 경우 71', () => {
		const op = P.filter((p) => kindOf(p.displayed, p.solution) === 'operator');
		expect(op.length).toBe(211);
		expect(op.filter((p) => !parseEq(p.displayed).opPlus).length).toBe(152);
		let eight = 0;
		for (const p of op) {
			const da = glyphDigits(p.displayed);
			const db = glyphDigits(p.solution);
			da.forEach((d, i) => {
				if (d === '8' && db[i] !== '8') eight++;
			});
		}
		expect(eight).toBe(71);
	});

	it('어려운 문제: 답은 전부 10~19, 17·18·19가 90개(절반 넘음)', () => {
		const hard = P.filter((p) => levelOf(p.displayed, p.solution) === 'hard');
		const ans = hard.map((p) => Number(p.displayed.split('=')[1]));
		expect(ans.every((n) => n >= 10 && n <= 19)).toBe(true);
		expect(ans.filter((n) => n === 18).length).toBe(40);
		expect(ans.filter((n) => n === 19).length).toBe(30);
		expect(ans.filter((n) => n === 17).length).toBe(20);
	});

	it('풀이 과정에 쓴 두 문제는 데이터에 있고, 그 풀이가 맞고, 대표 문제와 겹치지 않는다', () => {
		for (const [eq, sol, level] of [
			['8 - 2 = 5', '8 - 3 = 5', 'easy'],
			['6 + 5 = 16', '6 + 9 = 15', 'hard']
		] as const) {
			const found = P.find((p) => p.displayed === eq);
			expect(found?.solution, eq).toBe(sol);
			expect(isSolved(parseEq(eq), parseEq(sol))).toBe(true);
			expect(levelOf(eq, sol)).toBe(level);
			const meta = MATCH_LEVELS.find((l) => l.level === level)!;
			expect(meta.featured.map((f) => f.displayed)).not.toContain(eq);
		}
	});

	it('다섯 페이지의 두 번째 글 제목이 모두 다르다', () => {
		const titles = [...MATCH_KINDS, ...MATCH_LEVELS].map((k) => k.extra.title);
		expect(new Set(titles).size).toBe(titles.length);
		const ct = CHOSUNG_CATEGORIES.map((c) => c.guide.title);
		expect(new Set(ct).size).toBe(ct.length);
	});
});

// 위 검사는 데이터만 센다. 글이 그 숫자를 실제로 말하고 있는지도 묶어 둔다 —
// 데이터가 바뀌어 위를 고칠 때 글을 같이 고치게 하려는 것이다
describe('글이 위 수치를 그대로 적고 있다', () => {
	const guide = (slug: string) => CHOSUNG_CATEGORIES.find((c) => c.slug === slug)!.guide.body;
	const extra = (slug: string) => [...MATCH_KINDS, ...MATCH_LEVELS].find((k) => k.slug === slug)!.extra.body;
	it.each([
		[guide('animal'), ['83개 중 16개', '두 글자가 39개, 세 글자가 39개']],
		[guide('food'), ['스물네 개', '세 글자가 41개', '두 글자가 28개']],
		[guide('fruit-vegetable'), ['70개 중 42개', '83개 중 39개', '과일이 34개, 채소가 34개', '「추」가 일곱']],
		[guide('country'), ['「아」로 끝나는 나라가 열둘', '「국」이 여섯', '「드」가 여섯']],
		[guide('idiom'), ['ㅇ인 것이 19개']],
		[extra('self'), ['293문제', '36번씩', '21번', '190개', '103개']],
		[extra('transfer'), ['237문제', '106번', '43번', '46번', '38번씩', '171문제', '98번', '73번', '66번']],
		[extra('operator'), ['211문제 중 152문제', '59문제', '71번', '23번', '22번', '13번', '10번']],
		[extra('hard'), ['160문제', '10부터 19', '18이 40번, 19가 30번, 17이 20번']]
	])('%#', (text, phrases) => {
		for (const ph of phrases) expect(text, ph).toContain(ph);
	});
});
