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
	// 답이 갈린다 — 사람이 실제로 세울 가설이고 답이 다르다
	'palindrome-branch', // 「a > b면 더하고 아니면 뺀다」가 예시 셋을 다 통과해 154
	'digitwise-add', // 34⊕21=55가 통째 덧셈과 같아 홀짝 갈림이 성립 → 83
	'consecutive-sum-club', // 회원 9·12·15·21이 전부 3의 배수 → {24,45}
	// 성립하지만 억지스러운 대안
	'num-carry-count',
	'num-hundred-gap',
	'odd-even-branch',
	'size-branch',
	'square-diff',
	'clock-add',
	'nm-digit-chain',
	// 「이상한 연산」인데 자명한 연산이다 — 해설이 주장하는 발견이 없다
	'num-place-add' // 네 줄 전부 그냥 a+b인데 해설은 「올림이 없다는 게 드러난다」
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
