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
	}
];
