import { execSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { PROBLEMS } from './problems';
import { TRIVIA } from './trivia';
import { BANK_HISTORY_ALL, BANK_HISTORY_LAST, bankSizesAt } from './bankHistory';
import { kstDayNumber } from './game';

/**
 * 문제를 더하고 갈 때 사람이 손으로 지켜야 했던 규칙들을 기계가 지킨다.
 *
 * 지금까지 사고는 늘 같은 자리에서 났다 — 문서에 "다음부터는 조심하자"고 적고,
 * 다음에 똑같이 반복. 규율을 규칙으로 옮기지 않으면 또 난다.
 */
describe('은행 무결성 — 사람 규율을 기계로', () => {
	it('bankHistory 마지막 엔트리가 실제 배열 길이와 같다', () => {
		expect({ discover: BANK_HISTORY_LAST.discover, trivia: BANK_HISTORY_LAST.trivia }).toEqual({
			discover: PROBLEMS.length,
			trivia: TRIVIA.length
		});
	});

	/**
	 * 지키려는 것은 "낮에 오늘 세트가 바뀌지 않는다"이다.
	 *
	 * 원래는 마지막 엔트리의 fromDay가 오늘이면 실패시켰는데, 그러면 **문제를 추가한
	 * 다음 날 하루 종일 CI가 빨개진다.** 어제 fromDay를 내일(20690)로 올바르게 적어도
	 * 오늘이 20690이 되는 순간 "오늘로 적었다"로 잡히기 때문이다(2026-08-25에 발생).
	 * 날짜가 흐른 것과 규율을 어긴 것을 구별하지 못하는 검사였다.
	 *
	 * 그래서 날짜 대신 **결과**를 본다 — origin/main이 오늘 쓰는 은행 크기와 지금
	 * 작업본이 오늘 쓰는 크기가 같으면 낮에 세트가 바뀔 일이 없다. 미래 엔트리를 아무리
	 * 더해도 통과하고, 오늘 자리를 건드리면 날짜를 어떻게 적었든 걸린다.
	 */
	it('오늘 쓰는 은행 크기가 origin/main과 같다 — 낮에 세트가 바뀌지 않는다', () => {
		let raw: string;
		try {
			raw = execSync('git show origin/main:src/lib/bankHistory.ts', {
				encoding: 'utf-8',
				stdio: ['ignore', 'pipe', 'ignore']
			});
		} catch {
			return; // 기준선을 못 읽는 환경 — 검증 못 하는 것과 위반은 다르다
		}
		const rows = [...raw.matchAll(/fromDay:\s*(\d+),\s*discover:\s*(\d+),\s*trivia:\s*(\d+)/g)].map(
			(m) => ({ fromDay: +m[1], discover: +m[2], trivia: +m[3] })
		);
		expect(rows.length, 'origin/main의 bankHistory를 파싱하지 못했다 — 파싱 규칙 확인').toBeGreaterThan(0);

		const today = kstDayNumber(Date.now());
		const at = (list: typeof rows) => {
			let cur = list[0];
			for (const h of list) {
				if (h.fromDay > today) break;
				cur = h;
			}
			return { discover: cur.discover, trivia: cur.trivia };
		};
		expect(at(rows), `오늘(${today}) 쓰는 은행 크기가 바뀌었다 — 새 엔트리는 내일 이후로 적어라`).toEqual(
			bankSizesAt(today)
		);
	});

	it('은행은 줄어들지 않는다 — 삭제는 프리픽스 불변식을 깬다', () => {
		for (let i = 1; i < BANK_HISTORY_ALL.length; i++) {
			const a = BANK_HISTORY_ALL[i - 1];
			const b = BANK_HISTORY_ALL[i];
			expect(b.fromDay, 'fromDay는 증가해야 한다').toBeGreaterThan(a.fromDay);
			expect(b.discover, `discover가 줄었다 (${a.fromDay}→${b.fromDay})`).toBeGreaterThanOrEqual(a.discover);
			expect(b.trivia, `trivia가 줄었다 (${a.fromDay}→${b.fromDay})`).toBeGreaterThanOrEqual(a.trivia);
		}
	});

	it('발견형 문제에 빈 지문·빈 정답이 없다', () => {
		for (const p of PROBLEMS) {
			const hasContent = p.blocks.some((b) =>
				b.kind === 'text' ? b.html.trim().length > 0
				: b.kind === 'pre' ? b.text.trim().length > 0
				: true
			);
			expect(hasContent, `${p.id}: 지문이 비었다`).toBe(true);
			if (p.type === 'text') {
				expect(p.answers?.every((a) => a.trim().length > 0), `${p.id}: 빈 정답이 있다`).toBe(true);
			}
		}
	});

	it('상식 문제의 보기·정답이 온전하다', () => {
		for (const t of TRIVIA) {
			if (t.type !== 'choice') continue;
			expect(t.choices?.length, `${t.id}: 보기가 2개 미만`).toBeGreaterThanOrEqual(2);
			const i = t.answerIndex ?? -1;
			expect(i >= 0 && i < (t.choices?.length ?? 0), `${t.id}: answerIndex 범위 밖`).toBe(true);
			expect(new Set(t.choices).size, `${t.id}: 보기에 중복이 있다`).toBe(t.choices!.length);
		}
	});
});
