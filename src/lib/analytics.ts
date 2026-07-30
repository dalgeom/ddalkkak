/**
 * GA4 커스텀 이벤트.
 * 페이지뷰만으로는 "들어와서 시작했는지 / 끝까지 풀었는지 / 공유했는지"를 알 수 없어
 * 유입이 시작되기 전에 미리 심어 둔다(나중에 심으면 그 전 데이터는 영영 없다).
 *
 * gtag이 없는 환경(개발 서버·광고 차단기·SSR)에서는 조용히 아무 일도 하지 않는다.
 */
type Params = Record<string, string | number | boolean>;

export function track(name: string, params?: Params): void {
	if (typeof window === 'undefined') return;
	const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
	if (typeof g !== 'function') return;
	try {
		g('event', name, params ?? {});
	} catch {
		/* 계측 실패가 게임을 막아선 안 된다 */
	}
}
