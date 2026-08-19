import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, mergeBackup, isBackupKey } from './backup';

function mockStore(init: Record<string, string> = {}): Storage {
	const m = new Map(Object.entries(init));
	return {
		getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
		setItem: (k: string, v: string) => void m.set(k, String(v)),
		removeItem: (k: string) => void m.delete(k),
		clear: () => m.clear(),
		key: (i: number) => [...m.keys()][i] ?? null,
		get length() {
			return m.size;
		}
	} as Storage;
}

describe('기록 백업', () => {
	it('딸깍 키만 담는다', () => {
		expect(isBackupKey('ddal.stats')).toBe(true);
		expect(isBackupKey('i18nextLng')).toBe(false);
		const b = buildBackup(
			mockStore({ 'ddal.stats': '{"played":3}', 'ddal.day.20700': '{"pos":2,"marks":["clean"]}', other: 'x' }),
			'2026-08-19T00:00:00Z'
		);
		expect(Object.keys(b.data).sort()).toEqual(['ddal.day.20700', 'ddal.stats']);
	});

	it('남의 파일·깨진 파일은 거절한다', () => {
		expect(parseBackup('{}')).toBeNull();
		expect(parseBackup('not json')).toBeNull();
		expect(parseBackup(JSON.stringify({ app: 'other', data: { 'ddal.stats': '1' } }))).toBeNull();
		expect(parseBackup(JSON.stringify({ app: 'ddalkkak', data: { evil: 'x' } }))).toBeNull();
	});

	it('덮어쓰지 않고 병합한다 — 기기 B에서 오늘 푼 것이 지워지면 안 된다', () => {
		const store = mockStore({ 'ddal.day.20700': '{"pos":9,"marks":["a","b","c"],"done":false}' });
		const backup = parseBackup(
			JSON.stringify({
				app: 'ddalkkak',
				data: {
					'ddal.day.20700': '{"pos":1,"marks":["a"],"done":false}', // 더 적게 푼 쪽 — 무시돼야
					'ddal.day.20699': '{"pos":10,"marks":[],"done":true}' // 없던 날 — 들어와야
				}
			})
		)!;
		mergeBackup(store, backup);
		expect(JSON.parse(store.getItem('ddal.day.20700')!).marks.length).toBe(3);
		expect(store.getItem('ddal.day.20699')).toBeTruthy();
	});

	it('완주한 기록이 미완주로 덮이지 않는다', () => {
		const store = mockStore({ 'ddal.day.20700': '{"pos":10,"marks":[1,2,3,4,5,6,7,8,9,10],"done":true}' });
		mergeBackup(store, parseBackup(JSON.stringify({ app: 'ddalkkak', data: { 'ddal.day.20700': '{"pos":0,"marks":[],"done":false}' } }))!);
		expect(JSON.parse(store.getItem('ddal.day.20700')!).done).toBe(true);
	});

	it('내보낸 것을 그대로 가져오면 같은 상태가 된다', () => {
		const src = mockStore({ 'ddal.stats': '{"played":5,"dayStreak":3}', 'ddal.day.20700': '{"pos":10,"marks":[],"done":true}' });
		const text = JSON.stringify(buildBackup(src, '2026-08-19T00:00:00Z'));
		const dst = mockStore();
		mergeBackup(dst, parseBackup(text)!);
		expect(dst.getItem('ddal.stats')).toBe('{"played":5,"dayStreak":3}');
		expect(dst.getItem('ddal.day.20700')).toBe('{"pos":10,"marks":[],"done":true}');
	});
});
