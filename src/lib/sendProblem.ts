import type { Problem } from './problems';
import type { Mark } from './game';

/**
 * 문제 보내기 — 푼 문제 하나를 대화방에 던지는 링크(`/q/<id>?r=c`).
 *
 * 왜: 결과 공유는 완주한 사람만 보는데(9/01~30 완주 37명), 그중 공유한 사람이 3명이었다(n=37).
 * 점수는 자랑할 때만 보낸다. 「이거 너는 풀까?」는 틀렸을 때도 보낸다 — 못 푼 문제가
 * 오히려 더 보낼 만하다. 받은 사람은 홈이 아니라 그 문제 하나로 바로 들어와 30초 안에 푼다.
 *
 * r은 보낸 사람이 어떻게 풀었는지다(c 한 번에 · h 몇 번 만에 · m 못 풂). 보낸 사람 브라우저가
 * 만든 값이라 믿을 근거가 없다 — 화면에 「친구는 ~」로 보여 줄 뿐 어디에도 저장하지 않는다.
 */
const CODE: Record<Mark, string> = { clean: 'c', hinted: 'h', miss: 'm' };

export function markParam(m: Mark): string {
	return CODE[m];
}

export function parseMark(raw: string | null | undefined): Mark | null {
	const hit = (Object.keys(CODE) as Mark[]).find((k) => CODE[k] === raw);
	return hit ?? null;
}

export function sendUrl(origin: string, id: string, mark: Mark | null): string {
	const r = mark ? `r=${CODE[mark]}&` : '';
	return `${origin}/q/${encodeURIComponent(id)}?${r}utm_source=share&utm_medium=problem`;
}

/** 대화방에 붙는 글. 링크가 글 안에 있어야 이미지·미리보기가 빠져도 길이 남는다(shareCard.ts 주석) */
export function sendText(mark: Mark | null, url: string): string {
	const me =
		mark === 'clean'
			? '나는 한 번에 맞혔어요.'
			: mark === 'hinted'
				? '나는 몇 번 만에 겨우 맞혔어요.'
				: mark === 'miss'
					? '나는 못 풀었어요.'
					: '';
	return [`🤔 이 문제 풀 수 있어요?${me ? ' ' + me : ''}`, url].join('\n');
}

/** 받은 사람 화면 맨 위 한 줄 */
export function friendLine(mark: Mark | null): string {
	if (mark === 'clean') return '친구는 이 문제를 한 번에 맞혔어요.';
	if (mark === 'hinted') return '친구는 이 문제를 몇 번 만에 맞혔어요.';
	if (mark === 'miss') return '친구는 이 문제를 못 풀었어요. 풀 수 있을까요?';
	return '친구가 이 문제를 보냈어요.';
}

/** 링크 미리보기 제목 — 대화방에서 눌러 볼 이유는 여기서 생긴다 */
export function previewTitle(mark: Mark | null): string {
	if (mark === 'clean') return '친구는 한 번에 맞혔어요. 몇 번 만에 풀까요?';
	if (mark === 'hinted') return '친구는 몇 번 만에 맞혔어요. 더 빨리 풀까요?';
	if (mark === 'miss') return '친구가 못 푼 문제예요. 풀 수 있을까요?';
	return '이 문제 풀 수 있어요?';
}

/** 둘을 견준 한 줄. 정답 > 오답, 정답끼리는 한 번에 > 몇 번 만에 */
export function compareLine(friend: Mark | null, me: Mark): string | null {
	if (!friend) return null;
	const rank: Record<Mark, number> = { clean: 2, hinted: 1, miss: 0 };
	if (rank[me] > rank[friend]) return '친구보다 잘 풀었어요. 되돌려 보내 보세요.';
	if (rank[me] < rank[friend]) return '이번엔 친구가 이겼어요.';
	return me === 'miss' ? '둘 다 못 풀었어요. 다른 친구는 풀까요?' : '친구와 비겼어요.';
}

/**
 * 링크 미리보기(카톡 og:description)에 실을 한 줄 — 예시 줄을 「 · 」로 잇는다.
 * 물음표 줄까지 실어도 된다. 답은 해설에만 있고, 미리보기는 「이게 뭐지」를 만드는 자리다.
 */
export function previewOf(p: Problem, max = 90): string {
	const strip = (h: string) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
	// 예시가 있으면 예시만 — 「어느 시계가…」 같은 안내 문장보다 「12:00 → 5:00」이 궁금증을 만든다.
	// 상식처럼 예시가 없는 문제는 지문을 싣는다
	const examples: string[] = [];
	const prose: string[] = [];
	for (const b of p.blocks) {
		if (b.kind === 'pre') examples.push(...b.text.split('\n').map((l) => l.trim()).filter(Boolean));
		else if (b.kind === 'glyph') examples.push(...b.lines.map((l) => l.trim()).filter(Boolean));
		else if (b.kind === 'text') prose.push(strip(b.html));
	}
	const s = (examples.length ? examples : prose).join(' · ');
	return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
