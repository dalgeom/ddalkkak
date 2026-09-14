import { describe, it, expect } from 'vitest';
import { encodeChallenge, parseChallenge, judgeChallenge } from './challenge';
import { shareMessage } from './game';

describe('도전장 — 공유 링크에 실어 보내는 보낸 사람의 기록', () => {
	it('회차·점수·초를 짧게 싣고 그대로 되읽는다', () => {
		expect(encodeChallenge({ no: 62, correct: 8, secs: 192 })).toBe('62-8-192');
		expect(parseChallenge('62-8-192')).toEqual({ no: 62, correct: 8, secs: 192 });
	});

	it('시간 기록이 없던 날은 초를 빼고 싣는다', () => {
		expect(encodeChallenge({ no: 62, correct: 8 })).toBe('62-8');
		expect(parseChallenge('62-8')).toEqual({ no: 62, correct: 8 });
	});

	it('손으로 고친 링크·깨진 값은 도전장으로 치지 않는다', () => {
		for (const bad of [null, '', 'abc', '62', '62-11', '0-5', '62-8-0', '62-8-999999', '62-8-x', '-1-8', '62-8-192-1'])
			expect(parseChallenge(bad)).toBeNull();
	});

	it('많이 맞힌 쪽이 이기고, 같으면 빠른 쪽이 이긴다', () => {
		const 친구 = { no: 62, correct: 8, secs: 192 };
		expect(judgeChallenge({ correct: 9, secs: 400 }, 친구)).toBe('win');
		expect(judgeChallenge({ correct: 7, secs: 60 }, 친구)).toBe('lose');
		expect(judgeChallenge({ correct: 8, secs: 150 }, 친구)).toBe('win');
		expect(judgeChallenge({ correct: 8, secs: 200 }, 친구)).toBe('lose');
		expect(judgeChallenge({ correct: 8, secs: 192 }, 친구)).toBe('draw');
	});

	it('점수가 같은데 어느 한쪽 시간이 없으면 비긴 것으로 친다', () => {
		expect(judgeChallenge({ correct: 8 }, { no: 62, correct: 8, secs: 192 })).toBe('draw');
		expect(judgeChallenge({ correct: 8, secs: 100 }, { no: 62, correct: 8 })).toBe('draw');
	});
});

describe('공유 문구에 도전장이 실린다', () => {
	const base = {
		puzzleNo: 62,
		marks: ['clean', 'miss'] as const,
		correct: 8,
		total: 10,
		elapsedMs: 192_400,
		origin: 'https://ddalkkak.app'
	};

	it('링크에 내 기록을 싣고, GA가 출처를 알아보게 utm_source=share를 붙인다', () => {
		const msg = shareMessage({ ...base, marks: [...base.marks] });
		expect(msg).toContain('https://ddalkkak.app/?c=62-8-192&utm_source=share');
		expect(msg).not.toContain('ref=daily');
	});

	it('받은 도전장에 응한 결과면 친구 기록을 한 줄 덧붙인다', () => {
		const msg = shareMessage({ ...base, marks: [...base.marks], vs: { no: 62, correct: 7, secs: 250 } });
		expect(msg).toContain('⚔️ 친구 7/10 · 4분 10초에 도전');
	});
});
