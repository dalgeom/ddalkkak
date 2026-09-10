/**
 * 「바뀌기 전」을 어디서 읽을 것인가 — todaySafety·bankIntegrity 두 가드의 기준선.
 *
 * 두 가드는 `git show <기준선>:src/lib/…`으로 이전 상태를 읽어 오늘 세트가 바뀌는지 본다.
 * 기본값은 `origin/main`인데, **이 프로젝트는 main에 직접 푸시한다.** 그러면 CI에서
 * origin/main이 곧 방금 푸시한 커밋이라 새 코드를 새 코드와 비교하게 되고, 가드가 늘
 * 빈손으로 통과한다(2026-09-10에 확인 — origin/main과 HEAD가 같은 SHA였다).
 *
 * 그래서 CI가 `BASELINE_REF`로 진짜 이전 커밋을 넘긴다(push 이벤트의 github.event.before).
 * PR에서는 안 넘기고 origin/main을 그대로 쓴다 — 거기서는 그게 맞는 기준선이다.
 *
 * 이 파일이 생기기 전 상황: fetch-depth 1이라 ref 자체가 없어 두 가드가 CI에서 한 번도
 * 작동한 적 없었고(9/3에 발견해 fetch-depth: 0으로 고침), 고친 뒤에도 기준선이 자기
 * 자신이라 여전히 작동하지 않았다. **같은 가드가 두 가지 다른 이유로 두 번 죽어 있었다.**
 */

/**
 * 기준선 ref. 빈 문자열이면 「기준선 없음」 — 호출하는 쪽은 검증을 건너뛴다.
 * 검증 못 하는 것과 위반은 다르므로 빌드를 막지는 않는다.
 */
export function baselineRef(): string {
	const env = process.env.BASELINE_REF?.trim();
	if (!env) return 'origin/main';
	// 새 브랜치의 첫 푸시는 before가 0으로 채워져 온다 — 비교할 이전 상태가 없다
	if (/^0+$/.test(env)) return '';
	return env;
}
