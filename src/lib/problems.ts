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
	},
	{
		id: 'square-diff',
		chip: '이상한 연산',
		blocks: [{ kind: 'pre', text: '9 ※ 8 = 17\n5 ※ 3 = 16\n7 ※ 2 = 45\n\n8 ※ 6 = ?' }],
		type: 'text',
		answers: ['28'],
		hints: [
			'첫 줄 9※8=17은 덧셈처럼 보이지만, 5※3=16이 부정합니다.',
			'각 수를 제곱해 보세요.',
			'제곱한 두 값의 차이입니다.'
		],
		explain: '<b>제곱의 차</b>: 81−64=17, 25−9=16, 49−4=45. 64−36 = <b>28</b>.'
	},
	{
		id: 'quot-rem',
		chip: '이상한 연산',
		blocks: [{ kind: 'pre', text: '17 ◎ 5 = 32\n22 ◎ 7 = 31\n9 ◎ 4 = 21\n\n26 ◎ 6 = ?' }],
		type: 'text',
		answers: ['42'],
		hints: [
			'결과가 한 번의 연산으로 나온 수가 아닙니다 — 두 조각입니다.',
			'나눗셈을 해 보세요. 몫만 쓰지 말고.',
			'몫과 나머지를 나란히 이어 쓴 것입니다.'
		],
		explain: '<b>몫과 나머지 이어 쓰기</b>: 17÷5 = 3 나머지 2 → 32. 26÷6 = 4 나머지 2 → <b>42</b>.'
	},
	{
		id: 'clock-add',
		chip: '이상한 연산',
		blocks: [{ kind: 'pre', text: '9 ◐ 5 = 2\n7 ◐ 8 = 3\n11 ◐ 11 = 10\n\n8 ◐ 9 = ?' }],
		type: 'text',
		answers: ['5', '5시'],
		hints: [
			'9+5는 14인데 답이 2 — 어디로 12가 사라졌을까요?',
			'숫자가 12를 넘으면 다시 처음으로 돌아가는 물건이 있죠.',
			'시계 위에서 더해 보세요.'
		],
		explain: '<b>시계 덧셈</b>: 합이 12를 넘으면 한 바퀴. 8+9=17 → 17−12 = <b>5시</b>.'
	},
	{
		id: 'straight-strokes',
		chip: '영단어',
		blocks: [{ kind: 'pre', text: 'NET = 9\nTAX = 7\nMAN = 10\n\nWAX = ?' }],
		type: 'text',
		answers: ['9'],
		hints: [
			'단어의 뜻도, 알파벳 순번도 아닙니다. 글자를 "그려" 보세요.',
			'이 단어들에 곡선 글자가 하나도 없다는 건 우연이 아닙니다.',
			'각 글자를 긋는 데 필요한 직선 획수를 더하세요.'
		],
		explain:
			'대문자의 <b>직선 획수 합</b>: N(3)+E(4)+T(2)=9, T(2)+A(3)+X(2)=7. W(4)+A(3)+X(2) = <b>9</b>.'
	},
	{
		id: 'sum-to-letter',
		chip: '알파벳',
		blocks: [{ kind: 'pre', text: 'CAB = F\nBAD = G\nACE = I\n\nBEAD = ?' }],
		type: 'text',
		answers: ['l', '엘'],
		hints: [
			'C에서 3칸 가면 F — 하지만 그 규칙은 BAD에서 죽습니다.',
			'글자를 순번으로 바꿔 보세요 (A=1, B=2…).',
			'순번을 모두 더한 값을 다시 글자로 바꾸면?'
		],
		explain:
			'순번 합을 글자로: CAB=3+1+2=6=<b>F</b>, BAD=7=G, ACE=9=I. BEAD=2+5+1+4=12 = <b>L</b>.'
	},
	{
		id: 'jamo-count',
		chip: '한글',
		blocks: [{ kind: 'pre', text: '닭 = 4\n물 = 3\n삶 = 4\n\n값 = ?' }],
		type: 'text',
		answers: ['4'],
		hints: [
			'글자 수도 획수도 아닙니다. 글자를 분해해 보세요.',
			'닭 = ㄷ, ㅏ, ㄹ, ㄱ.',
			'자모 낱자의 개수 — 겹받침은 둘로 셉니다.'
		],
		explain: '<b>자모 낱자 개수</b>: 닭=ㄷㅏㄹㄱ(4), 물=ㅁㅜㄹ(3). 값=ㄱㅏㅂㅅ = <b>4</b>.'
	},
	{
		id: 'sum-eq-product',
		chip: '탐색',
		blocks: [
			{ kind: 'text', html: '자릿수를 <b>더해도, 곱해도</b> 결과가 같은 두 자리 수는?' }
		],
		type: 'text',
		answers: ['22'],
		hints: [
			'두 자릿수를 각각 더한 값과 곱한 값을 비교하는 문제입니다.',
			'덧셈과 곱셈이 같아지려면 아주 특별한 숫자여야 합니다.',
			'같은 숫자가 두 번 들어갑니다.'
		],
		explain: '2+2 = 2×2 = 4. 두 자리 수 중 유일한 답 <b>22</b>.'
	},
	{
		id: 'adjacent-letters',
		chip: '영단어',
		blocks: [{ kind: 'pre', text: 'HIGH = 2\nJOKE = 0\nDEFY = 2\n\nCLIMB = ?' }],
		type: 'text',
		answers: ['1'],
		hints: [
			'단어 안에서 이웃한 글자들의 "알파벳 거리"를 보세요.',
			'H와 I는 알파벳에서 바로 이웃입니다. HIGH엔 그런 쌍이 둘(HI, GH).',
			'알파벳 순서로 연속인 이웃 글자 쌍을 세어 보세요.'
		],
		explain:
			'알파벳 연속 이웃 쌍: HIGH=HI·GH(2), DEFY=DE·EF(2). CLIMB엔 <b>LM</b> 하나 → <b>1</b>.'
	},
	{
		id: 'top-row',
		chip: '영단어',
		blocks: [
			{ kind: 'text', html: '넷 중 하나만 아주 <b>특별</b>하다. 어느 것일까?' }
		],
		type: 'choice',
		choices: ['TYPEWRITER', 'KEYBOARD', 'MONITOR', 'PRINTER'],
		answerIndex: 0,
		hints: [
			'단어의 뜻이 아니라 "치는 행위"를 생각해 보세요.',
			'키보드를 내려다보고 한 글자씩 짚어 보세요.',
			'어느 한 단어만 손가락이 한 줄을 벗어나지 않습니다.'
		],
		explain:
			'<b>TYPEWRITER</b>는 키보드 맨 윗줄(QWERTYUIOP)만으로 칠 수 있는 단어입니다. 나머지는 전부 줄을 넘나듭니다.'
	},
	{
		id: 'aspirated',
		chip: '한글',
		blocks: [{ kind: 'pre', text: 'ㄱ = ㅋ\nㄷ = ㅌ\nㅈ = ㅊ\n\nㅂ = ?' }],
		type: 'text',
		answers: ['ㅍ'],
		hints: [
			'자음 순번으로 계산하면 간격이 불규칙해서 죽습니다. 소리를 내 보세요.',
			'ㄱ에 획을 하나 더하면 ㅋ — 소리가 어떻게 변하나요?',
			'예사소리와 거센소리의 짝입니다.'
		],
		explain: '<b>거센소리 짝</b>: 획이 하나 늘며 소리가 거세집니다. ㅂ의 거센소리 = <b>ㅍ</b>.'
	},
	{
		id: 'dotted-letters',
		chip: '영단어',
		blocks: [{ kind: 'pre', text: 'jelly = 1\nbanana = 0\nlily = 1\n\ninjury = ?' }],
		type: 'text',
		answers: ['2'],
		hints: [
			'대문자가 아니라 소문자로 쓰여 있는 것 자체가 단서입니다.',
			'글자 위를 보세요 — 무언가 떠 있는 글자들이 있죠.',
			'점이 붙는 소문자를 세어 보세요.'
		],
		explain: '<b>점이 붙는 소문자(i, j)의 개수</b>: jelly의 j, lily의 i. injury엔 i와 j → <b>2</b>.'
	},
	{
		id: 'anagram-eq',
		chip: '영단어',
		blocks: [
			{
				kind: 'text',
				html: 'ELEVEN + TWO = TWELVE + ONE<br>이 등식은 <b>두 번</b> 참이다. 산술(11+2 = 12+1) 말고 또 무엇이 참일까?'
			}
		],
		type: 'choice',
		choices: [
			'글자를 재배열하면 양변이 똑같다',
			'로마 숫자로 써도 같다',
			'발음이 같다',
			'획수가 같다'
		],
		answerIndex: 0,
		hints: [
			'양변의 "값" 말고 "표기"를 비교해 보세요.',
			'글자를 하나씩 세어 보세요 — E가 몇 개, T가 몇 개…',
			'양변은 같은 글자들로 되어 있습니다.'
		],
		explain:
			'ELEVEN+TWO와 TWELVE+ONE은 완전한 <b>애너그램</b> — 같은 글자들의 재배열이면서 값(13)도 같습니다.'
	},
	{
		id: 'weekday-add',
		chip: '요일',
		blocks: [{ kind: 'pre', text: '월 + 화 = 수\n화 + 수 = 금\n월 + 수 = 목\n\n화 + 목 = ?' }],
		type: 'text',
		answers: ['토', '토요일'],
		hints: [
			'"다음 날" 규칙처럼 보이지만 화+수=금에서 무너집니다.',
			'요일을 숫자로 바꿔 보세요 (월=1).',
			'숫자로 더한 결과를 다시 요일로 바꾸면?'
		],
		explain: '요일 = 순번: 월(1)+화(2)=3=수. 화(2)+목(4)=6 = <b>토</b>.'
	},
	{
		id: 'month-season',
		chip: '달력',
		blocks: [{ kind: 'pre', text: '13월 = 겨울\n15월 = 봄\n20월 = 여름\n\n27월 = ?' }],
		type: 'text',
		answers: ['봄'],
		hints: [
			'13월은 세상에 없습니다 — 그럼 13월은 사실 몇 월일까요?',
			'12개월이 지나면 달력은 처음으로 돌아갑니다.',
			'12를 빼고 남는 달의 계절을 답하세요.'
		],
		explain: '12를 넘으면 한 바퀴: 13월=1월(겨울), 20월=8월(여름). 27월 = 27−24 = 3월 = <b>봄</b>.'
	},
	{
		id: 'xmas-newyear',
		chip: '달력',
		blocks: [
			{
				kind: 'text',
				html: '올해 크리스마스가 <b>수요일</b>이라면, 다음 새해 첫날은 무슨 요일?'
			}
		],
		type: 'text',
		answers: ['수', '수요일'],
		hints: [
			'12월 25일부터 1월 1일까지 날짜를 세어 보세요.',
			'정확히 일주일입니다.',
			'7일 뒤는 언제나 같은 요일입니다.'
		],
		explain: '12/25 → 1/1은 정확히 <b>7일</b>. 그래서 크리스마스와 새해 첫날은 항상 같은 요일 — <b>수요일</b>.'
	},
	{
		id: 'tomorrow-yesterday',
		chip: '시간',
		blocks: [
			{ kind: 'text', html: '<b>"내일의 어제의 내일의 어제"</b>는 언제일까?' }
		],
		type: 'text',
		answers: ['오늘'],
		hints: [
			'하나씩 따라가도 되지만, 더 빠른 길이 있습니다.',
			'"내일의 어제"는 그냥 오늘입니다.',
			'내일과 어제가 만나면 서로 지워집니다.'
		],
		explain: '내일↔어제는 <b>상쇄</b>됩니다. 두 쌍이 모두 지워져 <b>오늘</b>.'
	},
	{
		id: 'month-prefix',
		chip: '영단어',
		blocks: [{ kind: 'pre', text: 'MARCHING = 3\nJANITOR = 1\nOCTOPUS = 10\n\nMAYBE = ?' }],
		type: 'text',
		answers: ['5', '5월'],
		hints: [
			'문어 다리는 8개인데 OCTOPUS가 10 — 다리가 아닙니다.',
			'단어의 앞부분만 떼어 읽어 보세요. MARCH, JAN, OCT…',
			'달력의 영어 이름입니다. MAY는 몇 월?'
		],
		explain:
			'단어 앞에 숨은 <b>달 이름</b>: MARCH(3월), JAN(1월), OCT(10월 — 문어 다리 8개에 낚였다면 정상입니다). MAY = <b>5</b>.'
	},
	{
		id: 'alpha-order-nums',
		chip: '수열',
		blocks: [{ kind: 'pre', text: '8, 5, 4, 9, 1, 7, ?, 3, 2, 0' }],
		type: 'text',
		answers: ['6', 'six'],
		hints: [
			'산수로는 아무 규칙도 나오지 않습니다. 수의 "이름"을 보세요.',
			'eight, five, four… 어떤 순서로 늘어서 있나요?',
			'영어 이름의 사전 순입니다. 빠진 수의 이름은 s로 시작합니다.'
		],
		explain:
			'0~9를 <b>영어 이름의 사전 순</b>으로: eight, five, four, nine, one, seven, <b>six</b>, three, two, zero → <b>6</b>.'
	},
	{
		id: 'korean-name-len',
		chip: '한글',
		blocks: [{ kind: 'pre', text: '11 = 2\n21 = 3\n99 = 3\n\n105 = ?' }],
		type: 'text',
		answers: ['2', '2글자', '두글자'],
		hints: [
			'11=2는 자릿수 같지만 21=3에서 죽습니다.',
			'숫자를 한글로 소리 내어 읽어 보세요.',
			'십일은 두 글자, 이십일은 세 글자. 백오는?'
		],
		explain:
			'<b>한글로 읽은 글자 수</b>: 십일(2), 이십일(3), 구십구(3). 105 = 백오 = <b>2글자</b> — 21보다 짧습니다!'
	},
	{
		id: 'card-ranks',
		chip: '카드',
		blocks: [{ kind: 'pre', text: 'A + J = Q\nQ − J = A\n\nK − A = ?' }],
		type: 'text',
		answers: ['q', '큐'],
		hints: [
			'알파벳 순번(A=1, J=10…)으로 풀면 첫 줄부터 어긋납니다.',
			'게임 카드 한 벌을 떠올려 보세요.',
			'A=1, J=11, Q=12, K=13.'
		],
		explain: '트럼프 순번: A(1)+J(11)=12=Q ✓. K(13)−A(1)=12 = <b>Q</b>.'
	},
	{
		id: 'set-sizes',
		chip: '숫자의 정체',
		blocks: [{ kind: 'pre', text: '26 = 알파벳\n12 = 달\n7 = 요일\n\n24 = ?' }],
		type: 'text',
		answers: ['시간', '시', '하루'],
		hints: [
			'이 숫자들은 계산 대상이 아니라 어떤 것들의 "개수"입니다.',
			'26개짜리 묶음, 12개짜리 묶음, 7개짜리 묶음 — 전부 아는 것들이죠.',
			'하루에 24개 있는 것은?'
		],
		explain: '숫자 = 세트의 크기. 하루의 <b>시간(24시간)</b>.'
	},
	{
		id: 'big-numbers',
		chip: '큰 수',
		blocks: [{ kind: 'pre', text: '0이 4개 = 만\n0이 8개 = 억\n\n0이 12개 = ?' }],
		type: 'text',
		answers: ['조'],
		hints: [
			'한국어에서 큰 수의 이름이 바뀌는 지점을 보세요.',
			'만(0 네 개), 억(0 여덟 개) — 몇 개마다 이름이 바뀌나요?',
			'만, 억, 그다음 단위입니다.'
		],
		explain: '한국어 큰 수는 0이 <b>4개씩</b> 늘 때마다 이름이 바뀝니다: 만→억→<b>조</b>.'
	},
	{
		id: 'caesar-minus',
		chip: '외계어?',
		blocks: [{ kind: 'pre', text: 'TFF = 보다\nFHH = 달걀\nGPY = 여우\n\nEPH = ?' }],
		type: 'text',
		answers: ['개', 'dog', '강아지'],
		hints: [
			'암호처럼 보이지만 규칙적인 "밀림"입니다.',
			'T의 바로 앞 글자, F의 바로 앞 글자…',
			'모든 글자를 알파벳 한 칸 앞으로 당겨 읽으세요.'
		],
		explain:
			'각 글자를 알파벳 <b>한 칸 앞으로</b>: TFF→SEE, FHH→EGG, GPY→FOX. EPH→DOG = <b>개</b>.'
	},
	{
		id: 'honest-number',
		chip: '탐색',
		blocks: [
			{
				kind: 'text',
				html: '영어에서 이름의 <b>글자 수가 자기 자신과 같은</b> 유일한 수는?'
			}
		],
		type: 'text',
		answers: ['4', 'four', '포'],
		hints: [
			'ONE은 3글자인데 1이 아니죠 — 거짓말쟁이입니다.',
			'수의 영어 이름과 그 수 자체를 비교해 보세요.',
			'1부터 이름의 글자 수를 세면서 올라가 보세요.'
		],
		explain: '<b>FOUR</b>는 4글자 — 이름과 값이 일치하는 유일하게 "정직한" 영어 수입니다.'
	},
	{
		id: 'club-e',
		chip: '클럽',
		blocks: [
			{
				kind: 'text',
				html: '어떤 클럽: 2 ✓, 4 ✓, 6 ✓ — 그런데 <b>8은 거절</b>당했다. 이유는?'
			}
		],
		type: 'choice',
		choices: [
			'영어 이름에 E가 들어가서',
			'획수가 많아서',
			'2의 거듭제곱이라서',
			'발음이 길어서'
		],
		answerIndex: 0,
		hints: [
			'짝수 클럽이라면 8이 거절될 리 없죠.',
			'숫자가 아니라 영어 이름을 보세요.',
			'TWO, FOUR, SIX에는 없고 EIGHT에는 있는 글자.'
		],
		explain:
			'TWO·FOUR·SIX엔 <b>E가 없습니다</b>. EIGHT는 E가 있어 탈락 — 짝수는 미끼였습니다.'
	},
	{
		id: 'stairs',
		chip: '함정',
		blocks: [
			{
				kind: 'text',
				html: '1층에서 4층까지 계단으로 <b>30초</b> 걸린다. 같은 속도로 1층에서 8층까지는?'
			}
		],
		type: 'text',
		answers: ['70', '70초'],
		hints: [
			'"4층까지 30초니까 8층까지 60초"가 바로 함정입니다.',
			'1층에서 4층까지 오르는 계단 구간이 몇 개인지 세어 보세요.',
			'구간은 3개 — 구간당 10초. 8층까지는 몇 구간일까요?'
		],
		explain:
			'1→4층은 <b>3개 구간</b>(구간당 10초). 1→8층은 7개 구간 → <b>70초</b>. 60초는 함정.'
	},
	{
		id: 'book-pages',
		chip: '탐색',
		blocks: [
			{
				kind: 'text',
				html: '펼친 책의 왼쪽·오른쪽 페이지 번호를 <b>곱했더니 600</b>. 두 페이지는?'
			}
		],
		type: 'text',
		answers: ['2425', '24와25', '24 25'],
		hints: [
			'펼친 책의 두 페이지 번호는 특별한 관계입니다.',
			'이웃한 두 수의 곱이 600입니다.',
			'600의 제곱근 근처를 보세요.'
		],
		explain: '펼친 페이지는 연속수: √600 ≈ 24.5 → <b>24와 25</b> (24×25=600 ✓).'
	},
	{
		id: 'day-7777',
		chip: '달력',
		blocks: [
			{ kind: 'text', html: '금요일에서 <b>7,777일</b> 뒤는 무슨 요일?' }
		],
		type: 'text',
		answers: ['금', '금요일'],
		hints: [
			'7,777일을 진짜로 세면 지는 겁니다.',
			'7일마다 같은 요일이 돌아옵니다.',
			'7777이 7로 나누어떨어지나요?'
		],
		explain: '7777 = 7×1111 — 7의 배수라 요일이 그대로. <b>금요일</b>.'
	}
];
