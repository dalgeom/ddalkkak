/**
 * 오늘의 미션(v2, 2026-10-14) — 하루 한 번 새로 열리는 세 가지를 한 줄로 묶는다.
 * 오늘의 10문제 · 오늘의 성냥개비 · 오늘의 초성이 서로 다른 화면에서 따로 놀았다(10/14 점검).
 * 상태는 각 놀이가 이미 쓰는 저장 키에서 읽는다 — 새로 저장하는 것은 없다.
 */
import { readDayRecord } from './record';

export interface Mission {
	key: 'daily' | 'match' | 'cho';
	label: string;
	href: string;
	done: boolean;
}

function dayOf(key: string): number | null {
	try {
		const v = JSON.parse(localStorage.getItem(key) || 'null');
		return typeof v?.day === 'number' ? v.day : null;
	} catch {
		return null;
	}
}

export function todayMissions(day: number): Mission[] {
	return [
		{ key: 'daily', label: '오늘의 10문제', href: '/', done: !!readDayRecord(day) },
		{ key: 'match', label: '오늘의 성냥개비', href: '/matchstick', done: dayOf('ddal.match.daily') === day },
		{ key: 'cho', label: '오늘의 초성', href: '/chosung', done: dayOf('ddal.cho.daily') === day }
	];
}
