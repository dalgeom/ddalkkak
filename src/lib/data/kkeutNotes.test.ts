import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeDict } from '$lib/kkeut';
import { KKEUT_NOTES } from './kkeutNotes';
import { KKEUT_PUZZLES } from './kkeutPuzzles';

const j = JSON.parse(readFileSync('static/kkeut/words.json', 'utf8'));
const d = makeDict(j.words, j.easy);
/** 「」 안에 든 한글 낱말(공백 없는 것)만 꺼낸다 */
const quoted = (t: string) => [...t.matchAll(/「([가-힣]+)」/g)].map((m) => m[1]);

describe('지난 끝말잇기 풀이 요령', () => {
	it('11/05~11/25 스물하루치가 모두 있고, 날짜는 퍼즐에 있는 날이다', () => {
		const dates = new Set(KKEUT_PUZZLES.map((p) => p.date));
		for (const k of Object.keys(KKEUT_NOTES)) expect(dates.has(k), k).toBe(true);
		for (const p of KKEUT_PUZZLES.filter((p) => p.date >= '2026-11-05' && p.date <= '2026-11-25'))
			expect(KKEUT_NOTES[p.date]?.length ?? 0, p.date).toBeGreaterThanOrEqual(400);
	});
	it('「」에 든 낱말은 사전에 있거나 그날 오간 말이다(없는 말을 예로 들지 않게)', () => {
		for (const p of KKEUT_PUZZLES) {
			const note = KKEUT_NOTES[p.date];
			if (!note) continue;
			const day = new Set([p.start, ...p.line]);
			for (const w of quoted(note)) expect(d.has.has(w) || day.has(w), `${p.date} 「${w}」`).toBe(true);
		}
	});
	it('낱말 검사가 살아 있다 — 사전에 없는 말을 「」에 넣으면 잡힌다', () => {
		expect(quoted('먼저 「달걀」, 그다음 「걀걀」')).toEqual(['달걀', '걀걀']);
		expect(d.has.has('달걀')).toBe(true);
		expect(d.has.has('걀걀')).toBe(false);
	});
});
