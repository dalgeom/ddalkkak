import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PROBLEMS, fieldOfChip } from './problems';
import { TRIVIA } from './trivia';
import { buildDailySetStable, MATCH_TOTAL, kstDayNumber } from './game';
import { bankSizesAt } from './bankHistory';

/**
 * 오늘 출제 중인 자리의 내용을 낮에 바꾸면, 아침에 풀던 사람의 문제가 오후에 달라진다.
 * 8/11에 이 사고로 완주율이 15%까지 무너졌고, 8/14에 또 같은 실수를 할 뻔했다.
 * "자정 전에는 오늘 자리를 건드리지 않는다"를 사람 기억이 아니라 이 테스트가 지킨다.
 *
 * 기준선(origin/main)을 못 읽는 환경에서는 조용히 통과한다 — 검증 못 하는 것과
 * 위반은 다르므로 빌드를 막지는 않는다.
 */
const SRC = join(__dirname, 'problems.ts');

/**
 * problems.ts 원문을 문제 블록 배열로 쪼갠다(인덱스 순서 그대로).
 * git show는 Windows에서 CRLF로 뱉을 수 있어 개행을 먼저 정규화한다 —
 * 안 하면 split이 한 조각도 못 잘라 길이 검사에서 조용히 빠져나간다.
 */
function splitBlocks(src: string): string[] {
	const lf = src.replace(/\r\n/g, '\n');
	const body = lf.slice(lf.indexOf('export const PROBLEMS'));
	const parts = body.split(/\n\t\{\n\t\tid: '/).slice(1);
	if (!parts.length) throw new Error('problems.ts를 문제 블록으로 쪼개지 못했다 — 파싱 규칙을 확인하라');
	return parts;
}

function baseline(): string[] | null {
	try {
		const out = execSync('git show origin/main:src/lib/problems.ts', {
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'ignore'],
			maxBuffer: 32 * 1024 * 1024
		});
		return splitBlocks(out);
	} catch {
		return null;
	}
}

describe('오늘 출제 중인 자리는 낮에 바뀌지 않는다', () => {
	it('오늘 세트에 든 발견형 자리의 내용이 origin/main과 같다', () => {
		const old = baseline();
		if (!old) return; // 기준선을 못 읽는 환경 — 검증 불가

		const now = splitBlocks(readFileSync(SRC, 'utf-8'));
		if (old.length !== now.length) return; // 은행이 자란 커밋 — bankHistory 규칙이 따로 다룬다

		const day = kstDayNumber(Date.now());
		const picks = buildDailySetStable(
			PROBLEMS,
			TRIVIA,
			MATCH_TOTAL,
			day,
			(x) => fieldOfChip(x.chip),
			(x) => x.category ?? '기타',
			bankSizesAt
		);

		for (const p of picks) {
			if (p.kind !== 'discover') continue;
			expect(
				now[p.index],
				`인덱스 ${p.index}는 오늘(${day}) 출제 중이다 — 내용 변경은 자정 이후로 미뤄라`
			).toBe(old[p.index]);
		}
	});
});
