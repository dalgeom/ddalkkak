/**
 * 새 소식(v2, 2026-10-14). 새 놀이·큰 변경을 사이트 안에서 알린다.
 *
 * 10/14 점검: 성냥개비 단계 도전·그림 퍼즐을 만들고도 알릴 길이 없어 메인 푸터에만 걸려 있었다.
 * 새 소식은 이 배열 하나로 관리한다 — 맨 앞이 가장 최근. 화면은 세 군데에서 읽는다.
 *   NewsBar   메인·놀이 맨 위 한 줄(아직 안 본 최근 소식 하나, ✕로 닫기)
 *   NewsSheet 다시 온 사람에게만, 안 본 소식이 있으면 메인에서 한 번 올라오는 시트
 *   /news     전체 목록
 * 공지는 신규 기능만 싣는다(오류 수정·내부 정리는 싣지 않는다).
 */
import { writable } from 'svelte/store';

export interface Notice {
	id: string;
	/** YYYY-MM-DD (KST) */
	date: string;
	title: string;
	body: string;
	href: string;
	cta: string;
}

export const NOTICES: Notice[] = [
	{
		id: '2026-10-14-feedback',
		date: '2026-10-14',
		title: '의견 보내기',
		body: '재미없던 문제, 너무 어려운 문제, 있었으면 하는 문제나 기능을 화면 위 말풍선으로 보내 주세요. 하나하나 읽어요.',
		href: '/games?feedback=1',
		cta: '의견 보내러 가기'
	},
	{
		id: '2026-10-14-trivia-duel',
		date: '2026-10-14',
		title: '상식 퀴즈 대결',
		body: '상식 10문제를 풀고 링크를 보내면 친구가 같은 문제로 도전해요. 점수가 같으면 빠른 쪽이 이겨요.',
		href: '/trivia/duel',
		cta: '대결 시작하기'
	},
	{
		id: '2026-10-14-v2',
		date: '2026-10-14',
		title: '딸깍이 새로워졌어요',
		body: '오늘 · 놀이 · 기록 세 갈래로 정리했어요. 놀이에서 모든 퍼즐을 한눈에 고를 수 있어요.',
		href: '/games',
		cta: '놀이 둘러보기'
	},
	{
		id: '2026-10-14-match-picture',
		date: '2026-10-14',
		title: '성냥개비 그림 퍼즐 10문제',
		body: '성냥을 옮겨 정사각형을 만들고, 강아지를 돌려세우고, ㅁ을 ㄹ로 바꿔 보세요.',
		href: '/matchstick/picture',
		cta: '그림 퍼즐 풀기'
	},
	{
		id: '2026-10-14-match-stages',
		date: '2026-10-14',
		title: '성냥개비 단계 도전 60단계',
		body: '쉬운 문제부터 차근차근. 뒤로 가면 성냥 2개 옮기기, 빼기, 더하기 문제도 나와요.',
		href: '/matchstick#stages',
		cta: '1단계부터 도전하기'
	}
];

/** 이 날수 안의 소식만 「새」 소식으로 띄운다 */
const FRESH_DAYS = 14;

/** markSeen이 불릴 때마다 1씩 오른다 — 띠(NewsBar) · 헤더 종의 점이 다시 읽는다(닫아도 점이 남아 있었다) */
export const seenTick = writable(0);
/** 메인에서 새 소식 시트가 이번에 뜰 차례이거나 떠 있다 — 그동안 띠는 숨긴다(같은 소식이 띠와 시트에 두 번 보였다, 10/14) */
export const newsSheetActive = writable(false);
const KEY = 'ddal.news.seen';

/** 오늘(KST) 기준 FRESH_DAYS 안의 소식 */
export function freshNotices(nowMs: number): Notice[] {
	const today = new Date(nowMs + 9 * 3600e3).toISOString().slice(0, 10);
	const cut = new Date(Date.parse(today) - FRESH_DAYS * 86400e3).toISOString().slice(0, 10);
	return NOTICES.filter((n) => n.date >= cut && n.date <= today);
}

export function loadSeen(): string[] {
	try {
		return JSON.parse(localStorage.getItem(KEY) || '[]');
	} catch {
		return [];
	}
}

export function markSeen(ids: string[]): void {
	try {
		const seen = new Set(loadSeen());
		ids.forEach((id) => seen.add(id));
		localStorage.setItem(KEY, JSON.stringify([...seen]));
	} catch {
		/* 사생활 보호 창 — 다음에 또 보일 뿐이다 */
	}
	seenTick.update((n) => n + 1);
}

/** 새 소식 말고 딸깍 기록이 하나라도 있으면 다시 온 사람 */
export function isReturning(): boolean {
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i) ?? '';
			if (k.startsWith('ddal.') && !k.startsWith('ddal.news')) return true;
		}
	} catch {
		/* 무시 */
	}
	return false;
}
