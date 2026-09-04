import { describe, it, expect } from 'vitest';
import { attackOps, attackSeqs, attackClubs, 적발된_id } from './ruleAttack';

/**
 * 발견형 규칙 유일성 회귀 가드.
 *
 * 왜 있나 — 8/26 「옹알이」, 8/31 alpha-order-nums, 9/2 vertical-vowel-club까지
 * 사용자 지적 3건이 전부 「규칙이 덜 조여졌다」였다. 우연이 아니라 구조다:
 * puzzle-reviewer는 2026-08-27에 생겼고, 그 시점 은행의 발견형 330개(97%)는
 * 유일성 공격을 한 번도 받지 않았다. 테스트 27개 파일 중 규칙 유일성을 보는
 * 것이 하나도 없었다.
 *
 * 이 테스트가 지키는 것은 「지금보다 나빠지지 않는 것」이다. 아래 목록은
 * 2026-09-03에 이미 적발된 것들이고, **고칠 때마다 여기서 지운다.**
 * 목록에 없는 새 적발이 나오면 테스트가 깨진다 — 새 문제가 같은 방식으로
 * 새는 것을 막는다.
 *
 * 한계는 ruleAttack.ts 머리에 적어 뒀다. 「통과」는 유일성의 증명이 아니라
 * 이 라이브러리로 못 깼다는 뜻이다.
 */
const 알려진_적발 = [
	// ── 답이 실제로 갈린다. 예시를 보강해 대안을 죽여야 한다
	'digit-sum-op', // 10 ↔ 8  예시가 (같은 수 쌍)과 (서로소)뿐이라 「a×b」와 「lcm」이 안 갈린다
	//
	// ── 성립하지만 대안이 억지스러운 조건형이다. 우선순위를 낮췄다.
	//    그래도 남긴다 — 8/26·8/31·9/2 지적 세 건이 전부 「설마 그렇게 읽겠나」 싶던 자리였다.
	'square-diff', // 28 ↔ 14  「a가 소수이면 a²-b², 아니면 a+b」
	'clock-add', // 5 ↔ 0  「a가 소수이면 (a+b) mod 12, 아니면 사이 짝수 개수」
	'odd-even-branch', // 7 ↔ 2  「a가 홀수이면 a+b, 아니면 자릿수합의 차」
	'size-branch', // 21 ↔ 111  「a가 대칭수이면 자리별 덧셈, 아니면 a-b」
	'num-hundred-gap', // 40 ↔ 5  「a가 홀수이면 사이 짝수 개수, 아니면 100에서 남은 거리」
	'num-carry-count', // 2 ↔ 5  「a+b가 짝수이면 올림 횟수, 아니면 (a+b) mod 12」
	'squares-between', // 4 ↔ 10  26★50에서 gcd와 제곱수 개수가 둘 다 2라 갈린다
	'nm-gcd-op' // 5 ↔ 25  9★24=3으로 |2a-b|는 죽였고, 남은 것은 「a가 대칭수이면 gcd」류 조건형뿐
	//
	// ── 9/3에 고쳐서 뺀 것. 답은 그대로 두고 대안을 죽이는 예시를 넣었다.
	//
	// 기계 검사기가 잡은 것
	//   palindrome-branch      74♥21=53 (비대칭인데 a>b라 크기 가설이 죽는다)
	//   digitwise-add          58⊕34=812, 27⊕14=311 (앞 수·합의 홀짝으로 안 갈린다)
	//   consecutive-sum-club   회원에 14 (3의 배수가 아닌 회원)
	//   num-place-add          60⊗34=94 → 58⊗34=812 (비로소 올림 없음이 드러난다)
	//   club-self-divisible    회원에 66 (자릿수 곱 36으로는 안 나뉜다)
	//   nm-digit-chain         검사기 쪽 결함이었다 — 규칙마다 필요한 앞 항 수가 다른데
	//                          i=3부터 일괄로 검사해 마지막 한 자리만 보고 통과시켰다
	//
	// fable5 워크플로가 손으로 잡은 것(기계가 못 보는 낱말·사전·모양 판단)
	//   consonant-asc-club     회원에 LEMON (자음은 오름차순, 전체는 L>E)
	//   club-case-twin         거절에 N (가로획도 분기도 없는데 거절)
	//   club-letter-sound      거절에 TOE (열린 음절인데 알파벳 이름이 아니다)
	//   club-number-start      회원에 천사 (천=1000이라 「한 자리 수」가 죽는다)
	//   abundant-club          회원에 40 (6의 배수가 아닌 과잉수)
	//   rc-club-samefirst      회원에 「하마 호랑이」 (ㅎ이라 「ㄱㄴㄷ」이 죽는다)
	//   rc-club-nobatchim      거절에 「사십」 (첫 글자엔 받침이 없다)
	//   nm-double-half         9 → 28 (홀수 점이 둘이라 3n+1이 유일해진다)
	//   rc-chain-shrink        지문에 「첫 글자 S는 그대로」 (TING이 사전에 있었다)
	//   club-doer              해설이 자기 기준을 자기 회원에 안 지켰다(DRIV·BAK도 동사가 아니다)
	//   rc-club-compound       **자리 교체** — 거절 예시 별꽃과 탈락 후보 하늘땅·봄가을이
	//                          전부 표준국어대사전 표제어라 ①③만 고르는 규칙이 존재하지
	//                          않았다. 예시로는 못 고쳐서 같은 인덱스(222)에 rc-club-echo를
	//                          넣었다 — goldenSets가 「자리 교체는 허용된 정책」이라 적어 뒀다
	//
	// 9/4에 계산형 94개(달력·시계·요일·시간·수의 성질·전광판·로마 숫자·자릿수)를 같은
	// 워크플로로 훑어 10건을 고쳤다. 이 검사기가 보는 종류가 아니라 여기 목록엔 없다 —
	// 대안 규칙 2건(lcd-hidden-digits·num-parityorder)만 발견형과 같은 병이었고, 나머지는
	// 계산형 고유였다. 정답 키의 산수 오류는 94개 중 0건.
	//   경계 약속이 지문에 없다  cal-leap-birthdays 5/4 · cal-clock-overlap 22/23 ·
	//                            num-odometer 4/3 — 셋 다 해설엔 못 박혀 있었다
	//   답 받는 장치            cal-clock-opposite(선택지 ④가 ①과 집합 동일해 정답이 둘) ·
	//                            cal-fifty-hours('수요일 12:00'이 정규화에서 거절)
	//   화면·산수와 어긋난 말   lcd-flip · nm-4100-trap · cal-billion-seconds
	// 이 다섯 종류를 앞으로 막으려고 puzzle-reviewer.md에 5h~5l을 넣었다.
].sort();

