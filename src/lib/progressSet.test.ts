/**
 * 11/24 새 구성 — 옛 탭이 남긴 「안내 한 칸 1/1 완주」가 새 구성 진행으로 읽히지 않는가.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readDailyProgress, writeDailyProgress, NEW_SET_DAY } from './game';
import { mergeBackup, parseBackup } from './backup';

function mockStore(init: Record<string, string> = {}): Storage {
	const m = new Map(Object.entries(init));
	return {
		get length() {
			return m.size;
		},
		key: (i: number) => [...m.keys()][i] ?? null,
		getItem: (k: string) => m.get(k) ?? null,
		setItem: (k: string, v: string) => void m.set(k, String(v)),
		removeItem: (k: string) => void m.delete(k),
		clear: () => m.clear()
	};
}

const oldTabDone = JSON.stringify({ pos: 1, marks: ['clean'], done: true });

describe('진행 기록 set:2', () => {
	beforeEach(() => vi.stubGlobal('localStorage', mockStore()));
	afterEach(() => vi.unstubAllGlobals());

	it('새 구성 날의 set 없는 기록은 빈 것으로 읽는다', () => {
		localStorage.setItem(`ddal.day.${NEW_SET_DAY}`, oldTabDone);
		expect(readDailyProgress(NEW_SET_DAY)).toEqual({ pos: 0, marks: [], done: false });
	});
	it('20780(옛 구성)은 set 없이도 그대로 읽는다 (양성 대조)', () => {
		localStorage.setItem(`ddal.day.${NEW_SET_DAY - 1}`, oldTabDone);
		expect(readDailyProgress(NEW_SET_DAY - 1).done).toBe(true);
	});
	it('새 구성 날에 쓰면 set:2가 붙고 다시 읽힌다', () => {
		writeDailyProgress(NEW_SET_DAY, { pos: 3, marks: ['clean', 'miss', 'clean'], done: false });
		expect(JSON.parse(localStorage.getItem(`ddal.day.${NEW_SET_DAY}`)!).set).toBe(2);
		expect(readDailyProgress(NEW_SET_DAY).pos).toBe(3);
		writeDailyProgress(NEW_SET_DAY - 1, { pos: 1, marks: [], done: false });
		expect(JSON.parse(localStorage.getItem(`ddal.day.${NEW_SET_DAY - 1}`)!).set).toBeUndefined();
	});
});

describe('백업 병합 set:2', () => {
	const key = `ddal.day.${NEW_SET_DAY}`;
	const real = JSON.stringify({ pos: 2, marks: ['clean', 'clean'], done: false, set: 2 });
	const bk = (v: string, k = key) => parseBackup(JSON.stringify({ app: 'ddalkkak', data: { [k]: v } }))!;

	it('옛 탭 완주가 새 구성 진행을 덮지 않는다', () => {
		const s = mockStore({ [key]: real });
		mergeBackup(s, bk(oldTabDone));
		expect(s.getItem(key)).toBe(real);
	});
	it('저장소의 옛 탭 완주는 새 구성 진행으로 덮인다', () => {
		const s = mockStore({ [key]: oldTabDone });
		mergeBackup(s, bk(real));
		expect(s.getItem(key)).toBe(real);
	});
	it('20780은 예전 규칙 그대로 — 완주가 이긴다 (양성 대조)', () => {
		const k = `ddal.day.${NEW_SET_DAY - 1}`;
		const s = mockStore({ [k]: JSON.stringify({ pos: 2, marks: ['a', 'b'], done: false }) });
		mergeBackup(s, bk(oldTabDone, k));
		expect(s.getItem(k)).toBe(oldTabDone);
	});
});
