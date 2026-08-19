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
 * 위반은 다르므로 빌드를 막지는 않는다. 다만 "못 읽는" 것과 "파싱이 깨진" 것은
 * 구별한다. 파싱이 깨졌는데 조용히 넘어가면 가드가 있는 척만 하게 된다.
 */
const BANKS = {
	discover: { file: 'problems.ts', marker: 'export const PROBLEMS' },
	trivia: { file: 'trivia.ts', marker: 'export const TRIVIA' }
} as const;

/** 은행 원문을 문제 블록 배열로 쪼갠다(인덱스 순서 그대로) */
function splitBlocks(src: string, marker: string): string[] {
	// git show는 Windows에서 CRLF로 뱉을 수 있다 — 안 맞추면 split이 한 조각도 못 자른다
	const lf = src.replace(/\r\n/g, '\n');
	const at = lf.indexOf(marker);
	if (at < 0) throw new Error(`${marker}를 찾지 못했다`);
	const parts = lf.slice(at).split(/\n\t\{\n\t\tid: '/).slice(1);
	if (!parts.length) throw new Error(`${marker}를 문제 블록으로 쪼개지 못했다 — 파싱 규칙 확인`);
	return parts;
}

/** origin/main 시점의 원문. 없으면 null(검증 불가), 파싱이 깨지면 예외(테스트 실패) */
function baseline(file: string, marker: string): string[] | null {
	let raw: string;
	try {
		raw = execSync(`git show origin/main:src/lib/${file}`, {
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'ignore'],
			maxBuffer: 32 * 1024 * 1024
		});
	} catch {
		return null;
	}
	return splitBlocks(raw, marker);
}

describe('오늘 출제 중인 자리는 낮에 바뀌지 않는다', () => {
	it('오늘 세트에 든 자리(발견형·상식)의 내용이 origin/main과 같다', () => {
		const olds: Record<string, string[]> = {};
		const nows: Record<string, string[]> = {};
		for (const [kind, { file, marker }] of Object.entries(BANKS)) {
			const o = baseline(file, marker);
			if (!o) return; // 기준선을 못 읽는 환경
			const n = splitBlocks(readFileSync(join(__dirname, file), 'utf-8'), marker);
			if (o.length !== n.length) return; // 은행이 자란 커밋 — bankHistory 규칙이 따로 다룬다
			olds[kind] = o;
			nows[kind] = n;
		}

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
			const o = olds[p.kind];
			const n = nows[p.kind];
			if (!o || !n) continue; // 성냥·전개도는 은행이 고정이라 이 사고가 없다
			expect(
				n[p.index],
				`${p.kind} 인덱스 ${p.index}는 오늘(${day}) 출제 중이다 — 내용 변경은 자정 이후로 미뤄라`
			).toBe(o[p.index]);
		}
	});
});
