/**
 * 딸깍 점검 한 번에 — `npm run qa`
 *
 *   npm run qa                         운영(ddalkkak.app) 전체
 *   npm run qa -- --only sheet,webkit  일부만
 *   QA_BASE=http://localhost:5231 npm run qa   로컬 개발 서버(npx vite dev --port 5231)
 *
 * 화면을 바꾼 작업은 이게 다 통과하고 docs/qa-checklist.md를 대조한 뒤에만 「완료」라고 보고한다(CLAUDE.md).
 * 2026-10-14 하루에 구역 붙음 · 시트 ✕ · 닫을 때 깜빡임 · 홈 바 · 스플래시 반복을 사용자가 먼저 찾았다 —
 * 그 하나하나가 아래 시험 항목이 됐다.
 *
 * GA · 광고 요청은 막고 정답률 · 알림 · 의견 서버 기록은 가로채므로 운영 숫자가 섞이지 않는다.
 * 결과 · 스크린샷: E:/tmp/ddal-qa (QA_TMP로 바꿀 수 있다)
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ALL = [
	['sweep', '전 화면 훑기 — 390·320px 콘솔 오류 · 가로 넘침 · 깨진 이미지 · 내부 링크'],
	['gaps', '구역 간격 실측 — 붙음(8px 미만) · 겹친 여백(40px 초과)'],
	['flow', '흐름 37개 — 데일리 완주 · 결과 · 재방문 · 유형별 · 기록 · 탭'],
	['sheet', '아래 시트 · 스플래시 — 실제 터치로 끌기 · 튕기기 · 뒤로가기 · 홈 바'],
	['lock', '시트 열린 동안 뒤 화면 스크롤 잠금'],
	['webkit', '아이폰 엔진(WebKit) — 깜빡임 · 스플래시 · 작은 화면 넘침'],
	['show', '초성 퀴즈 띄우기 — 화면 덮기 · 초성 크기 · 리모컨 · 뒤로가기 · 입구'],
	['chotoday', '초성 분야 풀이 → 오늘의 초성 카드 — 뜨는 때 · 이동 · 끝낸 뒤 숨김 · 폭']
];
const oi = process.argv.indexOf('--only');
const only = oi > 0 ? process.argv[oi + 1].split(',') : null;
const list = ALL.filter(([k]) => !only || only.includes(k));

console.log(`딸깍 점검 — ${process.env.QA_BASE || 'https://ddalkkak.app'}\n`);
const summary = [];
for (const [k, what] of list) {
	const t0 = Date.now();
	process.stdout.write(`▶ ${k}  ${what}\n`);
	const r = spawnSync(process.execPath, [join(HERE, k + '.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: process.env, maxBuffer: 64 << 20, timeout: 30 * 60e3 });
	const out = (r.stdout || '') + (r.stderr || '');
	const fails = out.split('\n').filter((l) => /^실패|Error|예외/.test(l));
	const pass = r.status === 0;
	summary.push([k, pass, Math.round((Date.now() - t0) / 1000), fails]);
	console.log(pass ? `  통과 (${summary.at(-1)[2]}초)` : `  실패 (${summary.at(-1)[2]}초)\n${out.split('\n').slice(-25).map((l) => '    ' + l).join('\n')}`);
}
console.log('\n── 요약 ──');
for (const [k, pass, s, fails] of summary) console.log(`${pass ? '통과' : '실패'}  ${k.padEnd(7)} ${s}초${fails.length ? '  ' + fails.slice(0, 3).join(' / ') : ''}`);
const bad = summary.filter(([, p]) => !p).length;
console.log(bad ? `\n실패 ${bad}개 — 완료 보고 금지. 고치고 다시 돌린다.` : '\n전부 통과 — docs/qa-checklist.md 대조까지 하고 보고한다.');
process.exitCode = bad ? 1 : 0;
