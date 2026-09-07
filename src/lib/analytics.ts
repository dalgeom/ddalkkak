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

/**
 * 데일리로 가는 링크가 **화면에 실제로 들어온 순간**과 **눌린 순간**을 나눠 찍는다.
 *
 * 왜 렌더가 아니라 교차인가 — push_offer·install_offer는 컴포넌트가 그려질 때 찍는데,
 * 8/26에 다섯 명에게 찍혔지만 버튼이 접힘 아래라 아무도 못 눌렀다. 「떴다」는 「봤다」가
 * 아니다. 여기서 알고 싶은 것이 정확히 그 구분이다 — 안 눌리는 것이 문구 탓인지 아예
 * 눈에 안 들어오는 탓인지.
 *
 * 왜 자리마다 이벤트 이름을 나누나 — 파라미터로 나누면 GA4에 맞춤 측정기준을 등록해야
 * 보이고, 등록 전 데이터는 (not set)으로만 남는다. daily_bank의 via가 9/3부터 그 상태다.
 * 이름으로 나누면 등록 없이 바로 보이고, trivia냐 discover냐와 분야별 분해는 표준
 * 차원인 pagePath로 교차하면 된다.
 */
export function ctaTrack(node: HTMLElement, slot: 'band' | 'foot') {
	const onClick = () => track(`cta_${slot}_click`);
	node.addEventListener('click', onClick);

	let io: IntersectionObserver | undefined;
	if (typeof IntersectionObserver === 'function') {
		io = new IntersectionObserver(
			(entries) => {
				// 절반 이상 보인 적이 있으면 한 번만 찍고 끊는다
				if (entries.some((e) => e.isIntersecting)) {
					track(`cta_${slot}_seen`);
					io?.disconnect();
					io = undefined;
				}
			},
			{ threshold: 0.5 }
		);
		io.observe(node);
	}

	return {
		destroy() {
			io?.disconnect();
			node.removeEventListener('click', onClick);
		}
	};
}
