/**
 * 발견형 분야별 페이지(/discover/<slug>)를 위한 메타데이터.
 *
 * triviaCategories.ts와 같은 이유로 존재한다 — 한글 분야명을 URL에 그대로 쓰면
 * 퍼센트 인코딩돼서 공유·사이트맵·canonical이 지저분해진다. 슬러그는 한번 정하면
 * 바꾸지 않는다(색인이 끊긴다).
 *
 * name은 problems.ts의 DiscoverField와 정확히 일치해야 한다. 타입으로 묶어 뒀으니
 * 오타는 컴파일에서 걸린다.
 *
 * title은 사람들이 실제로 검색하는 말에 맞춘다. '발견형 퍼즐'은 딸깍이 지어낸
 * 이름이라 아무도 검색하지 않는다. '규칙 찾기 문제'는 검색된다.
 *
 * intro는 분야마다 다른 글을 쓴다. 같은 틀에 이름만 바꿔 끼우면 페이지가 서로
 * 복제본으로 보인다.
 */
import type { DiscoverField } from './problems';

export type DiscoverFieldMeta = {
	/** URL 슬러그 — 변경 금지 */
	slug: string;
	/** problems.ts의 DiscoverField 값 */
	name: DiscoverField;
	/** 페이지 제목에 쓰는 이름 (검색어에 맞춘 표현) */
	title: string;
	/** 그 분야를 설명하는 두세 문장 */
	intro: string;
};

export const DISCOVER_FIELD_META: DiscoverFieldMeta[] = [
	{
		slug: 'number',
		name: '수·연산',
		title: '숫자 규칙 찾기 문제',
		intro:
			'낯선 기호가 하나 나오고, 그게 무슨 계산인지는 알려주지 않습니다. 예시 몇 줄만 보고 규칙을 직접 세워야 하는 문제들입니다. 사칙연산만 알면 풀 수 있지만, 계산이 아니라 눈치가 필요합니다.'
	},
	{
		slug: 'word',
		name: '언어·문자',
		title: '글자·단어 규칙 찾기 문제',
		intro:
			'한글 자모, 알파벳, 자판 배열, 사자성어처럼 글자 자체에 숨은 규칙을 다룹니다. 답이 숫자가 아니라 단어라서, 규칙을 찾고도 한 번 더 생각해야 하는 경우가 많습니다.'
	},
	{
		slug: 'calendar',
		name: '달력·시간',
		title: '달력·시간 퍼즐 문제',
		intro:
			'요일, 날짜, 시계 바늘처럼 주기가 있는 것들을 다룹니다. 7일마다 돌아오고 12시간마다 겹치는 구조를 알아채면 계산 없이 답이 나옵니다. 13일의 금요일이 왜 생기는지 같은 것들이 여기 있습니다.'
	},
	{
		slug: 'rule',
		name: '규칙·분류',
		title: '공통점 찾기·분류 문제',
		intro:
			'여러 개를 늘어놓고 "이 중에 뭐가 다른가" 또는 "이것들의 공통점은 무엇인가"를 묻습니다. 답이 대상 자체가 아니라 대상을 부르는 이름에 있는 경우가 많아서, 한 겹 벗겨내야 보입니다.'
	},
	{
		slug: 'shape',
		name: '도형·전광판',
		title: '도형·전광판 퍼즐 문제',
		intro:
			'전자시계 숫자를 돌리거나 뒤집었을 때 무엇으로 보이는지, 도형을 접고 겹치면 어떤 모양이 되는지를 묻습니다. 머릿속에서 실제로 돌려봐야 하는 공간지각 문제들입니다.'
	},
	{
		slug: 'observe',
		name: '관찰·추리',
		title: '관찰·추리 퍼즐 문제',
		intro:
			'문제 안에 답이 이미 적혀 있는데 눈에 안 들어오는 종류입니다. 조건을 하나씩 지워 나가거나, 아무도 세지 않은 것을 세어 보면 풀립니다. 함정은 대부분 "당연히 그럴 것"이라는 생각에 있습니다.'
	}
];

export const fieldMetaBySlug = (slug: string): DiscoverFieldMeta | undefined =>
	DISCOVER_FIELD_META.find((f) => f.slug === slug);

export const fieldMetaByName = (name: string): DiscoverFieldMeta | undefined =>
	DISCOVER_FIELD_META.find((f) => f.name === name);
