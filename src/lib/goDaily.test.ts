import { describe, it, expect } from 'vitest';
import { markGoDaily, takeGoDaily } from './analytics';

/** sessionStorage 흉내 — 테스트 환경(node)에는 저장소가 없다 */
function 가짜저장소() {
	const m = new Map<string, string>();
	return {
		getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
		setItem: (k: string, v: string) => void m.set(k, v),
		removeItem: (k: string) => void m.delete(k)
	};
}

describe('데일리 버튼에서 온 사람은 홈에서 곧장 시작한다', () => {
	it('버튼을 누르고 홈이 뜨면 시작한다', () => {
		const s = 가짜저장소();
		markGoDaily(1_000_000, s);
		expect(takeGoDaily(1_002_000, s)).toBe(true);
	});

	it('한 번 읽으면 지운다 — 새로고침·뒤로가기로 다시 시작되지 않는다', () => {
		const s = 가짜저장소();
		markGoDaily(1_000_000, s);
		takeGoDaily(1_001_000, s);
		expect(takeGoDaily(1_002_000, s)).toBe(false);
	});

	it('오래된 표시는 무시한다 — 버튼을 새 탭으로 열고 나중에 원래 탭으로 홈에 가는 경우', () => {
		const s = 가짜저장소();
		markGoDaily(1_000_000, s);
		expect(takeGoDaily(1_000_000 + 61_000, s)).toBe(false);
	});

	it('버튼을 안 누르고 홈에 온 사람은 시작하지 않는다', () => {
		expect(takeGoDaily(1_000_000, 가짜저장소())).toBe(false);
	});

	it('저장소가 막혀도(사생활 보호 모드 등) 게임을 막지 않는다', () => {
		const 막힘 = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			},
			removeItem: () => {
				throw new Error('blocked');
			}
		};
		expect(() => markGoDaily(1_000_000, 막힘)).not.toThrow();
		expect(takeGoDaily(1_000_000, 막힘)).toBe(false);
	});

	it('저장소가 아예 없으면(SSR) 시작하지 않는다', () => {
		expect(takeGoDaily(1_000_000, null)).toBe(false);
	});
});
