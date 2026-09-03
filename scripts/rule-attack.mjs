/**
 * 발견형 규칙 유일성 공격 — 보고서.
 *
 *   npx vite-node scripts/rule-attack.mjs
 *
 * 공격 로직은 src/lib/ruleAttack.ts에 있다(회귀 가드 ruleAttack.test.ts가 같은 것을
 * 쓴다). 여기는 사람이 읽을 형태로 찍기만 한다.
 *
 * 「통과」는 유일성의 증명이 아니라 이 라이브러리로 못 깼다는 뜻이다.
 */
import { attackOps, attackSeqs, attackClubs, 규칙수 } from '../src/lib/ruleAttack.ts';

function 찍기(제목, r, 덧말 = '') {
	console.log(`\n═══════════ ${제목} ═══════════${덧말}`);
	const 갈림 = r.적발.filter((f) => f.종류 === '갈림');
	const 자명 = r.적발.filter((f) => f.종류 === '자명');

	if (갈림.length) {
		console.log(`\n████ 답이 갈린다 — ${갈림.length}건\n`);
		for (const f of 갈림) {
			console.log(`  ✗ ${f.id}   공식답 ${f.공식답}`);
			for (const a of f.대안) console.log(`       ${String(a.답).padEnd(8)} ← ${a.규칙}`);
			console.log('');
		}
	}
	if (자명.length) {
		console.log(`████ 자명한 연산이다 — ${자명.length}건\n`);
		for (const f of 자명)
			console.log(`  ! ${f.id}   「${f.대안[0].규칙}」 하나로 예시와 답(${f.공식답})이 전부 설명된다`);
		console.log('');
	}
	if (r.판단불가.length) {
		console.log(`──── 판단 불가 ${r.판단불가.length}건 (라이브러리 한계, 결함이라는 뜻이 아니다)\n`);
		for (const s of r.판단불가) console.log(`  · ${s.id} — ${s.이유}`);
	}
	console.log(
		`\n── ${제목} ${r.검사수}개 — 적발 ${r.적발.length} · 반례 없음 ${r.통과.length} · 판단 불가 ${r.판단불가.length}`
	);
}

const club = attackClubs();
찍기('이상한 연산', attackOps());
찍기('수열·사슬', attackSeqs());
찍기('클럽(숫자형)', club, `  낱말형 ${club.낱말형}개는 사전 지식이 필요해 기계 몫이 아니다`);

const 합 = [attackOps(), attackSeqs(), club];
const 적발 = 합.reduce((a, r) => a + r.적발.length, 0);
console.log(
	`\n\n════ 전체 — 검사 ${합.reduce((a, r) => a + r.검사수, 0)}개 · 적발 ${적발}건 · 규칙 ${규칙수}종 ════`
);
console.log('   이건 깨끗함의 증명이 아니라 반례 찾기다. 라이브러리에 없는 규칙은 못 찾는다.');
