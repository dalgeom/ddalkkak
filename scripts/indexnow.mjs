/**
 * IndexNow로 사이트맵의 모든 주소를 검색엔진에 알린다 — Bing(ChatGPT 검색이 쓰는 색인) · 네이버 · Yandex 등이 함께 받는다.
 *
 *   node scripts/indexnow.mjs            사이트맵 전체 + /llms.txt
 *   node scripts/indexnow.mjs /a /b      그 주소만
 *
 * 키는 8/4에 static/163207f5f728f8389fb39dde1d60303f.txt로 심었다(#141). 내용이 바뀐 화면이 있을 때만 돌린다 —
 * 바뀐 것 없이 자주 보내면 무시당한다.
 */
const SITE = 'https://ddalkkak.app';
const KEY = '163207f5f728f8389fb39dde1d60303f';

let urls = process.argv.slice(2).map((p) => SITE + p);
if (!urls.length) {
	const xml = await (await fetch(`${SITE}/sitemap.xml?nocache=${Date.now()}`)).text();
	urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	urls.push(`${SITE}/llms.txt`);
}
const res = await fetch('https://api.indexnow.org/indexnow', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json; charset=utf-8' },
	body: JSON.stringify({ host: 'ddalkkak.app', key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls })
});
console.log(`주소 ${urls.length}개 → IndexNow ${res.status} ${res.statusText}`, (await res.text()).slice(0, 200));
// 200 받음 · 202 받았고 키 확인 중 · 403 키 불일치 · 422 주소가 host와 다름 · 429 너무 잦음
if (res.status >= 300) process.exit(1);
