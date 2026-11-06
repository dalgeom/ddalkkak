// 얇은 쪽 — 사이트맵의 쪽마다 <main> 안 한글 글자 수를 세어 기준 미만이면 실패(2026-11-06).
// 11/4에 낸 끝말잇기 해설 쪽이 104자로 나갔고 이틀 뒤에야 찾았다. 애드센스 반려 사유 「고유 가치」에 걸리는 쪽을
// 새 콘텐츠와 함께 다시 내보내지 않으려고 둔다. 목록(허브) 쪽은 링크 모음이라 기준에서 뺀다.
const BASE = process.env.QA_BASE || 'https://ddalkkak.app';
const MIN = 200;
const HUB = new Set(['/', '/archive', '/matchstick/answer']);
const sm = await (await fetch(BASE + '/sitemap.xml?nocache=' + Date.now())).text();
const pages = [...new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, '') || '/'))];
const rows = await Promise.all(pages.map(async (p) => {
	const h = await (await fetch(BASE + p)).text();
	const m = (h.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? h)
		.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
	return [p, (m.match(/[가-힣]/g) || []).length];
}));
const bad = rows.filter(([p, n]) => !HUB.has(p) && n < MIN).sort((a, b) => a[1] - b[1]);
console.log(`쪽 ${rows.length}개 · 가장 얇은 쪽 ${Math.min(...rows.filter(([p]) => !HUB.has(p)).map(([, n]) => n))}자 · 기준 ${MIN}자`);
for (const [p, n] of bad) console.log(`실패 ${p} — 본문 ${n}자`);
if (!rows.length) { console.log('실패 사이트맵에서 쪽을 못 읽음'); process.exitCode = 1; }
if (bad.length) process.exitCode = 1;
