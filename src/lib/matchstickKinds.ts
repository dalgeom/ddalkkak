/**
 * 성냥개비 문제를 '해법이 어떤 기술을 쓰는가'로 나눈다. /matchstick/<slug> 페이지가 쓴다.
 *
 * 741개를 그냥 한 줄씩 늘어놓으면 얄팍한 목록이라 검색엔진이 값을 안 쳐준다.
 * 다행히 분류를 데이터에서 뽑아낼 수 있다 — 문제와 정답의 보드를 비교하면
 * 성냥이 어디서 어디로 갔는지가 그대로 나온다. 손으로 태깅하지 않는다.
 *
 * 셋은 matchstick/guide가 설명하는 세 가지 기술과 같다.
 */
import { parseEq } from './matchstick';

export type MatchKind = 'self' | 'transfer' | 'operator';

/**
 * 정답이 성냥을 어떻게 옮겼는지.
 *
 *   operator  연산자가 +↔− 로 바뀐다
 *   self      숫자 하나만 달라진다 — 성냥이 그 숫자 밖으로 안 나갔다
 *   transfer  숫자 둘이 달라진다 — 한쪽에서 뽑아 다른 쪽에 붙였다
 */
export function kindOf(displayed: string, solution: string): MatchKind {
	const a = parseEq(displayed);
	const b = parseEq(solution);
	if (a.opPlus !== b.opPlus) return 'operator';
	// 성냥 하나로는 자릿수가 늘거나 줄 수 없지만, 데이터가 바뀌면 여기서 조용히 깨진다
	if (a.glyphs.length !== b.glyphs.length) return 'transfer';
	const changed = a.glyphs.filter((g, i) => g !== b.glyphs[i]).length;
	return changed === 1 ? 'self' : 'transfer';
}

export type MatchKindMeta = {
	/** URL 슬러그 — 변경 금지 */
	slug: string;
	kind: MatchKind;
	/** 페이지 제목에 쓰는 이름 (검색어에 맞춘 표현) */
	title: string;
	/** 빵부스러기·목록에 쓰는 짧은 이름 */
	short: string;
	/** 그 유형을 설명하는 두세 문장 */
	intro: string;
	/** 푸는 요령 — 문단으로 쓴다 */
	how: string[];
	/** 대표 예시. 테스트가 데이터에 실제로 있고 이 유형인지 검사한다. */
	example: { displayed: string; solution: string };
};

export const MATCH_KINDS: MatchKindMeta[] = [
	{
		slug: 'self',
		short: '한 숫자 안',
		kind: 'self',
		title: '숫자 하나만 바꾸는 성냥개비 문제',
		intro:
			'뽑은 성냥을 같은 숫자 안에 다시 꽂아 다른 숫자로 만드는 유형입니다. 성냥이 그 자리를 벗어나지 않아서, 나머지 숫자는 건드릴 필요가 없습니다.',
		how: [
			'제 획만 옮겨서 변신하는 숫자는 정해져 있습니다. 0은 6이나 9가 되고, 6과 9는 서로 오갑니다. 2와 3, 3과 5도 마찬가지입니다. 이 열 쌍이 이 유형의 전부입니다.',
			'그래서 순서가 거꾸로입니다. 성냥을 어디로 옮길지 고민하지 말고, 식을 참으로 만들려면 어느 자리가 무엇이 되어야 하는지를 먼저 정하세요. 그 다음 그 변신이 위 목록에 있는지 확인하면 됩니다.',
			'0 − 1 = 8이라면 왼쪽이 9여야 식이 맞습니다. 0에서 9로 가는 길이 목록에 있으니, 왼쪽 아래 획을 가운데로 옮기면 끝납니다.'
		],
		example: { displayed: '0 - 1 = 8', solution: '9 - 1 = 8' }
	},
	{
		slug: 'transfer',
		short: '숫자끼리',
		kind: 'transfer',
		title: '숫자끼리 옮기는 성냥개비 문제',
		intro:
			'한 숫자에서 성냥을 뽑아 다른 숫자에 붙이는 유형입니다. 숫자 두 개가 동시에 바뀌기 때문에 한 자리만 보고 있으면 답이 안 보입니다.',
		how: [
			'주는 쪽과 받는 쪽을 따로 생각하세요. 획을 잃고도 숫자로 남는 것은 6→5, 7→1, 8→0·6·9, 9→3·5뿐입니다. 획을 얻는 쪽은 0→8, 1→7, 3→9, 5→6·9, 6→8, 9→8입니다.',
			'대부분 8이 열쇠입니다. 획이 가장 많아서 내줄 것이 있고, 받아서 8이 될 수 있는 숫자도 많습니다. 식에 8이 있으면 거기부터 의심하세요.',
			'0 + 1 = 8은 왼쪽 0이 8을 받아야 할 것 같지만, 반대로 오른쪽 8이 9가 되고 0이 8이 되는 쪽이 답입니다. 주는 쪽과 받는 쪽을 바꿔 보는 것이 이 유형의 요령입니다.'
		],
		example: { displayed: '0 + 1 = 8', solution: '8 + 1 = 9' }
	},
	{
		slug: 'operator',
		short: '연산자',
		kind: 'operator',
		title: '연산자를 바꾸는 성냥개비 문제',
		intro:
			'+와 − 사이에서 성냥이 오가는 유형입니다. 숫자만 들여다보면 아무리 해도 답이 없어서, 가장 많이 막히는 유형이기도 합니다.',
		how: [
			'+는 −에 세로획 하나를 얹은 모양입니다. 그래서 +에서 세로획을 뽑으면 −가 되면서 성냥 하나가 손에 남고, 반대로 −에 획을 하나 주면 +가 됩니다.',
			'막혔을 때 확인하는 방법이 있습니다. 좌변과 우변의 차이를 보세요. 부호만 뒤집으면 값이 크게 움직입니다. 숫자를 아무리 만져도 그 간격이 안 메워진다면 연산자를 봐야 한다는 신호입니다.',
			'0 + 2 = 6은 숫자만으로는 풀리지 않습니다. +의 세로획을 뽑아 −로 만들고, 그 성냥을 0의 가운데에 놓으면 8이 됩니다. 8 − 2 = 6.'
		],
		example: { displayed: '0 + 2 = 6', solution: '8 - 2 = 6' }
	}
];

export const matchKindBySlug = (slug: string): MatchKindMeta | undefined =>
	MATCH_KINDS.find((k) => k.slug === slug);
