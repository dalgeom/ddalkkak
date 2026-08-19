/**
 * 기록 내보내기·가져오기.
 *
 * 왜 있나: 연속 기록(스트릭)은 "잃을 게 쌓여야" 작동하는 장치인데, 지금 모든 기록이
 * localStorage 하나에만 있다. 브라우저를 바꾸거나, 카톡 인앱에서 열었다가 다음 날
 * 크롬으로 오거나, iOS가 7일 미방문 웹 데이터를 지우면 그대로 증발한다.
 * 어렵게 7일을 쌓은 사람이 기기 하나 바꿨다고 배신당하면 안 된다.
 *
 * 백엔드가 없으니 파일 한 장으로 옮긴다. 딸깍이 쓰는 키만 골라 담는다.
 */

/** 백업 대상 키인가 — 접두사로 판별해 날짜별 진행(ddal.day.N)까지 함께 담는다 */
export function isBackupKey(key: string): boolean {
	return key.startsWith('ddal.');
}

export type Backup = {
	app: 'ddalkkak';
	version: 1;
	exportedAt: string;
	data: Record<string, string>;
};

/** 저장소 전체에서 딸깍 기록만 뽑아 백업 객체로 */
export function buildBackup(store: Storage, nowIso: string): Backup {
	const data: Record<string, string> = {};
	for (let i = 0; i < store.length; i++) {
		const k = store.key(i);
		if (!k || !isBackupKey(k)) continue;
		const v = store.getItem(k);
		if (v !== null) data[k] = v;
	}
	return { app: 'ddalkkak', version: 1, exportedAt: nowIso, data };
}

/** 백업 파일의 모양이 맞는가 — 남의 json을 넣었을 때 기록을 망가뜨리지 않도록 */
export function parseBackup(text: string): Backup | null {
	try {
		const raw = JSON.parse(text);
		if (!raw || raw.app !== 'ddalkkak' || typeof raw.data !== 'object' || raw.data === null) {
			return null;
		}
		const data: Record<string, string> = {};
		for (const [k, v] of Object.entries(raw.data)) {
			if (isBackupKey(k) && typeof v === 'string') data[k] = v;
		}
		if (!Object.keys(data).length) return null;
		return { app: 'ddalkkak', version: 1, exportedAt: String(raw.exportedAt ?? ''), data };
	} catch {
		return null;
	}
}

/**
 * 백업을 저장소에 얹는다. 덮어쓰기가 아니라 병합이다 —
 * 기기 A의 기록을 기기 B로 옮길 때 B에서 오늘 푼 것을 지워버리면 안 된다.
 * 같은 날짜가 양쪽에 있으면 더 많이 푼 쪽을 남긴다.
 */
export function mergeBackup(store: Storage, backup: Backup): number {
	let applied = 0;
	for (const [k, v] of Object.entries(backup.data)) {
		const cur = store.getItem(k);
		if (cur !== null && !shouldOverwrite(k, cur, v)) continue;
		store.setItem(k, v);
		applied++;
	}
	return applied;
}

/** 충돌 규칙: 하루치 진행은 '더 많이 푼 쪽', 누적 통계는 '더 큰 쪽'을 남긴다 */
function shouldOverwrite(key: string, cur: string, incoming: string): boolean {
	if (key.startsWith('ddal.day.')) {
		const a = safeParse(cur);
		const b = safeParse(incoming);
		const ac = Array.isArray(a?.marks) ? a.marks.length : -1;
		const bc = Array.isArray(b?.marks) ? b.marks.length : -1;
		if (a?.done && !b?.done) return false;
		if (!a?.done && b?.done) return true;
		return bc > ac;
	}
	if (key === 'ddal.stats') {
		const a = safeParse(cur);
		const b = safeParse(incoming);
		return Number(b?.played ?? 0) > Number(a?.played ?? 0);
	}
	// 나머지(설치 안내 dismiss 등)는 들어온 쪽으로 맞춘다
	return true;
}

function safeParse(s: string): Record<string, unknown> | null {
	try {
		const v = JSON.parse(s);
		return v && typeof v === 'object' ? v : null;
	} catch {
		return null;
	}
}
