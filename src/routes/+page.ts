import { kstDayNumber } from '$lib/game';

// 홈의 '오늘'은 요청 시점에 계산해야 한다. prerender 하면 빌드 시점 날짜가 정적 HTML에
// 박혀, 크롤러와 hydration 전 사용자가 매번 1970-01-01 + day-0 문제를 보는 FOUC가 생긴다.
export const prerender = false;

export function load() {
	return { dayNum: kstDayNumber(Date.now()) };
}
