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
export function ctaTrack(node: HTMLElement, slot: 'band' | 'foot' | 'share' | 'teaser') {
	const onClick = () => {
		track(`cta_${slot}_click`);
		// 띠·하단 버튼은 데일리로 가는 버튼이다(공유 영역·내일 예고는 아니다). 홈이 뜨면 곧장
		// 시작하도록 표시를 남긴다 — +page.svelte의 onMount가 takeGoDaily()로 읽고 지운다.
		if (slot === 'band' || slot === 'foot') markGoDaily();
	};
	node.addEventListener('click', onClick);

	/** 콜백을 믿지 않고 좌표로 다시 본다 — 절반 이상이 화면 안에 들어와 있는가 */
	const 보이나 = () => {
		const r = node.getBoundingClientRect();
		const vh = window.innerHeight || document.documentElement.clientHeight;
		const 겹침 = Math.min(r.bottom, vh) - Math.max(r.top, 0);
		return r.height > 0 && 겹침 >= r.height * 0.5;
	};

	let done = false;
	let io: IntersectionObserver | undefined;
	const 끝내기 = () => {
		io?.disconnect();
		io = undefined;
		window.removeEventListener('scroll', 확인);
	};
	function 확인() {
		if (done || !보이나()) return;
		done = true;
		track(`cta_${slot}_seen`);
		끝내기();
	}

	if (typeof IntersectionObserver === 'function') {
		io = new IntersectionObserver(확인, { threshold: [0, 0.5, 1] });
		io.observe(node);
	}
	// 관찰자만 두면 안 된다. 9/7에 라이브에서 /trivia는 울렸는데 /discover는 같은 조건
	// (top 512 · 높이 54 · 뷰포트 844)에서 끝내 안 울렸다. 원인을 못 짚었으므로 길을
	// 하나 더 둔다 — 스크롤에서도 본다. 둘 중 먼저 확인되는 쪽이 찍고 나머지를 끊는다.
	window.addEventListener('scroll', 확인, { passive: true });

	return {
		destroy() {
			끝내기();
			node.removeEventListener('click', onClick);
		}
	};
}

/**
 * 데일리를 푸는 도중 화면을 떠난 자리 — `leave_p3_tried`처럼 몇 번째 문제에서, 무엇을 하던 중이었는지.
 *
 * 왜: 9/14에 문제별 제출 기록(KV)으로 8/19~9/13을 복원했더니 시작 143명 → 완주 74명이고
 * 이탈의 53%가 2번 문제에 닿기 전이었다. 그런데 KV는 「냈다 → 다음을 안 냈다」만 보여서
 * 결과를 보고 나간 건지, 다음 문제에서 막혀 나간 건지를 못 갈랐다. 그 둘은 처방이 다르다.
 *
 *   open   아무것도 안 해 보고 떠남 — 문제를 보자마자 나감
 *   tried  오답·힌트·입력은 했는데 못 풀고 떠남 — 막힘
 *   after  답을 내고 결과를 본 뒤 다음으로 안 넘어감
 *
 * 앱을 잠깐 바꿨다 오는 사람도 화면이 가려지는 순간 leave가 찍힌다(모바일은 탭이 버려질 때
 * pagehide가 안 오기도 해서, 가려지는 순간이 유일하게 믿을 신호다). 돌아오면 같은 꼴의
 * back_p3_tried를 찍는다 — 자리별 순수 이탈은 leave − back이다.
 * 이름으로 가르는 이유는 ctaTrack 주석과 같다(파라미터는 GA 등록 전엔 안 보인다).
 */
export function leaveEventName(
	prefix: 'leave' | 'back',
	pos: number,
	s: { judged: boolean; tried: boolean }
): string {
	const p = Math.min(10, Math.max(1, Math.floor(pos) + 1));
	return `${prefix}_p${p}_${s.judged ? 'after' : s.tried ? 'tried' : 'open'}`;
}

/**
 * 콘텐츠 페이지의 데일리 버튼에서 온 사람은 홈 소개를 건너뛰고 곧장 시작한다.
 *
 * 왜: 9/07~9/12에 검색으로 콘텐츠 페이지에 떨어진 사람 중 띠·하단 버튼을 누른 25명의
 * **64%(16명)가 홈에 와서 시작 버튼을 또 누르지 않고 나갔다.** 「오늘 문제 풀기 →」를
 * 눌렀는데 소개 화면이 뜨니 한 번 더 찾아 눌러야 했다. 같은 기간 홈으로 곧장 온 사람은
 * 대부분 시작했다.
 *
 * 왜 URL 파라미터(`/?go=daily`)가 아니라 세션 저장소인가: 파라미터는 새로고침·뒤로가기마다
 * 다시 시작시키고, 지우려면 SvelteKit 라우터와 history를 건드려야 한다. 누른 순간 표시를
 * 남기고 홈이 한 번 읽고 지우면 그 문제가 없고, 링크 8곳을 고칠 필요도 없다.
 *
 * 1분이 지난 표시는 버린다 — 버튼을 새 탭으로 열어 두고 원래 탭에서 나중에 홈으로 가는
 * 사람이 뜬금없이 시작되지 않게.
 */
type 저장소 = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
const GO_KEY = 'ddal.go';
const GO_MAX_AGE_MS = 60_000;

function 세션저장소(): 저장소 {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch {
		return null;
	}
}

export function markGoDaily(now = Date.now(), s: 저장소 = 세션저장소()): void {
	try {
		s?.setItem(GO_KEY, String(now));
	} catch {
		/* 저장소가 막혀 있으면 평소처럼 홈에서 버튼을 누르게 둔다 */
	}
}

export function takeGoDaily(now = Date.now(), s: 저장소 = 세션저장소()): boolean {
	try {
		const v = s?.getItem(GO_KEY);
		s?.removeItem(GO_KEY);
		if (!v) return false;
		const 지남 = now - Number(v);
		return 지남 >= 0 && 지남 < GO_MAX_AGE_MS;
	} catch {
		return false;
	}
}
