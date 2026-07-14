export type Block =
	| { kind: 'text'; html: string }
	| { kind: 'pre'; text: string }
	| { kind: 'lcd'; lines: string[] }
	| { kind: 'colors'; rows: string[] };

export interface Problem {
	id: string;
	chip: string;
	blocks: Block[];
	type: 'text' | 'choice';
	answers?: string[];
	choices?: string[];
	answerIndex?: number;
	hints: [string, string, string];
	explain: string;
}

export const PROBLEMS: Problem[] = [
	{
		id: 'holiday',
		chip: '숫자 아님',
		blocks: [
			{ kind: 'text', html: '물음표에 들어갈 수는?' },
			{ kind: 'pre', text: '11 - 31 - 55 - 66 - ? - 103 - 109 - 1225' }
		],
		type: 'text',
		answers: ['815'],
		hints: [
			'수학이 아닙니다. 이 숫자들을 "무언가"로 읽어 보세요.',
			'달력을 펴 보세요. 전부 빨간 날입니다.',
			'6월 6일과 10월 3일 사이, 양력으로 고정된 공휴일은?'
		],
		explain:
			'전부 날짜입니다 — <b>양력 고정 공휴일</b>: 1/1 신정, 3/1 삼일절, 5/5 어린이날, 6/6 현충일, <b>8/15 광복절</b>, 10/3 개천절, 10/9 한글날, 12/25 성탄절. 답 <b>815</b>.'
	},
	{
		id: 'diamond-op',
		chip: '이상한 연산',
		blocks: [
			{ kind: 'text', html: '◆의 규칙을 찾아라.' },
			{ kind: 'pre', text: '9 ◆ 9 = 18\n3 ◆ 4 = 21\n7 ◆ 8 = 65\n\n6 ◆ 7 = ?' }
		],
		type: 'text',
		answers: ['24'],
		hints: [
			'첫 줄만 보면 덧셈 같지만, 둘째 줄에서 무너집니다.',
			'두 수를 먼저 곱해 보세요. 81, 12, 56… 결과와 비교하면?',
			'곱한 값을 거꾸로 읽어 보세요.'
		],
		explain:
			'두 수의 <b>곱을 거꾸로 쓴 것</b>. 9×9=81→18, 3×4=12→21, 7×8=56→65. 6×7=42 → 답 <b>24</b>.'
	},
	{
		id: 'mirror-word',
		chip: '거울',
		blocks: [
			{
				kind: 'text',
				html: '어떤 영어 단어를 거울에 비추었더니 <b>"MAY"</b>로 읽혔다.<br>원래 단어는?'
			}
		],
		type: 'text',
		answers: ['yam', '얌'],
		hints: [
			'거울은 두 가지를 뒤집습니다 — 글자의 모양, 그리고 글자의 순서.',
			'M, A, Y는 좌우로 뒤집어도 모양이 똑같은 글자들입니다.',
			'글자는 살아남으니, 순서만 뒤집으면?'
		],
		explain:
			'M·A·Y는 <b>좌우대칭 글자</b>라 거울에서 모양이 살아남고 순서만 뒤집힙니다. <b>YAM</b>(고구마) ↔ MAY.'
	},
	{
		id: 'coin',
		chip: '생활 상식',
		blocks: [{ kind: 'pre', text: '10 = 돌\n50 = 풀\n100 = 사람\n500 = ?' }],
		type: 'text',
		answers: ['새', '학', '두루미'],
		hints: [
			'숫자에 단위를 붙여 보세요.',
			'주머니 속 동전을 꺼내 뒷면을 보세요.',
			'10원 다보탑(돌), 50원 벼(풀), 100원 이순신(사람)…'
		],
		explain:
			'동전 뒷면 도안의 <b>범주</b>: 10원 다보탑=돌, 50원 벼=풀, 100원 이순신=사람, 500원 학 = <b>새</b>.'
	},
	{
		id: 'chain-alpha',
		chip: '사슬',
		blocks: [
			{ kind: 'text', html: '물음표에 들어갈 것은?' },
			{ kind: 'pre', text: 'A  3  D  5  I  7  ?  9  Y' }
		],
		type: 'text',
		answers: ['p'],
		hints: [
			'문자와 숫자가 번갈아 나옵니다. 숫자는 "연료"입니다.',
			'알파벳을 순번으로 바꿔 보세요 (A=1).',
			'A(1)+3=4=D, D(4)+5=9=I. 그 다음은?'
		],
		explain:
			'순번+숫자=다음 문자: I(9)+7=<b>16=P</b>. 검산: P(16)+9=25=Y ✓. 문자만 보면 1,4,9,16,25 — 제곱수이기도 합니다.'
	},
	{
		id: 'color-add',
		chip: '색깔',
		blocks: [
			{ kind: 'text', html: '위 두 식은 성립한다. 마지막 줄의 <b>? ?</b>에 올 색은?' },
			{ kind: 'colors', rows: ['G R + Y O = P Y', 'O B - R Y = R O', 'R B + G R = ? ?'] }
		],
		type: 'choice',
		choices: ['파랑 · 남색', '보라 · 노랑', '남색 · 초록', '노랑 · 파랑'],
		answerIndex: 0,
		hints: [
			'색에는 누구나 아는 "순서"가 있습니다.',
			'빨주노초파남보.',
			'빨=1, 주=2, 노=3… 으로 바꿔 계산해 보세요.'
		],
		explain:
			'무지개 순번(빨1 주2 노3 초4 파5 남6 보7)으로 읽으면 41+32=73, 25−13=12 ✓. 마지막: 15+41=<b>56 = 파랑·남색</b>.'
	},
	{
		id: 'alien-math',
		chip: '외계어?',
		blocks: [
			{ kind: 'text', html: '물음표에 들어갈 것은? (답도 같은 형식으로)' },
			{ kind: 'pre', text: 'dl + dlf = tka\ntk + dh = rn\nclf − dbr = dlf\n\ntlq − vkf = ?' }
		],
		type: 'text',
		answers: ['dl', '이', '2'],
		hints: [
			'암호가 아닙니다. 키보드를 내려다보세요.',
			'한/영 키를 안 누르고 친 겁니다. dl = 이, dlf = 일…',
			'전부 숫자의 이름입니다. 이+일=삼 ✓. 그럼 십−팔은?'
		],
		explain:
			'한/영 미전환 타이핑: 이+일=삼, 사+오=구, 칠−육=일 — 전부 참! 십(10)−팔(8)=이 → 답 <b>dl</b>.'
	},
	{
		id: 'lcd-star',
		chip: '전광판',
		blocks: [
			{ kind: 'text', html: '전광판의 ★ 연산 규칙을 찾아라.' },
			{ kind: 'lcd', lines: ['7918 ★ 0632 = 7512', '4590 ★ 7638 = 1530', '9748 ★ 6395 = ?'] }
		],
		type: 'text',
		answers: ['5745'],
		hints: [
			'덧셈·뺄셈이 아닙니다. 서체가 왜 하필 디지털일까요?',
			'두 숫자를 투명 필름처럼 포개 보세요.',
			'둘 다 켜져 있는 획만 남기면?'
		],
		explain:
			'★ = 두 숫자를 포개서 <b>공통으로 켜진 획만</b> 남기기. 9∩6=5, 7∩3=7, 4∩9=4, 8∩5=5 → 답 <b>5745</b>.'
	},
	{
		id: 'lcd-broken',
		chip: '전광판',
		blocks: [
			{
				kind: 'text',
				html: '이 전광판은 <b>고장 나서 틀린 식</b>을 표시하고 있다.<br>원래 식의 정답(등호 오른쪽)은?'
			},
			{ kind: 'lcd', lines: ['13 + 72 = 31'] }
		],
		type: 'text',
		answers: ['91'],
		hints: [
			'어떤 획 하나가 모든 자리에서 고장 나 안 켜집니다.',
			'표시된 숫자들이 쓰는 획을 모아 보면, 왼쪽 위 세로획이 한 번도 안 쓰였습니다. 그게 고장 난 획입니다.',
			'그 획이 꺼지면 9는 3으로 보입니다. 화면의 3을 의심하세요.'
		],
		explain:
			'고장 획 = 왼쪽 위 세로. 9가 3으로 보이는 중 → 화면의 3들을 복원하면 <b>19+72=91</b>만 성립. 답 <b>91</b>.'
	},
	{
		id: 'lcd-flip',
		chip: '전광판',
		blocks: [
			{ kind: 'text', html: '물음표에 들어갈 수는?' },
			{ kind: 'lcd', lines: ['2519 + 1082 = 8953', '2061 + 9015 = ?'] }
		],
		type: 'text',
		answers: ['7008'],
		hints: [
			'평범한 덧셈이 아닙니다. 서체가 단서입니다.',
			'이 식엔 3, 4, 7이 하나도 없습니다 — 우연이 아닙니다.',
			'식을 180° 돌려 보세요. 각 수를 뒤집어서 더하면?'
		],
		explain:
			'각 수를 <b>180° 뒤집어</b> 더합니다: 2519→6152, 1082→2801, 합 8953 ✓. 문제: 2061→1902, 9015→5106 → <b>7008</b>.'
	},
	{
		id: 'digit-sum-op',
		chip: '이상한 연산',
		blocks: [
			{ kind: 'text', html: '◇의 규칙을 찾아라.' },
			{ kind: 'pre', text: '9 ◇ 9 = 9\n7 ◇ 8 = 11\n6 ◇ 7 = 6\n\n8 ◇ 8 = ?' }
		],
		type: 'text',
		answers: ['10'],
		hints: [
			'9◇9=9라고 항등은 아닙니다 — 둘째 줄이 부정하죠.',
			'두 수를 곱한 다음, 그 결과를 한 번 더 손보세요.',
			'곱의 각 자릿수를 더해 보세요.'
		],
		explain: '곱의 <b>자릿수합</b>: 81→9, 56→11, 42→6. 8×8=64 → 6+4 = <b>10</b>.'
	},
	{
		id: 'between-count',
		chip: '이상한 연산',
		blocks: [{ kind: 'pre', text: '3 ♥ 7 = 3\n2 ♥ 9 = 6\n5 ♥ 6 = 0\n\n4 ♥ 9 = ?' }],
		type: 'text',
		answers: ['4'],
		hints: [
			'두 수의 관계, 특히 "거리"를 생각해 보세요.',
			'3과 7 사이에 무엇이 있는지 세어 보세요.',
			'두 수 사이에 낀 정수의 개수입니다.'
		],
		explain: '두 수 <b>사이에 있는 정수의 개수</b>: 3과 7 사이엔 4,5,6. 4와 9 사이엔 5,6,7,8 → <b>4</b>.'
	},
	{
		id: 'roman-len',
		chip: '숫자 아님',
		blocks: [{ kind: 'pre', text: '8 = 4\n3 = 3\n9 = 2\n\n6 = ?' }],
		type: 'text',
		answers: ['2'],
		hints: [
			'8=4를 보고 "÷2"라고 생각했다면 3=3에서 무너집니다.',
			'숫자를 다른 표기법으로 써 보세요 — 시계 문자판에 있는 그것.',
			'로마 숫자로 쓰면 글자가 몇 개인가요?'
		],
		explain: '<b>로마 숫자 표기의 글자 수</b>: VIII=4, III=3, IX=2. 6=VI → <b>2</b>.'
	},
	{
		id: 'divisor-count',
		chip: '수의 성질',
		blocks: [{ kind: 'pre', text: '12 ▲ = 6\n7 ▲ = 2\n16 ▲ = 5\n\n24 ▲ = ?' }],
		type: 'text',
		answers: ['8'],
		hints: [
			'12→6이 나누기처럼 보이지만 7→2에서 죽습니다.',
			'각 수를 나누어떨어지게 하는 수들을 찾아 보세요.',
			'약수를 전부 세어 보세요.'
		],
		explain: '<b>약수의 개수</b>: 12는 1,2,3,4,6,12로 6개. 24는 1,2,3,4,6,8,12,24 → <b>8</b>.'
	},
	{
		id: 'reverse-sub',
		chip: '숨은 뺄셈',
		blocks: [{ kind: 'pre', text: '72 ☆ = 45\n91 ☆ = 72\n84 ☆ = 36\n\n93 ☆ = ?' }],
		type: 'text',
		answers: ['54'],
		hints: [
			'72와 45 사이엔 뺄셈이 숨어 있습니다.',
			'72에서 "무엇"을 빼면 45가 될까요? 그 무엇이 72와 닮았습니다.',
			'자기 자신에서 뒤집은 수를 빼 보세요.'
		],
		explain: '<b>자신 − 뒤집은 수</b>: 72−27=45, 91−19=72, 84−48=36. 93−39 = <b>54</b>.'
	},
	{
		id: 'city-holes',
		chip: '도시?',
		blocks: [{ kind: 'pre', text: 'SEOUL = 1\nBUSAN = 3\nDAEGU = 2\n\nINCHEON = ?' }],
		type: 'text',
		answers: ['1', '1개', '한개'],
		hints: [
			'도시의 인구나 크기는 잊으세요. 글자를 "그림"으로 보세요.',
			'대문자 중엔 안이 막힌 공간을 가진 글자들이 있습니다.',
			'O, B, A, D 안의 구멍을 세어 보세요.'
		],
		explain:
			'글자 속 <b>닫힌 공간(구멍)의 수</b>: SEOUL은 O 하나 = 1. BUSAN은 B(2)+A(1) = 3. INCHEON은 O 하나 → <b>1</b>.'
	},
	{
		id: 'elevator-4',
		chip: '관찰',
		blocks: [
			{
				kind: 'text',
				html: '13층 건물인데 엘리베이터의 숫자 버튼은 <b>12개</b>뿐이다. 없는 숫자는?'
			}
		],
		type: 'text',
		answers: ['4', '4층', '사'],
		hints: [
			'버튼이 하나 모자란 이유는 고장이 아닙니다.',
			'한국 건물에서 사람들이 꺼리는 숫자가 있죠.',
			'병원 엘리베이터에서 특히 자주 사라지는 층입니다.'
		],
		explain: '한국 건물은 발음 때문에 <b>4층</b>을 꺼려 F로 쓰거나 건너뜁니다. 답 <b>4</b>.'
	},
	{
		id: 'keyboard-left',
		chip: '외계어?',
		blocks: [{ kind: 'pre', text: 'VSY = 고양이\nFPH = 개\nDIM = 해\n\nVPE = ?' }],
		type: 'text',
		answers: ['소', 'cow', '카우'],
		hints: [
			'암호처럼 보이지만 사실 규칙적인 "오타"입니다.',
			'키보드에서 각 글자의 주변을 보세요.',
			'모든 글자를 한 칸 왼쪽 키로 바꿔 읽으면 영단어가 됩니다.'
		],
		explain:
			'각 글자를 키보드에서 <b>한 칸 왼쪽</b>으로: VSY→CAT, FPH→DOG, DIM→SUN(진짜 영단어라 함정!). VPE→COW = <b>소</b>.'
	},
	{
		id: 'solfege',
		chip: '초성',
		blocks: [{ kind: 'pre', text: 'ㄷ ㄹ ㅁ ㅍ ㅅ ㄹ ?' }],
		type: 'text',
		answers: ['ㅅ', '시'],
		hints: [
			'어떤 유명한 "일곱 개짜리 순서"의 첫 자음들입니다.',
			'노래와 관련이 있습니다.',
			'도, 레, 미…'
		],
		explain: '<b>도레미파솔라시</b>의 초성. 마지막 "시"의 초성 → <b>ㅅ</b>.'
	},
	{
		id: 'animal-len',
		chip: '동물?',
		blocks: [{ kind: 'pre', text: '코끼리 = 3\n소 = 1\n개미 = 2\n\n지렁이 = ?' }],
		type: 'text',
		answers: ['3'],
		hints: [
			'크기도 다리 수도 아닙니다 — 개미 다리는 6개인데 2죠.',
			'동물 자체가 아니라 "이름"을 보세요.',
			'글자 수를 세어 보세요.'
		],
		explain: '동물은 미끼 — 그냥 <b>이름의 글자 수</b>입니다. 지렁이 → <b>3</b>.'
	},
	{
		id: 'hidden-num-word',
		chip: '영단어',
		blocks: [{ kind: 'pre', text: 'TENANT = 10\nCANINE = 9\nWEIGHT = 8\n\nSTONE = ?' }],
		type: 'text',
		answers: ['1', 'one'],
		hints: [
			'단어의 뜻이 아니라 철자 속을 들여다보세요.',
			'TENANT 안에 숨어 있는 세 글자가 있습니다.',
			'TEN, NINE… 단어 속의 숫자 단어를 찾으세요.'
		],
		explain:
			'단어 속에 숨은 수: TEN·NINE·EIGHT. STONE 속엔 <b>ONE</b> → <b>1</b>.'
	},
	{
		id: 'no-30th',
		chip: '달력',
		blocks: [
			{
				kind: 'text',
				html: '31일이 없는 달은 5개다.<br>그럼 <b>30일이 없는 달</b>은 몇 개?'
			}
		],
		type: 'text',
		answers: ['1', '1개', '한개'],
		hints: [
			'"31일이 없는 달"을 세던 방식을 그대로 뒤집어 보세요.',
			'31일이 있는 달에도 30일은 있습니다.',
			'30일이 아예 없는 달은 딱 하나뿐입니다.'
		],
		explain: '31일이 있는 달에도 30일은 있으니, 30일이 없는 달은 <b>2월 하나</b>. 답 <b>1개</b>.'
	},
	{
		id: 'dice-tower',
		chip: '주사위',
		blocks: [
			{
				kind: 'text',
				html: '주사위 3개를 탑처럼 쌓았다. 맨 위 면이 <b>4</b>일 때, 밖에서 보이지 않는 <b>가로면 5개</b>(맞닿은 면 4개 + 바닥)의 합은?'
			}
		],
		type: 'text',
		answers: ['17'],
		hints: [
			'주사위의 마주보는 면의 합은 항상 7입니다.',
			'숨은 가로면 = 맨 위 주사위의 바닥 + 가운데·아래 주사위의 위아래.',
			'4의 반대면 하나 + 7 + 7.'
		],
		explain: '맞닿은 쌍 두 개는 각각 합 7, 맨 위 주사위 바닥은 7−4=3. 3+7+7 = <b>17</b>.'
	},
	{
		id: 'clock-angle',
		chip: '시계',
		blocks: [{ kind: 'pre', text: '3시 = 90\n6시 = 180\n1시 = 30\n\n4시 = ?' }],
		type: 'text',
		answers: ['120', '120도'],
		hints: [
			'시계에서 숫자가 아니라 "바늘"을 보세요.',
			'12시간에 한 바퀴, 360도.',
			'시침의 각도 = 시 × 30도.'
		],
		explain: '정각의 <b>시침 각도</b>: 시×30°. 4시 → <b>120도</b>.'
	},
	{
		id: 'month-letters',
		chip: '수열',
		blocks: [
			{ kind: 'text', html: '이 수열은 정확히 <b>열두 개</b>다. 물음표는?' },
			{ kind: 'pre', text: '7, 8, 5, 5, 3, ?, 4, 6, 9, 7, 8, 8' }
		],
		type: 'text',
		answers: ['4'],
		hints: [
			'"열두 개"라는 개수가 결정적 단서입니다.',
			'1년의 열두 달 — 영어로.',
			'JANUARY는 7글자, FEBRUARY는 8글자…'
		],
		explain: '1~12월 <b>영어 이름의 글자 수</b>. 6월 JUNE → <b>4</b>.'
	},
	{
		id: 'batchim',
		chip: '한글',
		blocks: [{ kind: 'pre', text: '3 = ㅁ\n6 = ㄱ\n10 = ㅂ\n\n8 = ?' }],
		type: 'text',
		answers: ['ㄹ'],
		hints: [
			'숫자를 한글로 소리 내어 읽어 보세요.',
			'삼, 육, 십 — 글자의 끝을 보세요.',
			'받침입니다. "팔"의 받침은?'
		],
		explain: '수 이름의 <b>받침</b>: 삼→ㅁ, 육→ㄱ, 십→ㅂ. 팔 → <b>ㄹ</b>.'
	},
	{
		id: 'idiom-num',
		chip: '사자성어',
		blocks: [{ kind: 'pre', text: '일석이조 = 12\n삼고초려 = 3\n사면초가 = 4\n\n칠전팔기 = ?' }],
		type: 'text',
		answers: ['78'],
		hints: [
			'성어의 뜻이 아니라 글자 하나하나를 보세요.',
			'일석이조에는 일(1)과 이(2)가 들어 있죠.',
			'숨은 숫자를 순서대로 이어 쓰세요.'
		],
		explain: '성어 속 숫자 추출: 일석이조→1,2. 칠전팔기→7,8 → <b>78</b>.'
	},
	{
		id: 'color-mix',
		chip: '색깔',
		blocks: [{ kind: 'pre', text: '빨 + 노 = 주\n노 + 파 = 초\n\n빨 + 파 = ?' }],
		type: 'text',
		answers: ['보라', '보라색', '보'],
		hints: [
			'물감을 섞는다고 생각해 보세요.',
			'빨강과 노랑을 섞으면 주황이 되듯이.',
			'빨강과 파랑을 섞으면?'
		],
		explain: '색의 혼합: 빨+파 = <b>보라</b>.'
	},
	{
		id: 'name-family',
		chip: '가족 찾기',
		blocks: [
			{
				kind: 'text',
				html: '1·2·5·6은 한 가족이고, 3·4·10도 한 가족이다.<br>3·4·10 가족의 새 식구는?'
			}
		],
		type: 'choice',
		choices: ['7', '8', '9', '11'],
		answerIndex: 3,
		hints: [
			'수의 크기나 배수 관계가 아닙니다.',
			'숫자를 한글 이름으로 불러 보세요: 일, 이, 오, 육…',
			'이름의 첫 자음이 같은 수끼리 가족입니다. 삼·사·십과 같은 첫 자음은?'
		],
		explain:
			'수 이름의 <b>첫 자음</b>: 일·이·오·육은 ㅇ, 삼·사·십은 ㅅ. 십일(11)도 ㅅ → <b>11</b>.'
	},
	{
		id: 'five-elements',
		chip: '요일',
		blocks: [{ kind: 'pre', text: '월 = 달\n화 = 불\n수 = 물\n목 = 나무\n\n금 = ?' }],
		type: 'text',
		answers: ['쇠', '금속', '철'],
		hints: [
			'월요일의 月은 "달"입니다. 요일 이름은 전부 한자죠.',
			'火는 불, 水는 물, 木은 나무…',
			'金의 뜻은 돈이 아니라…'
		],
		explain: '요일 한자의 뜻: 金은 돈이 아니라 <b>쇠(금속)</b>. 토=흙, 일=해까지 이어집니다.'
	}
];
