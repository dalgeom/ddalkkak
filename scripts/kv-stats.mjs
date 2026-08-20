/**
 * KV에 쌓인 문제별 정답률을 본다.
 *
 *   node scripts/kv-stats.mjs              누적 전체
 *   node scripts/kv-stats.mjs 20684        그날 세트만 (dayNum)
 *
 * 인증이 필요 없다 — /api/stat의 GET은 읽기만 하고 사람에 대한 것은 담지 않는다.
 *
 * 읽는 법: 명세의 목표 밴드는 정답률 30~60%다.
 *   90% 이상  너무 쉽다      10% 미만  너무 어렵거나 문제가 고장났다
 * 다만 표본이 한 자리면 판정하지 말 것. 하루 완주가 2~3명이고 같은 문제는 몇 달 뒤에나
 * 다시 나오므로, 문제 하나가 의미 있는 표본을 모으는 데는 아주 오래 걸린다.
 */
const BASE = process.env.BASE ?? 'https://ddalkkak.app';
const day = process.argv[2] ? Number(process.argv[2]) : null;

const res = await fetch(`${BASE}/api/stat`);
if (!res.ok) {
	console.error(`조회 실패: ${res.status}`);
	process.exit(1);
}
const { items } = await res.json();

// __로 시작하는 키는 배포 확인용으로 넣은 것이라 집계에서 뺀다
const rows = Object.entries(items).filter(([id]) => !id.startsWith('__'));

let want = null;
if (day !== null) {
	const [{ PROBLEMS, fieldOfChip }, { TRIVIA }, game, { bankSizesAt }] = await Promise.all([
		import('../src/lib/problems.ts'),
		import('../src/lib/trivia.ts'),
		import('../src/lib/game.ts'),
		import('../src/lib/bankHistory.ts')
	]);
	want = new Set(
		game
			.buildDailySetStable(
				PROBLEMS,
				TRIVIA,
				game.MATCH_TOTAL,
				day,
				(x) => fieldOfChip(x.chip),
				(x) => x.category ?? '기타',
				bankSizesAt
			)
			.map((p) =>
				p.kind === 'discover' ? PROBLEMS[p.index]?.id
				: p.kind === 'trivia' ? TRIVIA[p.index]?.id
				: `${p.kind}-${p.index}`
			)
	);
}

const shown = want ? rows.filter(([id]) => want.has(id)) : rows;
shown.sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));

const tries = shown.reduce((s, [, v]) => s + v.n, 0);
const oks = shown.reduce((s, [, v]) => s + v.ok, 0);
console.log(
	`\n문제 ${shown.length}개 · 시도 ${tries}건 · 전체 정답률 ${tries ? Math.round((oks / tries) * 100) : 0}%` +
		(want ? `  (day ${day} 세트 중 기록된 것)` : '') +
		'\n'
);

for (const [id, v] of shown) {
	const pct = v.n ? Math.round((v.ok / v.n) * 100) : 0;
	const flag =
		v.n < 5 ? '표본부족'
		: pct >= 90 ? '너무 쉬움'
		: pct < 10 ? '너무 어려움'
		: '';
	console.log(`  ${id.padEnd(28)} ${String(v.n).padStart(3)}시도 ${String(v.ok).padStart(3)}정답 ${String(pct).padStart(3)}%  ${flag}`);
}
if (want) {
	const missing = [...want].filter((id) => !items[id]);
	if (missing.length) console.log(`\n  기록 없음: ${missing.join(', ')}`);
}
console.log();
