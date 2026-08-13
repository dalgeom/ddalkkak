import { describe, it, expect } from 'vitest';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import { buildDailySetStable, MATCH_TOTAL, PICK_V2_START_DAY } from './game';
import { bankSizesAt } from './bankHistory';

// 임시: 실은행으로 v1→v2 컷오버 전후 재출제 간격 검증
describe('감사: 실데이터 컷오버 간격', () => {
	it('컷오버 전후 40일 동안 발견형 15일 내 재출제 없음', () => {
		const lastSeen = new Map<number, number>();
		const close: string[] = [];
		for (let day = PICK_V2_START_DAY - 20; day <= PICK_V2_START_DAY + 20; day++) {
			const set = buildDailySetStable(
				PROBLEMS, TRIVIA, MATCH_TOTAL, day,
				(x) => fieldOfChip(x.chip), (x) => x.category ?? '기타', bankSizesAt
			);
			for (const p of set) {
				if (p.kind !== 'discover') continue;
				const prev = lastSeen.get(p.index);
				// v1 시절(과거)의 근접은 역사적 사실 — v2 시대에 착지하는 재출제만 본다
				if (prev !== undefined && day >= PICK_V2_START_DAY && day - prev < 14)
					close.push(`${PROBLEMS[p.index].id}: ${prev}→${day} (${day - prev}일)`);
				lastSeen.set(p.index, day);
			}
		}
		expect(close, close.join(', ')).toEqual([]);
	});
});
