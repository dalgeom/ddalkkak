/**
 * 문제은행 크기 이력을 git 커밋에서 복원한다 — src/lib/bankHistory.ts의 재료.
 *
 *   node scripts/bank-history.mjs
 *
 * 왜 필요한가: buildDailySet의 순열은 은행 크기(n)로 섞인다. 문제를 추가해
 * 은행이 자라면 순열이 통째로 재편되어 "오늘의 문제"가 낮에 바뀌고 지난
 * 아카이브도 소급 재편된다(8/11 GN 피드백으로 발각). 그래서 각 날의 세트는
 * 그날 자정 시점의 은행 크기로 계산해야 하고, 그 크기가 이 이력이다.
 *
 * 규칙: 커밋일의 다음 날(fromDay = 커밋 KST 날짜 + 1)부터 새 크기를 쓴다.
 * 문제를 추가해도 그날의 세트는 안 바뀌고 다음 날부터 출제에 들어간다.
 *
 * 엔트리 수 세기: 각 문제/퀴즈 항목마다 정확히 하나 있는 explain: 필드를 센다.
 * (id: 는 과거 포맷에서 다른 곳에도 등장한 적이 있어 부정확하다)
 */
import { execSync } from 'node:child_process';

const SITE_START_DAY = 20649; // 2026-07-15

function sh(cmd) {
	return execSync(cmd, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
}

function countAt(hash, file) {
	try {
		const src = sh(`git show ${hash}:${file}`);
		return (src.match(/explain:/g) || []).length;
	} catch {
		return null; // 그 커밋에 파일이 없다
	}
}

function kstDay(iso) {
	return Math.floor((Date.parse(iso) + 9 * 3600 * 1000) / 86400000);
}

// 두 파일을 건드린 모든 커밋(병합 커밋 포함, 시간순)
const log = sh(
	'git log "--format=%H|%cI" --reverse -- src/lib/problems.ts src/lib/trivia.ts'
)
	.trim()
	.split('\n')
	.map((l) => {
		const [hash, iso] = l.split('|');
		return { hash, iso, day: kstDay(iso) };
	});

const rows = [];
for (const c of log) {
	const discover = countAt(c.hash, 'src/lib/problems.ts');
	const trivia = countAt(c.hash, 'src/lib/trivia.ts');
	rows.push({ ...c, discover, trivia });
}

// 날짜별 마지막 상태만 남긴다(하루에 여러 번 배포해도 자정 스냅샷 하나)
const byDay = new Map();
for (const r of rows) byDay.set(r.day, r);

// fromDay = 커밋일 + 1, 크기가 실제로 변한 지점만 이력으로
const hist = [];
let prev = { discover: -1, trivia: -1 };
for (const [day, r] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
	if (r.discover === prev.discover && r.trivia === prev.trivia) continue;
	hist.push({ fromDay: day + 1, discover: r.discover, trivia: r.trivia, at: r.iso.slice(0, 10) });
	prev = r;
}

// 사이트 시작일 이전의 마지막 상태가 시작일의 초기값이 된다
const before = hist.filter((h) => h.fromDay <= SITE_START_DAY);
const after = hist.filter((h) => h.fromDay > SITE_START_DAY);
const initial = before[before.length - 1];

console.log('// 시작 시점(그 이전 이력은 접었다):');
console.log(
	`\t{ fromDay: SITE_START_DAY, discover: ${initial.discover}, trivia: ${initial.trivia} }, // ~${initial.at}`
);
for (const h of after) {
	console.log(
		`\t{ fromDay: ${h.fromDay}, discover: ${h.discover}, trivia: ${h.trivia} }, // ${h.at} 배포분, 다음 날부터`
	);
}
