import { writable } from 'svelte/store';

/**
 * 헤더 로고를 눌렀다는 신호(누를 때마다 +1).
 * 이미 홈(/)에 있으면 href="/" 클릭이 아무 일도 하지 않아서, 문제 풀이·결과 화면이
 * 이 신호를 받아 랜딩 화면으로 돌아간다(진행은 저장됨).
 */
export const logoClicks = writable(0);

/**
 * 오늘의 10문제를 푸는 동안 true — 레이아웃이 헤더 메뉴·하단 탭·푸터·하단 광고를 접는다(v2, 10/14).
 * 푸는 화면에 링크 13개와 탭이 같이 보여 집중이 흩어졌다. 랜딩(+page.svelte)이 phase에 맞춰 켠다.
 */
export const focusMode = writable(false);
