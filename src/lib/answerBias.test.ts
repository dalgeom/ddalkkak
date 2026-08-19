import { describe, it, expect } from 'vitest';
import { TRIVIA } from './trivia';
import { displayChoices } from './game';

/**
 * 정답이 첫 보기에 몰리는 편향.
 *
 * 원본 데이터는 74%가 0번인데(생성할 때 정답을 앞에 쓰는 습관), 게임 화면은
 * displayChoices의 시드 셔플이 이걸 흩어 준다. 문제는 SEO 공개 페이지가 한동안
 * 셔플 없이 원본 순서를 그대로 내보내, 공개된 문제지가 "답은 늘 A"로 보였다는 것.
 * 셔플을 태운 뒤에도 그 성질이 유지되는지 여기서 지킨다.
 */
describe('정답 위치 편향', () => {
	const choiceItems = TRIVIA.filter((t) => t.type === 'choice' && t.choices?.length);

	it('셔플 후에는 어느 자리도 절반을 넘지 않는다', () => {
		const at = [0, 0, 0, 0, 0, 0];
		for (const t of choiceItems) at[displayChoices(t).answerIndex ?? 0]++;
		const max = Math.max(...at) / choiceItems.length;
		expect(max, `분포 ${at.join('/')} — 한 자리에 쏠렸다`).toBeLessThan(0.5);
	});

	it('셔플해도 정답 내용은 그대로다', () => {
		for (const t of choiceItems) {
			const s = displayChoices(t);
			expect(s.choices![s.answerIndex!], t.id).toBe(t.choices![t.answerIndex ?? 0]);
		}
	});
});
