import { writable } from 'svelte/store';

/**
 * 헤더 로고를 눌렀다는 신호(누를 때마다 +1).
 * 이미 홈(/)에 있으면 href="/" 클릭이 아무 일도 하지 않아서, 문제 풀이·결과 화면이
 * 이 신호를 받아 랜딩 화면으로 돌아간다(진행은 저장됨).
 */
export const logoClicks = writable(0);
