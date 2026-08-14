import { describe, it, expect } from 'vitest';
import { assembleDayView } from './dayview';
import { PICK_V2_START_DAY, DAILY_SIZE } from './game';

/**
 * v2 뽑기 전환일(20680 = 2026-08-15)부터 2주치를, 실제 화면이 쓰는 경로
 * (assembleDayView)로 조립해 본다. 전환이 무인 상태에서 일어나므로
 * "그날 열어 보면 멀쩡한가"를 코드가 미리 확인한다.
 */
describe('v2 전환 이후에도 하루치가 온전히 조립된다', () => {
	it('전환일부터 14일간 10문제가 빠짐없이 만들어진다', () => {
		for (let day = PICK_V2_START_DAY; day < PICK_V2_START_DAY + 14; day++) {
			const v = assembleDayView(day);
			const total =
				v.discover.length + v.trivia.length + v.match.length + v.cube.length + (v.bonus ? 1 : 0);
			expect(total, `day ${day} 문제 수`).toBe(DAILY_SIZE);

			for (const p of [...v.discover, ...v.trivia]) {
				expect(p, `day ${day}: 빈 문제`).toBeTruthy();
				expect(p.blocks.length, `day ${day}: ${p.id} 블록 없음`).toBeGreaterThan(0);
				expect(p.explain.length, `day ${day}: ${p.id} 해설 없음`).toBeGreaterThan(10);
				if (p.type === 'text') expect(p.answers?.length, `day ${day}: ${p.id} 정답 없음`).toBeGreaterThan(0);
			}
			for (const e of v.match) {
				expect(e?.displayed, `day ${day}: 성냥 등식 없음`).toBeTruthy();
				expect(e?.solution, `day ${day}: 성냥 정답 없음`).toBeTruthy();
			}
			for (const c of v.cube) {
				expect(c?.options?.length, `day ${day}: 전개도 보기 없음`).toBe(4);
			}

			const ids = [...v.discover, ...v.trivia].map((p) => p.id);
			expect(new Set(ids).size, `day ${day}: 같은 문제가 두 번`).toBe(ids.length);
		}
	});
});
