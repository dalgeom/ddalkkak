import { describe, it, expect } from 'vitest';
import { tallyKey, parseTally, applyResult, accuracyOf, accuracyLabel, MIN_SAMPLE } from './stats';

describe('정답률 집계', () => {
	it('키는 문제 id 하나당 한 칸', () => {
		expect(tallyKey('sh-seg-union')).toBe('p:sh-seg-union');
	});

	it('깨진 값·없는 값은 0에서 시작한다', () => {
		expect(parseTally(null)).toEqual({ n: 0, ok: 0 });
		expect(parseTally('not json')).toEqual({ n: 0, ok: 0 });
		expect(parseTally('{"n":-3,"ok":1}')).toEqual({ n: 0, ok: 0 });
		// 정답 수가 시도 수보다 클 수는 없다 — 조작된 값은 버린다
		expect(parseTally('{"n":2,"ok":5}')).toEqual({ n: 0, ok: 0 });
	});

	it('시도와 정답을 하나씩 쌓는다', () => {
		let t = { n: 0, ok: 0 };
		t = applyResult(t, true);
		t = applyResult(t, false);
		expect(t).toEqual({ n: 2, ok: 1 });
	});

	it('표본이 모자라면 숨긴다 — 3명 중 1명은 통계가 아니다', () => {
		expect(accuracyOf({ n: 3, ok: 1 })).toBeNull();
		expect(accuracyOf({ n: MIN_SAMPLE - 1, ok: 10 })).toBeNull();
		expect(accuracyOf({ n: MIN_SAMPLE, ok: 15 })).toBe(50);
	});

	it('어려운 문제일수록 자랑이 되게 말한다', () => {
		expect(accuracyLabel(12)).toContain('다섯 명 중 한 명도');
		expect(accuracyLabel(88)).toContain('대부분 맞히는');
		expect(accuracyLabel(50)).toBe('이 문제, 정답률 50%');
	});
});
