import { describe, it, expect } from 'vitest';
import { TRIVIA } from './trivia';

/**
 * 상식 해설 길이 검사.
 *
 * 해설이 짧으면 정답을 되풀이하는 문장이 되기 쉽다. "이탈리아는 파스타와 피자의
 * 본고장으로 유명하다" 같은 것은 읽고 나서 남는 것이 없고, 그런 문제가 모이면
 * 분야 페이지 19개가 어디서나 볼 수 있는 퀴즈 목록이 된다. 2026-08-24에 425개 중
 * 132개가 60자 미만이던 것을 전부 손봤고, 이 검사가 그 상태를 지킨다.
 *
 * 길이는 품질의 대리 지표일 뿐이다. 60자를 넘겼다고 좋은 해설이 되는 것은 아니지만,
 * 60자 안에 정답 확인과 그 이유를 함께 담기는 어렵다.
 */
const MIN = 60;
const plain = (html: string) => html.replace(/<[^>]+>/g, '');

describe('상식 해설', () => {
	it('모든 해설이 최소 길이를 넘는다', () => {
		const short = TRIVIA.filter((t) => plain(t.explain ?? '').length < MIN).map(
			(t) => `${t.id}(${plain(t.explain ?? '').length}자)`
		);
		expect(short, `${MIN}자 미만 해설:\n  ${short.join('\n  ')}`).toEqual([]);
	});

	it('해설이 비어 있는 문제가 없다', () => {
		const empty = TRIVIA.filter((t) => !t.explain?.trim()).map((t) => t.id);
		expect(empty, `해설 없음: ${empty.join(', ')}`).toEqual([]);
	});

	it('검사가 실제로 잡는다 — 짧은 해설을 넣으면 걸린다', () => {
		const fake = { id: 'tv-fake', explain: '정답은 서울이다.' };
		expect(plain(fake.explain).length).toBeLessThan(MIN);
	});
});
