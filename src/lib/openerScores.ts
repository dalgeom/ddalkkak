/**
 * 문지기 점수 — 그날 1번에 세울 발견형을 고르는 난이도(1 쉬움 ~ 5 어려움).
 * opener.ts OPENER_EASY_START_DAY부터 그날 세 문제 중 점수가 가장 낮은 문지기가 1번에 선다.
 *
 * 2026-10-07에 문지기 후보(모양 규칙 통과) 183개를 매겼다. 처음 보는 어른이 예시만 보고
 * 1분 안에 풀까. 판정은 에이전트 넷이 나눠 했고, 실측 정답률이 있는 문제를 기준 예시로 줬다.
 * 기준 예시에 안 쓴 실측 8개로 대조하니 2점은 71~83%로 맞았다.
 *
 * 실측이 판정보다 앞선다. 답이 5건 이상 쌓인 문제는 정답률 60% 이상이면 2점 이하로,
 * 30% 미만이면 5점으로, 그 사이면 3점 이상으로 고쳤다(rc-club-hidden-animal 2점 → 실측 50%라 3점).
 * 여기 없는 문제(이후 새로 넣은 문제)는 점수 없이 모양 규칙으로만 1번 후보가 된다.
 */
export const OPENER_SCORES: Readonly<Record<string, number>> = {
	'abundant-club': 5, // 진약수 합 > 원래 수
	'adjacent-letters': 3, // 알파벳 연속 이웃쌍 개수
	'alien-math': 4, // 한/영 안 바꾼 한글 숫자 계산
	'anagram-numbers': 4, // 글자 재배열=영어 수 이름
	'apostrophe-eaten': 3, // 축약에서 빠진 글자 수
	'between-count': 2, // 두 수 사이 정수 개수
	'caesar-minus': 3, // 알파벳 한 칸 앞으로 당긴 뒤 번역
	'cal-13th-day': 2, // 1일 요일에서 5칸 뒤
	'cal-1900-not-leap': 2, // 100의 배수 평년(400 예외)
	'cal-clock-angle': 1, // 시침·분침 사이 작은 각
	'cal-clock-strike-gap': 1, // (n−1)×2초
	'cal-feb-mirror': 4, // 평년 2월은 28일이라 요일 그대로
	'cal-mirror-clock': 1, // 12에서 뺀 시각
	'cal-newyear-drift': 4, // 해마다 하루, 윤년 뒤엔 이틀 밀림
	'cal-swapped-hands': 5, // 긴바늘·짧은바늘 바꿔 읽기(시침 이동 포함)
	'cal-weekday-hop': 4, // 토·일 뺀 평일 달력
	'century-1900': 2, // 00년은 그 세기의 마지막 해
	'city-holes': 3, // 글자 속 닫힌 구멍 수
	'clock-add': 2, // 12시간 시계 덧셈
	'clock-hands-product': 5, // 시침 숫자 × 분침 숫자
	'club-baby-animals': 2, // 동물 새끼 이름
	'club-body-pairs': 2, // 몸에 두 개씩 있는 부위
	'club-case-twin': 4, // 대문자 축소=소문자 모양
	'club-cube': 2, // 세제곱수
	'club-doer': 3, // 동사+ER = 하는 사람
	'club-double-letter': 3, // 같은 알파벳이 두 번 이상
	'club-letter-sound': 3, // 발음이 알파벳 한 글자
	'club-number-start': 3, // 첫 글자가 수 이름
	'club-plural': 4, // 모음 바뀌는 불규칙 복수
	'club-self-divisible': 4, // 각 자릿수로 나누어떨어짐
	'club-sun-partner': 3, // 앞에 SUN을 붙이면 단어
	'color-add': 4, // 무지개 순번 두 자리 덧셈·뺄셈
	'color-alpha': 5, // 영어 이름 알파벳 순 두 자리 덧셈
	'color-newcolor': 4, // 두 번째 묶음에만 있는 색
	'color-pairing': 5, // 보색 짝 소거 후 남은 색
	'compound-mult': 3, // 합성어 두 조각 글자수 곱
	'consecutive-sum-club': 5, // 연속 자연수의 합으로 표현 가능
	'consonant-asc-club': 4, // 모음 뺀 자음이 알파벳 순
	'day-month': 5, // 일.월 순서 날짜 · 실측 1/10
	'diamond-op': 3, // 두 수의 곱을 거꾸로
	'dice-double': 3, // 보통은 차, 더블이면 합
	'digit-sum-op': 4, // 곱의 자릿수 합
	'digitwise-add': 3, // 자리끼리 더해 이어 붙임
	'disc-2': 3, // 로마 숫자 값 단순 합
	'disc-3': 4, // 양옆보다 높은 봉우리 개수
	'disc-4': 5, // 위로 솟은 글자 수 - 아래로 내려간 글자 수
	'disc-5': 3, // 색이 바뀌는 경계 개수
	'disc-8': 4, // 서로 다른 소인수 개수
	'divisor-count': 3, // 약수의 개수
	'dotted-letters': 4, // i·j(점 있는 소문자) 개수
	'elevator-4': 4, // 4층 있으면 버튼 −1
	'en-club-behead': 3, // 첫 글자 떼도 단어가 남음
	'en-club-first-letter-length': 4, // 첫 글자 알파벳 순번 = 글자 수
	'en-compound-literal': 1, // 영단어 반쪽씩 직역
	'en-lowercase-nations': 1, // turkey = 칠면조
	'en-question-club': 1, // 영어 의문사 · 실측 6/7
	'glyph-ascdesc': 3, // 위아래로 삐져나온 소문자 수
	'glyph-cross-junction': 5, // 획이 십자로 관통하는 교차점 수
	'glyph-curve': 3, // 곡선 있는 글자 수
	'glyph-diagonal': 2, // 대각선 획 개수
	'glyph-endpoint': 2, // 글자 선의 끝점 개수
	'glyph-hole-concat': 2, // 닫힌 칸 수 이어 쓰기
	'glyph-hole-wang': 3, // 닫힌 칸 개수
	'glyph-rain-pool': 5, // 비 오면 물 고이는 웅덩이 수
	'glyph-rot180': 3, // 180도 돌려도 같은 글자 수
	'glyph-seg-vertical': 3, // 전광판 세로 획만 개수
	'glyph-sym-count': 3, // 좌우대칭 한자 개수
	'glyph-vowel-branch': 2, // 모음의 짧은 가지 수
	'hanja-combine': 2, // 한자 두 글자 합쳐 새 한자
	'hanja-strokes': 3, // 한자 획수
	'hidden-clock-add': 3, // 숫자를 시각으로 보고 분 더하기
	'hidden-num-word': 2, // 단어 속 숨은 영어 숫자
	'honest-number': 4, // 영어 숫자 이름 글자 수
	'jamo-count': 2, // 자모 낱자 개수
	'keyboard-left': 4, // 키보드 한 칸 왼쪽 + 영단어 뜻
	'keyboard-shift-count': 4, // 두벌식 Shift 자모 개수
	'ko-palindrome': 1, // 회문이면 O
	'korean-name-len': 3, // 한글로 읽은 글자 수
	'kr-acronym-expand': 1, // 머리글자 줄임말
	'kr-approx-numbers': 1, // 이웃 두 수를 붙인 어림수
	'kr-bright-vowels': 4, // 밝은 모음 ㅏ·ㅗ 개수
	'kr-chunjiin': 1, // 천지인 점 위치 = 모음 방향 · 실측 8/9
	'kr-club-sound-word': 4, // 연음하면 다른 낱말
	'kr-club-vowel-words': 2, // 자음 소리 없는 낱말
	'kr-common-head': 2, // 공통으로 앞에 붙는 글자
	'kr-loan-stretch': 3, // 한글로 적은 글자 수
	'kr-native-club': 4, // 순우리말만 회원
	'kr-native-count': 2, // 우리말 읽기의 글자 수 · 실측 6/8
	'kr-silent-ieung': 2, // 받침 ㅇ 개수 · 실측 7/8
	'kr-sort-last-syllable': 3, // 끝 글자 가나다순 역순사전
	'kr-vowel-contract': 2, // 앞 모음+ㅣ 합쳐 한 글자
	'lcd-clock-repdigit': 3, // 모든 자리가 같은 시각
	'lcd-evolution': 3, // 전광판 획 하나 켜서 다른 숫자
	'lcd-fragments': 5, // 7세그먼트 꺼진 획(여집합)
	'lcd-hidden-digits': 5, // 획 일부로 만들 수 있는 숫자 개수
	'lcd-look-say': 4, // 앞 줄을 소리 내어 읽기
	'lcd-star': 4, // 7세그먼트 공통 획만 남기기
	'leet-letters': 4, // 글자를 닮은 숫자로 바꿔 합산
	'ln-vowel-count': 3, // 모음 종류 수
	'month-end-jump': 2, // 달의 마지막 날 반영
	'month-name-yu': 2, // 달 이름 표준 발음(유월·시월)
	'month-nth-letter': 4, // 영어 월 이름의 n번째 글자
	'month-prefix': 3, // 단어 앞의 달 이름 약자
	'nm-4100-trap': 3, // 암산 함정(정답 4100)
	'nm-digit-root': 2, // 자릿수 합 한 자리까지 반복
	'nm-double-half': 4, // 짝수 반, 홀수 3n+1
	'nm-factorial-zeros': 4, // 곱 속 5의 개수(25는 2개)
	'nm-flip-product': 3, // 십의자리곱 = 일의자리곱
	'nm-gcd-op': 2, // 최대공약수
	'nm-len-branch': 2, // 자릿수 같으면 합, 다르면 차
	'nm-ones-square': 1, // 1이 n개인 수의 제곱=1..n..1
	'nm-power-op': 2, // 거듭제곱 · 실측 5/7
	'nm-reverse-add': 2, // 자신+뒤집은 수
	'nm-square-gap': 1, // 이웃 제곱수의 차
	'nm-sum-1-100': 2, // 1~n 합 n(n+1)/2
	'nm-swap-sort': 5, // 정렬에 필요한 최소 맞바꿈 횟수
	'nm-times-table-count': 5, // 구구단에 답으로 나오는 횟수
	'num-carry-count': 3, // 덧셈 받아올림 횟수
	'num-chapter-odd-start': 4, // 새 장은 홀수(오른쪽) 쪽에서 시작
	'num-coin-count': 4, // 동전·지폐 최소 개수
	'num-diffsum': 3, // 차와 합 이어 붙이기
	'num-digitsum-min': 5, // 자릿수 합이 같은 최소 수 · 실측 1/5
	'num-hidden-fraction': 4, // 두 자리를 분수로 읽어 더함
	'num-hundred-gap': 3, // 합과 100의 거리
	'num-insertdiff': 2, // a와 b 사이에 차를 끼움
	'num-keypad-flip': 4, // 전화 키패드↔계산기 자판 위치
	'num-keypad-line': 4, // 전화 키패드 위 일직선
	'num-op-plus-times': 3, // 곱 + 합
	'num-page-digits': 4, // 1~n쪽 번호의 숫자 총개수
	'num-parityorder': 4, // 합 홀수면 순서 뒤집어 붙임
	'num-reverse1': 4, // ab를 뒤집고 +1
	'num-roman-strokes': 2, // 로마 숫자의 획수 · 실측 5/5
	'num-run-count': 3, // 연속 같은 숫자 덩어리 수
	'num-square-neighbor': 3, // +1 하면 제곱수
	'ob-chon-count': 3, // 촌수(부모-자식 고리 수)
	'ob-shake-total': 2, // 악수 수 n(n−1)/2 · 실측 5/6
	'ob-stair-gap': 2, // 층 사이 간격 수 · 실측 4/5
	'odd-even-branch': 4, // 앞수 홀이면 합, 짝이면 차
	'odd-letters': 2, // 홀수 번째 글자만
	'op-number-baseball': 3, // 숫자야구 스트라이크·볼
	'ordinal-suffix': 1, // 영어 서수 접미사
	'palindrome-branch': 4, // 대칭수면 덧셈, 아니면 차
	'quot-rem': 3, // 몫과 나머지 이어 쓰기
	'rank-share-tie': 4, // 동점은 평균 순위
	'rc-club-bookends': 2, // 첫 글자=끝 글자
	'rc-club-consec': 2, // 1씩 커지는 연속 숫자
	'rc-club-echo': 3, // 두 글자 모음이 같음
	'rc-club-hidden-animal': 3, // 낱말 속 동물 글자 · 실측 9/18
	'rc-club-nobatchim': 2, // 받침 없는 글자
	'rc-club-nocurve': 3, // 직선 글자만으로 된 단어
	'rc-club-noloop': 3, // 구멍 있는 숫자 포함
	'rc-club-samefirst': 2, // 두 낱말 첫 자음이 같음
	'rc-club-siblings': 2, // 같은 갈래의 나란한 짝 · 실측 5/7
	'rc-club-triangular': 3, // 삼각수(1부터 차례로 더한 수)
	'rc-magic-square': 2, // 마방진 합 15
	'rc-neighbor-tri': 1, // 위 두 수의 합(파스칼 삼각형)
	'rc-ring-neighbors': 5, // 원형으로 양옆 이웃의 합
	'rc-seat-center-out': 4, // 가운데서 홀수 왼쪽·짝수 오른쪽 번호
	'rc-self-shift': 3, // 순번만큼 뒤로 밀기
	'reverse-sub': 3, // 자신 − 뒤집은 수
	'reverse-word-club': 3, // 거꾸로 읽어도 영단어
	'rhyme-number': 4, // 라임이 같은 영어 숫자
	'roman-len': 4, // 로마 숫자 표기 글자 수
	'sh-closed-count': 1, // 대문자 닫힌 칸
	'sh-nine-dots': 3, // 점 밖으로 선을 뻗어 4개
	'sh-polygon-angles': 1, // 변 하나당 내각합 +180
	'sh-polygon-diag': 2, // 대각선 개수 · 실측 8/8
	'sh-rotate-180': 2, // 180도 회전(6↔9, 순서 반전) · 실측 5/6
	'sh-seg-count': 2, // 전광판 숫자의 켜진 획 수
	'sh-seg-swap': 3, // 획 하나 더 켜서 되는 수
	'sh-seg-union': 4, // 전광판 두 숫자 획 합치기
	'sh-sym-vertical': 1, // 좌우 대칭 글자면 O
	'size-branch': 2, // 앞이 크면 빼고 뒤가 크면 더함
	'square-diff': 4, // 두 수 제곱의 차
	'squares-between': 4, // 두 수 사이 제곱수 개수
	'straight-strokes': 3, // 대문자 직선 획수 합
	'sum-eq-product': 4, // 자릿수 합 = 자릿수 곱
	'sum-to-letter': 3, // 알파벳 순번 합→글자 · 실측 6/12
	'word-keyboard': 4, // 자판 윗줄 글자만으로 구성
	'word-overlap': 2, // 끝·앞 겹치는 부분 포개기
	'word-pen-lift': 5, // 글자별 한붓 그리기 가닥 수 합
	'word-syllables': 4, // 영어로 읽은 음절 수
	'year-day-count': 2, // 연중 며칠째
};
