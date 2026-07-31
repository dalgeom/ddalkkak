/**
 * 상식 퀴즈 분야별 페이지(/trivia/<slug>)를 위한 메타데이터.
 *
 * 한글 카테고리명을 URL에 그대로 쓰면 퍼센트 인코딩돼서 공유·사이트맵·canonical이 지저분해진다.
 * 그래서 분야마다 영문 슬러그를 하나씩 고정해 둔다 — 한번 정하면 바꾸지 않는다(색인이 끊긴다).
 *
 * intro는 분야마다 다른 글을 쓴다. 같은 틀에 이름만 바꿔 끼우면 페이지가 서로 복제본으로 보인다.
 */
export type TriviaCategory = {
	/** URL 슬러그 — 변경 금지 */
	slug: string;
	/** trivia.ts의 category 값과 정확히 일치해야 한다 */
	name: string;
	/** 페이지 제목에 쓰는 이름 (검색어에 맞춘 표현) */
	title: string;
	/** 그 분야를 설명하는 두세 문장 */
	intro: string;
};

export const TRIVIA_CATEGORIES: TriviaCategory[] = [
	{
		slug: 'korean-history',
		name: '한국사',
		title: '한국사 상식 퀴즈',
		intro:
			'고조선부터 근현대까지, 교과서에서 한 번은 마주쳤던 사건과 인물을 다시 꺼내 봅니다. 연도를 외우는 문제보다는 "그래서 그게 왜 중요했나"를 묻는 쪽에 가깝습니다.'
	},
	{
		slug: 'geography',
		name: '지리',
		title: '지리 상식 퀴즈',
		intro:
			'나라와 수도, 바다와 산맥처럼 지도 위에서 답이 나오는 문제들입니다. 세계에서 가장 넓은 나라나 가장 작은 나라처럼, 안다고 생각했는데 막상 물으면 헷갈리는 것들을 모았습니다.'
	},
	{
		slug: 'general',
		name: '상식',
		title: '생활 상식 퀴즈',
		intro:
			'어느 분야로도 딱 묶이지 않지만 알아두면 대화가 되는 것들입니다. 생활 속에서 매일 쓰면서도 원리는 설명하기 어려운 것들이 많이 들어 있습니다.'
	},
	{
		slug: 'art',
		name: '예술',
		title: '예술·미술 상식 퀴즈',
		intro:
			'그림과 조각, 화가와 사조를 다룹니다. 작품 이름은 익숙한데 누가 그렸는지는 가물가물한 순간, 딱 그 지점을 노린 문제들입니다.'
	},
	{
		slug: 'world-history',
		name: '세계사',
		title: '세계사 상식 퀴즈',
		intro:
			'로마와 이집트부터 두 번의 세계대전까지, 세계가 어떻게 지금 모양이 됐는지를 짚습니다. 사건 하나가 다음 사건을 어떻게 불렀는지가 해설에 함께 붙습니다.'
	},
	{
		slug: 'science',
		name: '과학',
		title: '과학 상식 퀴즈',
		intro:
			'물리·화학·생물·지구과학을 두루 다룹니다. 공식을 계산하는 문제는 없고, 현상의 이유를 아는지 묻습니다.'
	},
	{
		slug: 'idiom',
		name: '사자성어',
		title: '사자성어 퀴즈',
		intro:
			'뜻을 보고 성어를 맞히거나, 성어를 보고 쓰임을 고릅니다. 한자를 몰라도 풀 수 있게 냈고, 해설에 유래를 함께 적었습니다.'
	},
	{
		slug: 'literature',
		name: '문학',
		title: '문학 상식 퀴즈',
		intro:
			'국내외 작품과 작가를 다룹니다. 첫 문장이나 등장인물처럼, 읽었다면 기억에 남았을 조각들로 묻습니다.'
	},
	{
		slug: 'figures',
		name: '위인',
		title: '위인·인물 상식 퀴즈',
		intro:
			'역사에 이름을 남긴 사람들이 실제로 무엇을 했는지 묻습니다. 이름은 유명한데 업적은 헷갈리는 인물이 생각보다 많습니다.'
	},
	{
		slug: 'proverb',
		name: '속담',
		title: '속담 퀴즈',
		intro:
			'앞부분을 보고 뒷부분을 맞히거나, 속담의 진짜 뜻을 고릅니다. 흔히 쓰지만 원래 의미와 다르게 알려진 것들도 섞여 있습니다.'
	},
	{
		slug: 'sports',
		name: '스포츠',
		title: '스포츠 상식 퀴즈',
		intro:
			'종목의 규칙과 기록, 올림픽과 월드컵을 다룹니다. 경기를 즐겨 봤다면 유리하지만, 몰라도 해설을 읽으면 남는 것이 있습니다.'
	},
	{
		slug: 'animal',
		name: '동물',
		title: '동물 상식 퀴즈',
		intro:
			'동물의 습성과 몸의 구조, 기록에 관한 문제들입니다. 가장 빠른 동물이나 가장 오래 사는 동물처럼 답이 의외인 것들이 많습니다.'
	},
	{
		slug: 'game',
		name: '게임',
		title: '게임 상식 퀴즈',
		intro:
			'고전 아케이드부터 요즘 게임까지, 이름과 배경 설정을 다룹니다. 한 시대를 같이 보낸 사람이라면 반가운 문제가 나옵니다.'
	},
	{
		slug: 'food',
		name: '음식',
		title: '음식 상식 퀴즈',
		intro:
			'재료와 조리법, 음식의 국적과 이름의 유래를 묻습니다. 매일 먹으면서도 어디서 왔는지는 몰랐던 것들이 대부분입니다.'
	},
	{
		slug: 'music',
		name: '음악',
		title: '음악 상식 퀴즈',
		intro:
			'클래식과 대중음악, 악기와 작곡가를 다룹니다. 멜로디는 아는데 제목이나 작곡가는 모르는 곡들을 골랐습니다.'
	},
	{
		slug: 'origin',
		name: '유래',
		title: '어원·유래 퀴즈',
		intro:
			'말과 물건, 관습이 어디서 시작됐는지를 묻습니다. 매일 쓰는 단어의 출처를 알고 나면 그 단어가 조금 달라 보입니다.'
	},
	{
		slug: 'space',
		name: '우주',
		title: '우주·천문 상식 퀴즈',
		intro:
			'행성과 별, 탐사선과 관측에 관한 문제들입니다. 숫자의 규모가 커서, 감이 잘 안 잡히는 것들을 해설에서 익숙한 크기로 바꿔 설명합니다.'
	},
	{
		slug: 'movie-drama',
		name: '영화드라마',
		title: '영화·드라마 상식 퀴즈',
		intro:
			'작품의 감독과 배우, 대사와 설정을 다룹니다. 본 사람에게는 쉽고 안 본 사람에게는 궁금해지는 쪽으로 냈습니다.'
	}
];

const BY_SLUG = new Map(TRIVIA_CATEGORIES.map((c) => [c.slug, c]));
const BY_NAME = new Map(TRIVIA_CATEGORIES.map((c) => [c.name, c]));

export function categoryBySlug(slug: string): TriviaCategory | undefined {
	return BY_SLUG.get(slug);
}

export function categoryByName(name: string): TriviaCategory | undefined {
	return BY_NAME.get(name);
}
