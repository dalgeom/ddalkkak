import { pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { untrack } from 'svelte';

/**
 * 한 주소 안에서 메뉴 → 푸는 화면으로 바꿀 때 기록 한 칸을 넣는다(11/12 점검).
 * 없으면 휴대폰 뒤로가기가 메뉴가 아니라 직전 페이지(홈 · 검색 결과)로 나가 버렸다.
 *
 * - enter(): 푸는 화면을 열 때. 라우터가 준비되기 전(onMount 진입)이면 준비될 때까지 다시 시도한다
 * - leave(): 화면의 「나가기」. 기록 칸을 되돌리면 onBack이 불린다
 * - onBack: 뒤로가기든 leave()든 메뉴로 돌아가는 일. 이미 메뉴면 아무것도 안 하게 만든다
 *
 * 컴포넌트 초기화 중에 불러야 한다($effect).
 */
export function playHistory(onBack: () => void) {
	let pushed = false;
	$effect(() => {
		if (page.state.play) pushed = true;
		else if (pushed) {
			pushed = false;
			untrack(onBack);
		}
	});
	function push(n: number) {
		if (page.state.play) return;
		try {
			// 푸는 중에 새로 고침하면 브라우저가 이 칸의 play 표시를 남긴다. 그 위에 또 쌓으면 뒤로가기가 play 칸으로만 돌아가 메뉴로 못 나온다
			if (history.state?.['sveltekit:states']?.play) replaceState('', {});
			pushState('', { play: true });
		} catch {
			if (n < 500) setTimeout(() => push(n + 1), 20);
		}
	}
	return {
		enter: () => push(0),
		leave: () => {
			if (page.state.play) history.back();
			else onBack();
		}
	};
}
