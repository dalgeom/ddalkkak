/**
 * 사용자가 보낸 의견(헤더 말풍선 → /api/feedback → KV `fb:` 키)을 본다. 매일 아침 보고 때 함께 돌린다.
 *
 *   node scripts/feedback.mjs           지난번 확인 뒤 새로 들어온 의견만(확인 표시를 남긴다)
 *   node scripts/feedback.mjs --all     쌓인 의견 전부(확인 표시는 그대로)
 *   node scripts/feedback.mjs --days 7  최근 7일
 *
 * 이 PC의 wrangler 로그인(사용자 계정 OAuth)으로 KV를 직접 읽는다 — 의견은 공개 주소로 내보내지 않는다.
 * 네임스페이스 id는 이름(ddalkkak-stats)으로 그때그때 찾는다. 어디에도 적지 않는다.
 * 받은 지 1년이 지난 의견은 지운다(개인정보처리방침 「의견을 보낸 경우」).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const SEEN = join(ROOT, 'scripts', '.feedback-seen');
const KEEP_MS = 365 * 86400e3;
const LABEL = {
	fun: '재밌어요',
	boring: '재미없어요',
	hard: '너무 어려워요',
	easy: '너무 쉬워요',
	'want-puzzle': '이런 문제 추가해 주세요',
	'want-feature': '이런 기능 원해요',
	bug: '오류가 있어요',
	etc: '그 밖에'
};

function wr(args) {
	const r = spawnSync(process.execPath, [WRANGLER, ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
	if (r.status !== 0) {
		const msg = (r.stderr || r.stdout || '').split('\n').filter(Boolean).slice(-3).join(' / ');
		throw new Error(`wrangler ${args[0]} ${args[1]} 실패: ${msg.replace(/[0-9a-f]{32}/g, '****')}`);
	}
	return r.stdout;
}
const json = (s) => JSON.parse(s.slice(s.search(/[[{]/)));

const all = process.argv.includes('--all');
const di = process.argv.indexOf('--days');
const days = di > 0 ? Number(process.argv[di + 1]) : null;

let ns;
try {
	ns = json(wr(['kv', 'namespace', 'list'])).find((n) => n.title === 'ddalkkak-stats')?.id;
} catch (e) {
	console.error(String(e.message));
	console.error('wrangler 로그인이 풀렸으면: node E:/hj/project/ddalkkak/node_modules/wrangler/bin/wrangler.js login');
	process.exit(1);
}
if (!ns) {
	console.error('KV 네임스페이스 ddalkkak-stats를 못 찾았다');
	process.exit(1);
}
const keys = json(wr(['kv', 'key', 'list', '--namespace-id', ns, '--prefix', 'fb:', '--remote'])).map((k) => k.name).sort();

// 1년 지난 의견 지우기
const now = Date.now();
const old = keys.filter((k) => now - Date.parse(k.split(':').slice(1, -1).join(':')) > KEEP_MS);
for (const k of old) wr(['kv', 'key', 'delete', k, '--namespace-id', ns, '--remote']);
const live = keys.filter((k) => !old.includes(k));

const last = existsSync(SEEN) ? readFileSync(SEEN, 'utf8').trim() : '';
const pick = all ? live : days ? live.filter((k) => now - Date.parse(k.split(':').slice(1, -1).join(':')) <= days * 86400e3) : live.filter((k) => k > last);

const kst = (ms) => {
	const d = new Date(ms + 9 * 3600e3);
	const w = '일월화수목금토'[d.getUTCDay()];
	return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${w}) ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

const label = all ? '전체' : days ? `최근 ${days}일` : '새 의견';
console.log(`의견 — ${label} ${pick.length}건 · 쌓인 의견 ${live.length}건${old.length ? ` · 1년 지나 지움 ${old.length}건` : ''}`);
for (const k of pick) {
	let v;
	try {
		v = JSON.parse(wr(['kv', 'key', 'get', k, '--namespace-id', ns, '--remote', '--text']));
	} catch {
		console.log(`\n· ${k} — 읽지 못함`);
		continue;
	}
	console.log(`\n· ${kst(v.t)}  [${LABEL[v.kind] ?? v.kind}${v.quick ? ' · 한 번 누름' : ''}]  ${v.page || '(화면 모름)'}`);
	if (v.text) console.log('  ' + String(v.text).split('\n').join('\n  '));
}
if (!all && !days && pick.length) writeFileSync(SEEN, pick.at(-1));
