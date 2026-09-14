import type { Problem } from './problems';

/**
 * 내일 예고 — 결과 화면에서 내일 발견형 문제의 **첫 예시 한 줄**만 흘린다.
 *
 * 8/19(#219)부터 예고는 유형 이름 셋(「수열 · 달력 · 클럽」)이었다. 이름은 궁금증을 만들지
 * 못한다 — 「V = 1 · A = 0」 같은 한 줄이 있어야 「이게 뭐지」가 생긴다. 알림은 22명에게
 * 권해 3명, 설치는 41명에게 권해 1명이 받았다(8/01~9/13). 권한 없이 돌아오게 할 장치가 필요하다.
 *
 * 세트는 날짜로 정해져 내일 것을 지금 계산할 수 있고, 낮에 문제를 추가해도 내일 세트는
 * 안 바뀐다(pickStable은 새 문제를 분야 레인 끝에 붙이고 포인터가 닿아야 낸다).
 * 물음표가 든 줄은 문제 그 자체라 절대 내보내지 않는다.
 */
export type Teaser = { chip: string; line: string | null };

const MAX = 22;
/** ExampleList와 같은 기준 — 한글로 끝나는 마침표 줄은 예시가 아니라 안내 문장이다 */
const isProse = (l: string) => /[가-힣]\.$/.test(l);

export function teaserOf(p: Problem): Teaser {
	for (const b of p.blocks) {
		const lines = b.kind === 'pre' ? b.text.split('\n') : b.kind === 'glyph' ? b.lines : null;
		if (!lines) continue;
		const first = lines.map((l) => l.trim()).find((l) => l && !isProse(l));
		if (!first || first.includes('?')) return { chip: p.chip, line: null };
		return { chip: p.chip, line: first.length > MAX ? first.slice(0, MAX - 1) + '…' : first };
	}
	return { chip: p.chip, line: null };
}
