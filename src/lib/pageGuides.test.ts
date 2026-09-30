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
	it('동물: 「리」 8 · 「이」 6 · 「새」 2 · 「기」 2 · 글자 수 24/26/2', () => {
		expect(words('animal').length).toBe(52);
		expect(ending('animal', '리').length).toBe(8);
		expect(ending('animal', '이').length).toBe(6);
		expect(ending('animal', '새')).toEqual(['앵무새', '참새']);
		expect(ending('animal', '기')).toEqual(['비둘기', '메뚜기']);
		expect([2, 3, 4].map((n) => byLen('animal', n).length)).toEqual([24, 26, 2]);
		expect(chosungOf('독수리')).toBe('ㄷㅅㄹ');
		expect(chosungOf('부엉이')).toBe('ㅂㅇㅇ');
	});

	it('음식: 꼬리 찌개 4 · 밥 4 · 탕 3 · 면 3 · 국 2 = 16, 두 글자 21, 다섯 글자 3', () => {
		expect(words('food').length).toBe(48);
		const tails = ['찌개', '밥', '탕', '면', '국'].map((t) => ending('food', t).length);
		expect(tails).toEqual([4, 4, 3, 3, 2]);
		expect(tails.reduce((a, b) => a + b)).toBe(16);
		expect(byLen('food', 2).length).toBe(21);
		expect(byLen('food', 5).sort()).toEqual(['순두부찌개', '아이스크림', '오므라이스'].sort());
		expect(chosungOf('순두부찌개')).toBe('ㅅㄷㅂㅉㄱ');
		expect(chosungOf('김치찌개')).toBe('ㄱㅊㅉㄱ');
	});

	it('과일·채소: 두 글자 27 · 네 글자 5 · 과일 20 + 토마토 + 채소 21', () => {
		const ws = words('fruit-vegetable');
		expect(ws.length).toBe(42);
		expect(byLen('fruit-vegetable', 2).length).toBe(27);
		expect(byLen('fruit-vegetable', 4).sort()).toEqual(['파인애플', '블루베리', '브로콜리', '파프리카', '아보카도'].sort());
		// 목록은 과일 → 토마토 → 채소 순서로 적혀 있다
		expect(ws.indexOf('토마토')).toBe(20);
		expect(ws.slice(0, 20)).toContain('코코넛');
		expect(ws.slice(21).length).toBe(21);
		expect(byLen('animal', 2).length).toBe(24);
	});

	it('나라: 「아」 6 · 「국」 4 · 「드」 4 · 「아」 중 세 글자는 러시아뿐', () => {
		expect(words('country').length).toBe(42);
		const a = ending('country', '아');
		expect(a.length).toBe(6);
		expect(a.filter((w) => w.length <= 4 - 1)).toEqual(['러시아']);
		expect(ending('country', '국').length).toBe(4);
		expect(ending('country', '드').length).toBe(4);
		expect(chosungOf('핀란드')).toBe(chosungOf('폴란드'));
	});

	it('사자성어: 첫 초성 ㅇ 14 · 되풀이 짝 · 첫 글자 묶음', () => {
		const ws = words('idiom');
		expect(ws.filter((w) => chosungOf(w)[0] === 'ㅇ').length).toBe(14);
		for (const w of ['우왕좌왕', '이심전심', '설상가상']) expect(w[1], w).toBe(w[3]);
		for (const w of ['막상막하', '백발백중', '동고동락', '자업자득']) expect(w[0], w).toBe(w[2]);
		for (const w of ['일석이조', '일취월장', '일거양득', '동문서답', '동고동락', '우왕좌왕', '우유부단', '이심전심', '이구동성'])
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
		[guide('animal'), ['52개 중 14개', '두 글자가 24개, 세 글자가 26개']],
		[guide('food'), ['열여섯 개', '두 글자가 21개']],
		[guide('fruit-vegetable'), ['42개 중 27개', '52개 중 24개', '과일이 20개, 채소가 21개']],
		[guide('country'), ['「아」로 끝나는 나라가 여섯', '「국」이 넷', '「드」가 넷']],
		[guide('idiom'), ['ㅇ인 것이 14개']],
		[extra('self'), ['293문제', '36번씩', '21번', '190개', '103개']],
		[extra('transfer'), ['237문제', '106번', '43번', '46번', '38번씩', '171문제', '98번', '73번', '66번']],
		[extra('operator'), ['211문제 중 152문제', '59문제', '71번', '23번', '22번', '13번', '10번']],
		[extra('hard'), ['160문제', '10부터 19', '18이 40번, 19가 30번, 17이 20번']]
	])('%#', (text, phrases) => {
		for (const ph of phrases) expect(text, ph).toContain(ph);
	});
});
