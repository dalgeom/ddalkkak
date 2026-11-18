// fable 사전 검증 게이트(2026-11-12 사용자 지시) — 중요한 작업은 fable-gate 에이전트가 통과시킨 뒤에만.
//   pre    PreToolUse(Edit|Write|Bash|PowerShell): 표식 없이 src · scripts · static · promo · CLAUDE.md를 고치거나
//          커밋 · 푸시하면 막는다. fable-gate 에이전트가 `fable-gate.mjs pass`를 부르면 대기 줄만 남긴다.
//   post   PostToolUse(Bash|PowerShell): pass 명령이 실제로 실행됐으면 대기 줄을 표식으로 옮긴다(거부된 명령엔
//          PostToolUse가 오지 않으므로 표식이 안 생긴다, 11/18). git push가 끝나면 표식을 지운다 → 다음 작업은 다시 검증받는다.
//   prompt UserPromptSubmit: 규칙을 상기시킨다.
//   pass   에이전트가 Bash로 부르는 자리 — 실제 기록은 pre · post hook이 한다(여기서는 출력만).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const MARK = path.join(ROOT, '.claude', 'tmp', 'fable-pass.json');
const TTL = 2 * 60 * 60 * 1000;
const GATE = 'fable-gate';
const mode = process.argv[2];

if (mode === 'pass') {
	console.log('fable 통과 표식 요청: ' + (process.argv[3] || ''));
	process.exit(0);
}

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const sid = input.session_id || 'unknown';
const agent = input.agent_type || '';

const PEND = path.join(ROOT, '.claude', 'tmp', 'fable-pass-pending.json');
const LOG = path.join(ROOT, '.claude', 'tmp', 'gate-debug.log');
const PASS = /fable-gate\.mjs\s+pass\b/;
const key = input.tool_use_id || input.agent_id || '';
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const writeJson = (f, m) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(m, null, 1)); };
const log = (m) => fs.appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), mode: m, sid, agent, tool_use_id: input.tool_use_id, agent_id: input.agent_id }) + '\n');
const load = () => readJson(MARK);
const save = (m) => writeJson(MARK, m);
const valid = () => { const p = load()[sid]; return p && Date.now() - p.at < TTL ? p : null; };
const out = (o) => { process.stdout.write(JSON.stringify(o)); process.exit(0); };
const deny = (why) => out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: why } });

const HOW = '먼저 Agent(subagent_type: "fable-gate")에 계획(무엇을 · 왜 · 어느 파일 · 어떻게 검증)을 보내 통과를 받으세요. 반려 · 조건부면 계획을 고쳐 다시 받습니다.';

if (mode === 'prompt') {
	out({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext:
		'[fable 게이트] 사이트 수정 · 콘텐츠 추가 · 홍보 방향 · SEO · 성장 작업은 시작 전에 fable-gate 에이전트(fable 5.2)의 통과를 받는다. 통과한 것만 실행한다(2026-11-12 사용자 지시). ' +
		(valid() ? '현재 이 세션에 유효한 통과 표식이 있다: ' + valid().summary : '현재 이 세션에 통과 표식이 없다.') } });
}

const tool = input.tool_name || '';
const ti = input.tool_input || {};

if (mode === 'post') {
	const cmd = String(ti.command || '');
	if (PASS.test(cmd)) {
		log('post');
		const p = readJson(PEND);
		const w = key && p[key];
		if (w) { const m = load(); m[w.sid] = { at: Date.now(), summary: w.summary }; save(m); delete p[key]; writeJson(PEND, p); }
	}
	if (/\bgit\s+push\b/.test(cmd)) { const m = load(); delete m[sid]; save(m); }
	process.exit(0);
}

if (mode !== 'pre') process.exit(0);

const rel = (p) => path.relative(ROOT, path.resolve(ROOT, String(p))).replace(/\\/g, '/');
const gated = (r) => !r.startsWith('..') && (/^(src|scripts|static|promo)\//.test(r) || r === 'CLAUDE.md') && !/^scripts\/qa\/_tmp/.test(r);
const touchesMark = (s) => /fable-pass/.test(s);

if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') {
	const r = rel(ti.file_path || ti.notebook_path || '');
	if (touchesMark(r)) deny('fable 통과 표식은 fable-gate 에이전트만 쓸 수 있습니다.');
	if (gated(r) && !valid()) deny(`[fable 게이트] ${r} 수정은 fable 5.2 사전 검증 통과 뒤에만 됩니다. ${HOW}`);
	process.exit(0);
}

if (tool === 'Bash' || tool === 'PowerShell') {
	const cmd = String(ti.command || '');
	if (PASS.test(cmd)) {
		log('pre');
		if (agent !== GATE) deny('fable 통과 표식은 fable-gate 에이전트만 남길 수 있습니다. ' + HOW);
		if (!key) process.exit(0); // 키가 없으면 대기 줄을 쓰지 않는다 — 서로 다른 호출이 한 줄을 나눠 쓰지 않게
		const summary = (cmd.match(/pass\s+["']?([^"'\n]*)/) || [])[1] || '';
		const p = readJson(PEND);
		for (const k in p) if (Date.now() - p[k].at > TTL) delete p[k];
		p[key] = { sid, summary, at: Date.now() }; writeJson(PEND, p);
		process.exit(0);
	}
	if (touchesMark(cmd) && agent !== GATE) deny('fable 통과 표식은 fable-gate 에이전트만 다룰 수 있습니다.');
	if (agent === GATE) process.exit(0);
	const commit = /\bgit\s+(commit|push|merge|cherry-pick|revert)\b/.test(cmd);
	// 쓰기 동작 바로 뒤(같은 명령 조각 안)에 막을 경로가 와야 쓰기로 본다 — 읽기 명령에 CLAUDE.md 글자만 있는 것은 통과(11/12 fable 지적)
	const write = /(sed\s+-i|\btee\b|>\s*["']?|Set-Content|Out-File|Add-Content|\bmv\b|\bcp\b|Copy-Item|Move-Item|Remove-Item|\brm\b)[^|;&]*(\b(src|scripts|static|promo)[\\/]|CLAUDE\.md)/.test(cmd);
	if ((commit || write) && !valid()) deny(`[fable 게이트] ${commit ? '커밋 · 푸시' : '프로젝트 파일 쓰기'}는 fable 5.2 사전 검증 통과 뒤에만 됩니다. ${HOW}`);
}
process.exit(0);
