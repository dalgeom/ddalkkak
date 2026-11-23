/**
 * 옛 구성 박제(11/23) — 11/24(20781)부터 오늘의 10문제 구성이 바뀐다.
 * 그 앞날(사이트 첫날 ~ 20780)은 아카이브 · 지난 기록이 그대로여야 하므로, 바꾸기 전 코드(7fe3d68)로 뽑은 줄을 박제해 두고 대조한다.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { assembleDayQueue } from './dayview';
import { SITE_START_DAY } from './game';

const FIXTURE = join(__dirname, 'daily-frozen.json');
const LAST_OLD_DAY = 20780;
type Row = [string, number, number];

function computeDay(day: number): Row[] {
	return assembleDayQueue(day).map((q) => [q.kind, q.bonus ? 1 : 0, q.index]);
}

describe('옛 구성 박제 — 20780까지는 한 칸도 바뀌지 않는다', () => {
	it('픽스처의 모든 날이 현재 코드와 같다', () => {
		if (!existsSync(FIXTURE)) {
			const out: Record<string, Row[]> = {};
			for (let d = SITE_START_DAY; d <= LAST_OLD_DAY; d++) out[d] = computeDay(d);
			writeFileSync(FIXTURE, JSON.stringify(out));
		}
		const frozen: Record<string, Row[]> = JSON.parse(readFileSync(FIXTURE, 'utf-8'));
		expect(Object.keys(frozen).length).toBe(LAST_OLD_DAY - SITE_START_DAY + 1);
		for (const [day, rows] of Object.entries(frozen)) expect(computeDay(Number(day)), `day ${day}`).toEqual(rows);
	});
});
