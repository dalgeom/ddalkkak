/**
 * 매일 아침 구독자에게 "오늘 문제가 나왔다"를 보낸다.
 *
 *   node scripts/send-push.mjs           실제 발송
 *   node scripts/send-push.mjs --dry     구독 수만 세고 보내지 않는다
 *
 * Cloudflare Pages에는 정해진 시각에 코드를 돌리는 기능이 없어서 GitHub Actions가 맡는다.
 * Node라서 web-push가 VAPID 서명과 본문 암호화를 대신해 준다 — Workers였다면 그걸
 * 직접 구현해야 했다.
 *
 * 필요한 값은 전부 환경변수로만 받는다(저장소에 남기지 않는다):
 *   VAPID_PRIVATE_KEY   VAPID 비밀키
 *   VAPID_SUBJECT       mailto: 주소
 *   CF_ACCOUNT_ID       Cloudflare 계정 id
 *   CF_KV_NAMESPACE_ID  ddalkkak-stats 네임스페이스 id
 *   CF_API_TOKEN        KV 읽기/쓰기 권한 토큰
 *
 * 죽은 구독(404·410)은 그 자리에서 지운다. 브라우저는 사용자가 알림을 껐다는 걸
 * 알려주지 않으므로, 보내보고 거절당하는 것이 유일하게 정확한 신호다.
 */
import webpush from 'web-push';

const DRY = process.argv.includes('--dry');
const PUBLIC_KEY =
	'BBdagXd4yXNvE8XkMT6l890JJ4zGb21tZWUkB3lGP9zUrmYEzCs2aX3lR628fRrDZK5X1gZY86Cpd1JXLxMszms';

const need = ['CF_ACCOUNT_ID', 'CF_KV_NAMESPACE_ID', 'CF_API_TOKEN'];
if (!DRY) need.push('VAPID_PRIVATE_KEY', 'VAPID_SUBJECT');
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
	console.error(`환경변수가 없다: ${missing.join(', ')}`);
	process.exit(1);
}

const { CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN } = process.env;
const KV = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}`;
const auth = { Authorization: `Bearer ${CF_API_TOKEN}` };

async function kvListSubs() {
	const out = [];
	let cursor = '';
	do {
		const url = `${KV}/keys?prefix=sub:&limit=1000${cursor ? `&cursor=${cursor}` : ''}`;
		const r = await fetch(url, { headers: auth });
		const j = await r.json();
		if (!j.success) throw new Error(`키 목록 실패: ${JSON.stringify(j.errors)}`);
		out.push(...j.result.map((k) => k.name));
		cursor = j.result_info?.cursor ?? '';
	} while (cursor);
	return out;
}

async function kvGet(key) {
	const r = await fetch(`${KV}/values/${encodeURIComponent(key)}`, { headers: auth });
	if (!r.ok) return null;
	try {
		return JSON.parse(await r.text());
	} catch {
		return null;
	}
}

async function kvDelete(key) {
	await fetch(`${KV}/values/${encodeURIComponent(key)}`, { method: 'DELETE', headers: auth });
}

const keys = await kvListSubs();
console.log(`구독 ${keys.length}건`);
if (DRY) {
	console.log('--dry — 보내지 않고 끝낸다');
	process.exit(0);
}
if (!keys.length) process.exit(0);

webpush.setVapidDetails(process.env.VAPID_SUBJECT, PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

// 본문은 짧게. 알림은 읽히는 게 아니라 눈에 띄는 것이고, 무엇이 기다리는지만 전하면 된다.
const payload = JSON.stringify({
	title: '딸깍 — 오늘의 10문제',
	body: '새 문제가 올라왔어요. 오늘도 딸깍?',
	url: '/'
});

let sent = 0;
let gone = 0;
let failed = 0;

for (const key of keys) {
	const sub = await kvGet(key);
	if (!sub?.endpoint) {
		await kvDelete(key);
		gone++;
		continue;
	}
	try {
		await webpush.sendNotification(sub, payload, { TTL: 12 * 3600 });
		sent++;
	} catch (e) {
		if (e.statusCode === 404 || e.statusCode === 410) {
			await kvDelete(key);
			gone++;
		} else {
			failed++;
			console.error(`실패(${e.statusCode ?? '?'}) ${key}`);
		}
	}
}

console.log(`발송 ${sent} · 만료 정리 ${gone} · 실패 ${failed}`);
