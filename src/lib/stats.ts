/**
 * 문제별 정답률 집계 — Cloudflare KV에 "숫자만" 쌓는다.
 *
 * 왜: 지금은 모두가 서로를 모른다. 8점을 맞아도 그게 잘한 건지 알 수 없고,
 * 어떤 문제에서 다들 막히는지도 알 수 없다. "이 문제, 정답률 31%"가 붙는 순간
 * 어려운 문제를 맞힌 것이 자랑이 되고, 나에게는 감이 아닌 실측이 생긴다.
 *
 * 개인을 식별하는 것은 저장하지 않는다. 키는 문제 id, 값은 시도/정답 수뿐이다.
 */

/** 한 문제의 누적 집계 */
export type Tally = { n: number; ok: number };

/** 정답률을 화면에 보여줄 최소 표본. 3명 중 1명은 통계가 아니라 한산해 보일 뿐이다. */
export const MIN_SAMPLE = 30;

/** KV 키 — 문제 id 하나당 한 칸. 날짜를 섞지 않아 표본이 빨리 모인다. */
export function tallyKey(problemId: string): string {
	return `p:${problemId}`;
}

export function parseTally(raw: string | null): Tally {
	if (!raw) return { n: 0, ok: 0 };
	try {
		const v = JSON.parse(raw);
		const n = Number(v?.n);
		const ok = Number(v?.ok);
		if (!Number.isFinite(n) || !Number.isFinite(ok) || n < 0 || ok < 0 || ok > n) {
			return { n: 0, ok: 0 };
		}
		return { n, ok };
	} catch {
		return { n: 0, ok: 0 };
	}
}

export function applyResult(t: Tally, correct: boolean): Tally {
	return { n: t.n + 1, ok: t.ok + (correct ? 1 : 0) };
}

/** 표본이 모자라면 null — 숨긴다 */
export function accuracyOf(t: Tally, minSample = MIN_SAMPLE): number | null {
	if (t.n < minSample) return null;
	return Math.round((t.ok / t.n) * 100);
}

/** 정답률을 사람 말로. 낮을수록 자랑거리라 그 결을 살린다. */
export function accuracyLabel(pct: number): string {
	if (pct <= 20) return `이 문제, 정답률 ${pct}% — 다섯 명 중 한 명도 못 맞힙니다`;
	if (pct <= 40) return `이 문제, 정답률 ${pct}%`;
	if (pct <= 70) return `이 문제, 정답률 ${pct}%`;
	return `이 문제, 정답률 ${pct}% — 대부분 맞히는 문제예요`;
}
