import { describe, it, expect } from 'vitest';
import { isOffTone, styleIssues, sentencesOf, factsOf } from './style';
import { styleTexts, type StyleScope } from './styleTexts';

/**
 * 해요체로 고친 범위만 여기에 넣는다. 한 번에 다 고칠 수 없어서 단계마다 늘린다(docs/문체.md).
 * 넣은 범위에서 「~다.」 문장이나 대시가 다시 나오면 CI가 깨진다.
 */
const ENFORCED: StyleScope[] = ['fields', 'articles', 'explains', 'stems'];

describe('문체 검사기', () => {
	it('해요체는 통과, 합니다체·한다체는 위반', () => {
		for (const ok of ['정답은 8이에요.', '두 글자가 더 어렵거든요.', '왜 그럴까요?', '이게 전부죠.', '→ 코끼리', '물음표는?', '몇 등?', '정답은 보라.'])
			expect(isOffTone(ok), ok).toBe(false);
		for (const bad of ['정답은 8입니다.', '하루를 너무 많이 넣었다.', '순서가 선다', '맞습니까?', '초대 황제는 누구인가?', '몇 개일까?', '규칙을 찾아라.', '같이 풀어 보자.'])
			expect(isOffTone(bad), bad).toBe(true);
	});

	it('예시(pre)·그림(svg)은 문장으로 보지 않는다', () => {
		const html = '<p>이렇게 돼요.</p><div class="ex"><pre>2 + 3 = 5이다.</pre></div><svg><text>틀렸다</text></svg>';
		expect(sentencesOf(html)).toEqual(['이렇게 돼요.']);
	});

	it('대시를 잡는다', () => {
		expect(styleIssues('<p>답은 8 — 가운데예요.</p>').map((i) => i.kind)).toEqual(['dash']);
	});

	it('사실 지문은 숫자와 태그를 순서대로 뽑는다', () => {
		expect(factsOf('<p>1,000개 중 <b>96</b>개예요.</p>')).toEqual({
			nums: ['1000', '96'],
			tags: ['<p', '<b', '</b', '</p']
		});
	});

	// 양성 대조 — 검사 대상 목록이 실제로 글을 읽고 있어야 아래 검사가 의미 있다
	it('검사 대상이 비어 있지 않고, 아직 안 고친 범위에서는 위반을 잡는다', () => {
		const texts = styleTexts();
		for (const s of ['fields', 'articles', 'explains', 'stems'] as StyleScope[])
			expect(texts.filter((t) => t.scope === s).length, s).toBeGreaterThan(10);
		const pending = texts.filter((t) => !ENFORCED.includes(t.scope));
		if (pending.length) expect(pending.some((t) => styleIssues(t.text).length > 0)).toBe(true);
		// 전 범위를 켠 뒤에는 위 대조가 빈다(9/30). 실제 글의 해요체를 한다체로 되돌려 넣으면
		// 검사기가 잡는지로 대신 본다 — 검사기가 죽어 있으면 아래 범위 검사는 빈손으로 통과한다
		const sample = texts.find((t) => t.scope === 'articles')!.text.replace(/요\./g, '다.');
		expect(styleIssues(sample).length).toBeGreaterThan(0);
	});
});

describe('해요체로 고친 범위', () => {
	for (const scope of ['fields', 'articles', 'explains', 'stems'] as StyleScope[]) {
		it.skipIf(!ENFORCED.includes(scope))(`${scope}: 「~다.」 문장과 대시가 없다`, () => {
			const bad = styleTexts()
				.filter((t) => t.scope === scope)
				.flatMap((t) => styleIssues(t.text).map((i) => `${t.key} [${i.kind}] ${i.text}`));
			expect(bad, bad.slice(0, 10).join('\n')).toEqual([]);
		});
	}
});