describe('발견형 규칙 유일성', () => {
	it('알려진 것 말고 새로 새는 문제가 없다', () => {
		const 새것 = 적발된_id().filter((id) => !알려진_적발.includes(id));
		expect(새것, '규칙이 안 조여진 문제가 새로 들어왔다 — npx vite-node scripts/rule-attack.mjs 로 확인하라').toEqual([]);
	});

	it('목록에 고친 것이 남아 있지 않다', () => {
		// 고쳐 놓고 목록을 안 지우면 그 자리가 다시 새도 안 걸린다
		const 지금 = 적발된_id();
		const 유령 = 알려진_적발.filter((id) => !지금.includes(id));
		expect(유령, '이제 안 걸리는 id가 목록에 남아 있다 — 지워라').toEqual([]);
	});

	it('검사기가 실제로 문제를 읽고 있다', () => {
		// 파싱이 통째로 깨지면 「적발 0」이 되어 위 두 테스트가 조용히 통과한다
		const [op, seq, club] = [attackOps(), attackSeqs(), attackClubs()];
		expect(op.검사수, '이상한 연산').toBeGreaterThanOrEqual(20);
		expect(seq.검사수, '수열·사슬').toBeGreaterThanOrEqual(15);
		expect(club.검사수 + club.낱말형, '클럽').toBeGreaterThanOrEqual(29);
		// 판단 불가가 전부를 먹으면 검사한 것이 없는 것과 같다
		for (const [name, r] of [
			['이상한 연산', op],
			['수열·사슬', seq]
		] as const)
			expect(r.적발.length + r.통과.length, `${name} — 판단 불가가 전부를 먹었다`).toBeGreaterThan(0);
	});
});
