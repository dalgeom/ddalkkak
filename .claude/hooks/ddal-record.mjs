// 딸깍 「오늘 한 일」 기록 hook(2026-11-18 사용자: 「필요한 hook 알아서 만들어」).
// 11/12 · 11/18에 대화 요약 뒤 오늘 끝낸 일을 「안 했다 · 남았다」고 세 번 단정했다. 메모리 문구로는 못 막아서 강제한다.
//   prompt  UserPromptSubmit: 오늘 기록(done 파일 · 오늘 커밋 · fixLog · 게시-기록)을 매 메시지 앞에 띄운다.
//           날짜 인사면 아침 순서를, 「올렸어」면 기록 → 정리 순서를, 상태 질문이면 「모른다」 규칙을 덧붙인다.
//   session SessionStart(시작 · 요약 · 재개): 같은 오늘 기록을 띄운다 — 요약 직후가 가장 위험하다.
//   post    PostToolUse(Bash|PowerShell): 기계로 알 수 있는 일(GA 보고 · qa · ?day= 미리 열기 · 푸시 · 정리)을 done 파일에 자동으로 적는다.
//   stop    Stop: 마지막 답이 done 파일에 「끝」으로 적힌 일을 「안 했다 · 남았다 · 다음은」이라고 하면 한 번 막는다.
// done 파일: .claude/tmp/done-YYYY-MM-DD.md (gitignore). 한 줄 = `- HH:MM [항목] 내용`. 항목: GA 보고 · 성장 작업 · 단계 채우기 · 블로그 · 미리 풀기.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const mode = process.argv[2];
const today = new Date().toLocaleDateString('sv-SE');
const hhmm = () => new Date().toTimeString().slice(0, 5);
const DONE = path.join(ROOT, '.claude', 'tmp', `done-${today}.md`);
const ITEMS = ['GA 보고', '성장 작업', '단계 채우기', '블로그', '미리 풀기'];

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const out = (o) => { process.stdout.write(JSON.stringify(o)); process.exit(0); };
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const append = (line) => { fs.mkdirSync(path.dirname(DONE), { recursive: true }); fs.appendFileSync(DONE, `- ${hhmm()} ${line}\n`); };
const sh = (c) => { try { return execSync(c, { cwd: ROOT, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const doneItems = (txt) => ITEMS.filter((it) => new RegExp(`\\[[^\\]]*${it}[^\\]]*\\]`).test(txt));

function record() {
	const done = read(DONE).trim();
	const commits = sh('git log --since=midnight --format="%h %ad %s" --date=format:%H:%M');
	const fix = (read(path.join(ROOT, 'src/lib/fixLog.ts')).match(new RegExp(`date: '${today}',\\s*kind: '[^']*',\\s*title: '[^']*'`, 'g')) || [])
		.map((m) => m.match(/title: '([^']*)'/)[1]);
	const md = today.slice(5).replace('-', '/').replace(/^0/, '');
	const posts = read(path.join(ROOT, 'promo/게시-기록.md')).split('\n').filter((l) => l.startsWith(`| ${today}`)).map((l) => l.slice(0, 120));
	const have = doneItems(done);
	return [
		`[오늘 기록 ${today}] 상태 · 남은 일 · 「다음 할 일」을 말하기 전에 이것부터 본다. 여기 없는 일은 「안 했다」가 아니라 대화 jsonl을 찾아보거나 「모른다」다.`,
		`끝난 매일 일: ${have.length ? have.join(' · ') : '(done 파일에 적힌 것 없음)'} / 안 적힌 것: ${ITEMS.filter((i) => !have.includes(i)).join(' · ') || '없음'}`,
		done ? `done 파일(.claude/tmp/done-${today}.md):\n${done.split('\n').slice(-25).join('\n')}` : `done 파일 없음 — 매일 일을 끝내면 \`- HH:MM [항목] 내용\` 한 줄을 .claude/tmp/done-${today}.md에 적는다.`,
		`오늘 커밋: ${commits ? '\n' + commits.split('\n').slice(0, 15).join('\n') : '없음'}`,
		`fixLog ${md}: ${fix.length ? fix.join(' · ') : '없음'} / 게시-기록 ${md}: ${posts.length ? '\n' + posts.join('\n') : '없음'}`
	].join('\n');
}

if (mode === 'prompt' || mode === 'session') {
	const p = String(input.prompt || '');
	const extra = [];
	if (/\d{1,2}월\s*\d{1,2}일/.test(p) && /요일/.test(p) && p.length < 40)
		extra.push('[날짜 인사] 어제 GA 보고부터 바로: ga-yesterday.py(키는 CLAUDE.md의 경로만) · feedback.mjs · gsc-pages.py / 7 → 성장 작업(fable-gate 먼저) → 단계 채우기(끝말잇기 · 낱말퍼즐 8일치) → 내일 미리 풀기(금요일이면 토 · 일 · 월). 블로그는 사용자가 정한다. 각 일을 끝내면 done 파일에 한 줄.');
	if (/올렸어|올렸다|올렸음|게시했/.test(p))
		extra.push('[올렸어] 기록이 먼저: promo/게시-기록.md에 행 추가 → node scripts/promo-clean.mjs --지워. 한 곳만 올렸으면 「대기」.');
	if (/끝\?|끝났|남은|남았|뭐\s*했|다 했|오늘 할 일/.test(p))
		extra.push('[상태 질문] 위 기록 · git log · 게시-기록 · fixLog · 대화 jsonl(커밋 없는 일)을 다 본 뒤에만 답한다. 한 군데라도 안 봤으면 단정하지 않는다.');
	const ctx = [record(), ...extra].join('\n');
	out({ hookSpecificOutput: { hookEventName: mode === 'prompt' ? 'UserPromptSubmit' : 'SessionStart', additionalContext: ctx } });
}

if (mode === 'post') {
	const cmd = String(input.tool_input?.command || '');
	const res = input.tool_response || {};
	const stdout = String(res.stdout ?? res.output ?? (typeof res === 'string' ? res : ''));
	if (/ga-yesterday\.py/.test(cmd)) append('[자동 · GA 보고] ga-yesterday.py 돌림(보고는 답에서)');
	if (/npm run qa/.test(cmd)) {
		const only = (cmd.match(/--only\s+(\S+)/) || [])[1];
		const r = /전부 통과/.test(stdout) ? '전부 통과' : (stdout.match(/실패 \d+개/) || ['결과 모름'])[0];
		append(`[자동] qa${only ? ' --only ' + only : ' 전체'} ${/QA_BASE=http:\/\/localhost/.test(cmd) ? '로컬' : '운영'} — ${r}`);
	}
	const days = [...new Set([...cmd.matchAll(/[?&]day=(\d{5})/g)].map((m) => m[1]))];
	for (const d of days) append(`[자동] ?day=${d}(${new Date(+d * 86400000).toISOString().slice(5, 10).replace('-', '/')}) 열어 봄 — 미리 풀기라면 끝낸 뒤 [미리 풀기] 줄을 따로 적는다`);
	if (/\bgit\s+push\b/.test(cmd)) append('[자동] git push');
	if (/promo-clean\.mjs\s+--지워/.test(cmd)) append('[자동] promo-clean --지워');
	if (/indexnow\.mjs/.test(cmd)) append(`[자동] IndexNow ${cmd.split('indexnow.mjs')[1].trim().slice(0, 80)}`);
	process.exit(0);
}

if (mode === 'stop') {
	if (input.stop_hook_active) process.exit(0);
	const have = doneItems(read(DONE));
	if (!have.length || !input.transcript_path) process.exit(0);
	// 대화 기록은 수백 MB다 — 끝 2MB만 읽는다.
	let tail = '';
	try {
		const fd = fs.openSync(input.transcript_path, 'r');
		const size = fs.fstatSync(fd).size;
		const len = Math.min(size, 2 << 20);
		const buf = Buffer.alloc(len);
		fs.readSync(fd, buf, 0, len, size - len);
		fs.closeSync(fd);
		tail = buf.toString('utf8');
	} catch { process.exit(0); }
	const texts = [];
	for (const line of tail.split('\n').reverse()) {
		let e; try { e = JSON.parse(line); } catch { continue; }
		const c = e.message?.content;
		if (e.type === 'user' && (typeof c === 'string' || (Array.isArray(c) && c.some((b) => b.type === 'text')))) break;
		if (e.type === 'assistant' && Array.isArray(c)) for (const b of c) if (b.type === 'text') texts.unshift(b.text);
	}
	// 「」 · "" · `` 안은 인용(시험 문장 · 사용자 말 옮기기)이라 뺀다 — 11/18 시험 결과를 옮긴 답이 막혔다.
	const said = texts.join('\n').replace(/「[^」\n]*」|"[^"\n]*"|`[^`\n]*`/g, '');
	const NEG = '(안\\s?했|안\\s?함|안\\s?됨|남았|남음|아직|못\\s?했|빠졌|해야\\s?(합니다|한다|해))';
	const hits = have.filter((it) => new RegExp(`${it}[^.\\n,]{0,15}${NEG}`).test(said) || new RegExp(`다음(은|에|\\s*할\\s*일)[^.\\n]{0,20}${it}`).test(said));
	if (hits.length)
		out({ decision: 'block', reason: `[오늘 기록] done 파일(.claude/tmp/done-${today}.md)에 「${hits.join(' · ')}」가 이미 끝났다고 적혀 있는데 답이 안 했다 · 남았다 · 다음 할 일로 말한다. 파일을 열어 확인하고 답을 고친다(다른 날짜 이야기라면 날짜를 밝혀 다시 쓴다).` });
	process.exit(0);
}
process.exit(0);
