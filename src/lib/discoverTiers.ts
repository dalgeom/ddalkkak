/**
 * 발견형 단계(1 새싹 ~ 5 고수, tiers.ts) — 2026-10-20에 377개 전부 매겼다.
 *
 * 판정: 에이전트 넷이 나눠 실제로 풀어 보며 tiers.ts 정의(목표 정답률 90 · 75 · 55 · 35 · 15%)로 매겼다.
 * 기준점은 GA 실측 40개(시도 5건 이상)와 문지기 점수(openerScores.ts)다. 실측은 답을 낸 사람만의 정답률이라
 * 보자마자 떠난 사람이 빠져 쉬워 보인다 — 한 단계쯤 어렵게 읽었다.
 * 결과 39 · 102 · 108 · 102 · 26. 새싹이 10%뿐이다 — 가족이 「너무 어렵다」고 한 것과 같은 이야기라,
 * 당분간 새로 만드는 발견형은 새싹 · 쉬움으로 채운다.
 *
 * 실측이 10건 넘게 쌓이면 실측이 이 판정보다 앞선다(다시 매길 때 고친다). 새 문제는 추가할 때 여기에 단계를 함께 적는다
 * (discoverTiers.test.ts가 빠진 id를 잡는다).
 */
import { TIER_OF_GRADE, type Tier } from './tiers';

export const DISCOVER_TIERS: Readonly<Record<string, Tier>> = {
	'diamond-op': 3, // 곱 뒤집기, 81→18 눈에 띔
	'mirror-word': 3, // 대칭 글자+회문 두 조건
	'chain-alpha': 4, // 순번+덧셈, 실측 50%
	'color-add': 3, // 무지개 순번 두 자리 변환
	'alien-math': 4, // 한/영 자판 발상 필요
	'lcd-star': 4, // 전광판 획 교집합 상상
	'lcd-broken': 5, // 고장 획 추리, 두 단계
	'lcd-flip': 4, // 180° 뒤집기+4자리 덧셈
	'digit-sum-op': 4, // 곱+자릿수합 두 단계
	'between-count': 2, // 사이 정수 개수, 5♥6=0 단서
	'roman-len': 4, // 로마 숫자 떠올리기 도약
	'divisor-count': 3, // 약수 개수, 한 단계
	'reverse-sub': 3, // 자기-뒤집은 수
	'city-holes': 3, // 글자 구멍, B=2 알아야
	'elevator-4': 3, // 4층 없음, n−1 함정
	'keyboard-left': 4, // 자판 한 칸 밀기+영단어
	'solfege': 3, // 실측 60%(5건)
	'ob-chon-count': 3, // 촌수 지식, 4촌 함정
	'hidden-num-word': 3, // 영단어 속 숫자, 쉬운 편
	'no-30th': 2, // 말장난, 2월 하나
	'dice-tower': 4, // 마주보는 면 합7 추론
	'cal-hourhand-laps': 2, // 12시간 한 바퀴, 1 함정
	'month-letters': 4, // 영어 월 이름 글자 수
	'kr-vowel-contract': 1, // 애→외 바로 보임
	'kr-common-head': 2, // 손수건·손바닥 쉬움
	'sh-painted-cube': 2, // 고전, 정중앙 1개
	'name-family': 3, // 수 이름 첫 자음, 4지
	'cal-o-and-ja': 3, // 12지 거꾸로 세기
	'square-diff': 4, // 제곱 발상이 첫 추측 아님
	'quot-rem': 3, // 몫·나머지 이어 쓰기
	'clock-add': 2, // 시계 덧셈, 실측 87%
	'straight-strokes': 4, // 영문 직선 획수 합산
	'sum-to-letter': 4, // 실측 50%(12건)
	'jamo-count': 2, // 자모 낱자 세기
	'sum-eq-product': 4, // 자릿수 합=곱 발견
	'adjacent-letters': 4, // 알파벳 연속쌍 세기
	'en-first-a': 3, // 실측 77%, 보기형
	'kr-lip-sounds': 1, // ㅃ이 ㅂ 닮아 바로
	'dotted-letters': 3, // i·j 점 세기
	'anagram-eq': 3, // 애너그램 선택지
	'cal-even-doubles': 3, // 63일 세기, 보기형
	'cal-mid-year': 4, // 월별 날수 합+7/1 함정
	'tomorrow-yesterday': 1, // 상쇄, 즉답
	'month-prefix': 2, // MARCH·JAN 금방 보임
	'alpha-order-nums': 4, // 영어 이름 사전순
	'korean-name-len': 4, // 실측 20%, 읽은 글자 수
	'sh-card-52': 1, // 4×13, 객관식
	'nm-factorial-zeros': 4, // 25 함정, 5의 개수
	'nm-ones-square': 1, // 121·12321 산 모양
	'caesar-minus': 3, // 알파벳 한 칸 당기기
	'honest-number': 4, // 영어 이름 글자 수 사슬
	'club-e': 4, // 영어 이름 E 유무
	'stairs': 3, // 구간 함정, 60 오답
	'book-pages': 2, // 연속수 곱, √600
	'day-7777': 2, // 7777=7×1111 눈에 띔
	'hanja-strokes': 3, // 한자 획수, 五=4 단서
	'anagram-numbers': 4, // 영어 재배열+계산
	'lcd-fragments': 5, // 꺼진 획 여집합
	'cal-shadow-45': 2, // 같은 두 변, 45도 직감
	'rotate-self': 3, // 뒤집기 숫자 탐색
	'clock-face-sum': 2, // 1~12 합 암산
	'flip-add': 4, // 실측 60%, 시행착오
	'binary-seq': 3, // 이진법 지식 필요
	'odd-even-branch': 4, // 홀짝 분기 두 규칙
	'size-branch': 3, // 대소 따라 갈림
	'squares-between': 4, // 사이 제곱수 개수
	'palindrome-branch': 5, // 대칭수 조건부 연산
	'odd-letters': 2, // 홀수째 글자, 바로 보임
	'reverse-word-club': 4, // 영단어 거꾸로 어휘
	'consonant-asc-club': 5, // 자음 알파벳 순+복수답
	'consecutive-sum-club': 5, // 연속합, 복수 정답
	'abundant-club': 5, // 진약수 합 대량 암산
	'compound-mult': 4, // 합성어 조각 길이 곱
	'rhyme-number': 4, // 영어 라임 지식
	'leet-letters': 4, // 글자 닮은 숫자 합
	'day-month': 5, // 실측 10%
	'month-nth-letter': 4, // 영어 달 이름 n번째
	'dice-double': 3, // 차, 더블이면 합
	'yellowcard-reset': 3, // 5경기 초기화 찾기
	'stadium-seats': 3, // 층마다 방향 교대
	'color-alpha': 5, // 영어 색이름 순+NAVY
	'color-newcolor': 4, // 색 약자+차집합
	'color-pairing': 4, // 색 짝 추론 세 줄
	'ob-ladder-unique': 3, // 직관 vs 원리 선택
	'digitwise-add': 3, // 312=3|12 보임
	'clock-630-angle': 3, // 0도 함정, 시침 이동
	'vowel-club': 2, // 모음 없음, 객관식
	'prime-reject-club': 2, // 소수 거절, 보기 쉬움
	'big-month-club': 2, // 31일 달, 2월
	'riddle-yeol': 1, // 열, 바로 떠오름
	'riddle-x': 1, // X 수수께끼 즉답
	'en-lowercase-nations': 2, // turkey=칠면조 상식
	'lcd-evolution': 2, // 실측 100%(6건)
	'subway-board': 3, // 줄 이어 4자리 끊기
	'fold-sum': 3, // 양끝 짝 합 50
	'club-double-letter': 3, // 겹친 글자 두 개 답
	'club-case-twin': 4, // 대소문자 모양 같음
	'disc-1': 3, // 위치 번호→STAMP
	'disc-2': 4, // 로마 숫자 값 지식
	'disc-3': 4, // 봉우리 개념 낯섦
	'disc-4': 5, // 솟은·내린 글자 차
	'disc-5': 4, // 실측 20%, 경계 개수
	'disc-6': 2, // 뒤 세 자리 제곱수
	'disc-7': 2, // 처음 나온 숫자만
	'disc-8': 4, // 소인수 종류 수
	'bus-dir': 4, // 문 반대편 추론
	'fig-dice': 3, // 마주보는 면 합 7
	'fig-clock': 3, // 바늘 사이 칸 수
	'ob-two-coins': 3, // 말장난 고전 보기형
	'glyph-hole-wang': 3, // 닫힌 칸, 5 함정
	'glyph-hole-concat': 2, // 口日=12로 바로 보임
	'glyph-sym-count': 3, // 대칭 한자 세기 반전
	'glyph-rot180': 4, // 180도 대칭 글자 판별
	'glyph-diagonal': 2, // 대각선 획 세기
	'glyph-endpoint': 3, // 끝점 세기 발상
	'glyph-curve': 3, // 곡선 글자 세기
	'num-diffsum': 3, // 차·합 이어붙이기
	'num-parityorder': 4, // 합 홀짝으로 순서
	'num-insertdiff': 2, // 가운데=차, 606 단서
	'num-reverse1': 4, // 붙이고 뒤집고 +1
	'glyph-vowel-branch': 2, // 가지 개수 세기
	'glyph-seg-vertical': 2, // 세로 획만, 8=4 단서
	'glyph-ascdesc': 4, // 위아래 삐짐, 예시 둘
	'word-keyboard': 4, // 자판 윗줄 기억
	'kr-native-club': 3, // 순우리말, 강=한자 함정
	'word-overlap': 2, // 겹치는 글자 포개기
	'kr-acronym-expand': 1, // 아는 말, 객관식
	'struct-add': 3, // 위 이웃 두 수 합
	'struct-clock': 2, // 시계 짧은 간격
	'struct-alpha-mod': 4, // 순번 합 mod 26
	'fig-fold': 2, // 접기 그림, 직관
	'fig-seesaw': 3, // 거리×개수 모멘트
	'fig-pacman': 3, // 착시 꼭짓점 세기
	'fig-border': 2, // 테두리 꼭짓점 세기
	'fig-chiral': 3, // 회전·거울 공간 판단
	'fig-shadow': 2, // 더 높은 쪽 따라감
	'fig-pipe': 2, // 선 따라가기
	'fig-rotpair': 4, // 서로 다른 주기 두 개
	'fig-foldarrow': 4, // 전개도 접기 공간
	'fig-lonely': 3, // 접기 대칭 점 세기
	'kr-vertical-read': 2, // 세로 읽기 우유
	'txt-ssbatchim': 2, // 겹받침 개수
	'txt-dateformat': 2, // 25/03 단서, 실측 100%
	'month-name-yu': 1, // 유월→시월 즉시
	'year-day-count': 2, // 연중 날수 누적
	'cal-saheul-trap': 2, // 사흘·나흘, 보기형
	'hidden-clock-add': 2, // 시각 표기, 60 경계
	'stopped-clock': 3, // 멈춘 시계 역발상
	'century-1900': 2, // 예시 1800이 답 알려줌
	'hour-hand-half': 1, // 6시 반, 즉답
	'month-end-jump': 1, // 달 날수, 실측 100%
	'cal-clock-opposite': 1, // 마주 보는 숫자 선택
	'newyear-age': 4, // 생일 12/31 역발상
	'sock-drawer': 2, // 고전 비둘기집
	'snail-well': 3, // 유명 함정, 10 오답
	'bottle-exchange': 2, // 빈 병 재교환 13
	'overtake-second': 2, // 유명 추월 함정
	'lily-pond': 2, // 고전, 15 함정
	'cake-three-cuts': 3, // 수평 칼 발상
	'third-son-name': 2, // 고전 말장난
	'tournament-games': 2, // 8+4+2+1 쉬움
	'ob-light-first': 1, // 성냥, 고전 넌센스
	'kr-loan-stretch': 4, // 한글 표기 소리 도약
	'kr-jang-jaeng': 2, // 기술=장이 익숙
	'vertical-vowel-club': 2, // 모음 아래 붙음, 보기형
	'apostrophe-eaten': 3, // 영어 축약 원형
	'ordinal-suffix': 2, // 서수 접미사 상식
	'silent-letter-club': 3, // 묵음, 영어 발음
	'hanja-combine': 1, // 木木=숲 바로
	'direction-idiom': 2, // 방향 글자 쌍, 보기형
	'kr-approx-numbers': 1, // 예닐곱 일상어 4지
	'num-square-neighbor': 3, // +1 하면 제곱수
	'num-hundred-gap': 4, // 합과 100 거리
	'num-run-count': 3, // 같은 숫자 덩어리
	'num-coin-count': 3, // 돈으로 보기 도약
	'num-keypad-flip': 4, // 전화·계산기 배열 지식
	'num-carry-count': 4, // 받아올림 횟수
	'num-page-digits': 4, // 쪽번호 숫자 총수 계산
	'nm-sheep-riddle': 2, // 읽기 함정, 고전
	'num-odometer': 3, // 999→1000 앞자리 함정
	'club-cube': 2, // 세제곱수
	'club-letter-sound': 4, // 영어 발음+복수답
	'club-number-start': 3, // 첫 글자 수, 백·만 함정
	'club-plural': 3, // 불규칙 복수 두 개
	'club-body-pairs': 1, // 두 개씩 신체
	'club-baby-animals': 1, // 동물 새끼 이름
	'club-self-divisible': 4, // 자릿수로 나눔, 복수
	'club-sun-partner': 3, // SUN 붙이기 두 개
	'club-doer': 3, // 동사+ER 영어
	'lcd-half-hidden': 4, // 윗획만으로 숫자 복원
	'lcd-hidden-digits': 4, // 획 속 숨은 숫자
	'lcd-horizontal-only': 4, // 가로획 역추론+합
	'lcd-clock-repdigit': 2, // 6:66 없음→11:11
	'lcd-look-say': 4, // 읽고 말하기 수열
	'kr-self-length': 3, // 쉬우나 실측 40%(5)
	'kr-word-ladder': 2, // 자모 하나 바꾸기
	'word-syllables': 4, // 영어 음절 수
	'kr-club-vowel-words': 3, // 자음 소리 없는 낱말
	'nm-seven-ones': 3, // −3 순환, 일의 자리
	'kr-chunjiin': 2, // 실측 89%, 천지인
	'rc-saw': 3, // 톱질 횟수 함정
	'rc-electric-smoke': 2, // 전기라 연기 없음
	'rc-discount': 2, // 연속 할인 곱, 함정
	'rc-avg-speed': 4, // 45 함정, 조화평균
	'rc-before-discovery': 1, // 보기형 고전 넌센스
	'rc-hole-dirt': 3, // 8 계산 함정, 주관식
	'rc-chain-sqsum': 4, // 자릿수 제곱합
	'rc-digit-chain': 2, // 끝말잇기 선택지
	'rc-chain-maxdigit': 3, // 최대 자릿수 빼기
	'rc-ottffss': 3, // 영어 수 첫 글자
	'rc-neighbor-tri': 2, // 위 두 수 합
	'rc-sum-ones': 2, // 합의 일의 자리
	'rc-magic-square': 1, // 마방진 합 15
	'rc-chain-shrink': 2, // 한 글자 빼기 SING
	'rc-self-shift': 3, // 1·3·5칸, 알파벳 셈
	'rc-divide-half': 3, // ½ 나누기 함정
	'rc-brick-weight': 3, // 반 장=1kg 함정
	'rc-club-noloop': 3, // 구멍 숫자, 복수답
	'rc-club-nocurve': 3, // 직선 대문자, 복수
	'rc-train-tunnel': 2, // 기차 길이 더하기
	'rc-club-triangular': 3, // 삼각수 차 3,4,5
	'rc-club-nobatchim': 2, // 받침 없는 글자
	'rc-club-echo': 3, // 두 모음 같음
	'rc-club-consec': 2, // 1씩 커지는 수
	'rc-club-samefirst': 2, // 첫 자음 같음
	'rc-club-hidden-animal': 4, // 실측 50%(18)
	'rc-club-bookends': 2, // 첫 끝 글자 같음
	'cal-birthday-364': 2, // 하루 빼기
	'cal-week-back': 2, // 100÷7 나머지
	'cal-square-sum': 3, // 달력 +1 +7 구조
	'cal-leap-birthdays': 2, // 20÷4=5 바로
	'cal-1900-not-leap': 2, // 1900 예시 유추
	'cal-clock-angle': 1, // 30도×2
	'cal-clock-overlap': 4, // 24 함정, 22번
	'cal-mirror-clock': 1, // 합 12, 즉답
	'cal-billion-seconds': 2, // 12일×1000 선택
	'cal-lighthouse-sync': 2, // 최소공배수 36
	'cal-sunday-53': 3, // 52주+1일, 보기형
	'cal-newyear-drift': 4, // 윤년 이틀 함정
	'cal-hands-line-hours': 3, // 6시 오전오후 2번
	'cal-has-28th': 2, // 말장난 고전
	'cal-days-between': 1, // 양끝 포함 10개
	'cal-blue-moon': 1, // 29.5<31, 객관식
	'cal-natural-unit': 2, // 1년=공전 선택
	'cal-perpetual': 3, // 실측 60%(5건)
	'cal-clock-strike-gap': 2, // 간격 n−1개
	'cal-feb-mirror': 3, // 평년 2월 28일=4주
	'cal-half-past': 4, // 시침 이동 각도 계산
	'cal-fifty-hours': 2, // 48시간=이틀
	'cal-same-date-weekday': 3, // 최소=2월 떠올려야
	'cal-iso-sort': 1, // 객관식, 실측 90%
	'cal-broken-ladder': 1, // 4주≠1달 바로 보임
	'ob-pills': 2, // 간격 2번 함정
	'ob-portrait': 4, // 유명 함정, 그 자신
	'ob-coins-fake': 4, // 세 무더기 발상
	'ob-water-jug': 4, // 최소 횟수 시뮬레이션
	'ob-white-bear': 2, // 북극 고전, 보기형
	'ob-two-doors': 1, // 참말이면 응
	'ob-bridge-lamp': 1, // 함께 건너 2분
	'ob-short-rider': 2, // 고전 추리 선택지
	'ob-news-pages': 4, // 앞뒤 합 29 발상
	'ob-family-count': 3, // 자기 제외하고 세기
	'ob-mixed-nuts': 3, // 고전 논리, 섞임 상자
	'ob-burning-rope': 3, // 양끝 점화 선택지
	'ob-hat-color': 3, // 논리 추론 보기형
	'ob-chess-square': 3, // 9 함정, 14개
	'ob-shake-total': 2, // 차 3·4·5, 실측 83%
	'rc-rooster-egg': 1, // 실측 100%
	'ob-bat-ball': 3, // CRT 고전 함정
	'sh-seg-count': 1, // 켜진 획 수, 8=7
	'sh-polygon-angles': 2, // 180씩 증가
	'sh-sym-vertical': 2, // 좌우대칭 O/X
	'sh-cube-shadow': 4, // 공간 감각, 육각형
	'sh-closed-count': 1, // 대문자 닫힌 칸
	'sh-tetromino-count': 3, // 테트리스 7 함정
	'sh-overlap-shape': 1, // 원은 불가 즉시
	'sh-nine-dots': 3, // 틀 밖 고전 퍼즐
	'ob-parallel-eggs': 2, // 실측 83%, 동시
	'sh-coin-rotation': 4, // 직관 반대, 한 바퀴 함정
	'sh-mobius-cut': 4, // 뫼비우스 반직관
	'sh-fold-semicircle': 2, // 접어 오리면 원
	'sh-corner-cut': 2, // 3 함정, 5개
	'sh-clock-digits': 1, // 8이 획 많음, 객관식
	'sh-square-triangles': 3, // 합친 삼각형 누락
	'nm-sum-1-100': 2, // 5050 유명
	'nm-square-gap': 1, // 25−16 바로
	'nm-digit-root': 2, // 한 자리까지 합
	'nm-camel-legacy': 3, // 분수 합 17/18
	'nm-double-half': 4, // 콜라츠 3n+1
	'nm-fake-prime': 3, // 51=3×17 배수 판정
	'nm-fib': 2, // 앞 두 수 합
	'nm-digit-chain': 3, // 자릿수 곱
	'nm-alternating': 2, // 홀짝 자리 분리
	'nm-reverse-add': 2, // 뒤집어 더하기
	'nm-grow-mult': 2, // ×2·×3·×4
	'nm-gcd-op': 3, // 최대공약수
	'nm-4100-trap': 2, // 암산 함정, 써서 풂
	'ob-count-ones': 4, // 11 두 번·100 놓침
	'ln-vowel-count': 3, // 모음 종류, Y 제외
	'en-compound-literal': 2, // 버터+파리 직역
	'sh-seg-swap': 2, // 획 하나로 9
	'sh-symmetry-digit': 5, // 2지선다 60%, 거의 찍기
	'nm-percent-updown': 3, // 실측 77%, 편향 감안
	'nm-power-op': 4, // 실측 62%, 거듭제곱
	'ob-ternary-weights': 4, // 실측 43%(7건)
	'kr-native-count': 3, // 실측 75%, 우리말 읽기
	'sh-rotate-180': 2, // 실측 83%, 자리 뒤집힘
	'cal-13th-day': 3, // 나머지 5칸 이동
	'ob-stair-gap': 3, // 실측 80%(5건) 보정
	'cal-analog-alarm': 1, // 실측 100%(10)
	'kr-silent-ieung': 2, // 받침 ㅇ, 실측 88%
	'num-roman-strokes': 2, // 실측 100%, 획수
	'sh-polygon-diag': 2, // 실측 100%(8건)
	'nm-flip-product': 4, // 자리끼리 곱 규칙
	'en-question-club': 2, // 의문사, 실측 86%
	'cal-hypothetical-day': 4, // 꼬인 시점 3일 이동
	'sh-fold-punch': 1, // 4겹 4구멍
	'ob-trains-meet': 2, // 같은 지점, 넌센스
	'num-op-plus-times': 4, // 곱+합 조합
	'rc-club-siblings': 3, // 실측 71%, 대등 관계
	'ko-palindrome': 1, // 회문, O/X
	'sh-seg-union': 4, // 전광판 획 합집합
	'ob-fathers-sons': 1, // 3대 고전, 실측 100%
	'cal-year-wrap': 5, // 실측 29%
	'kr-batchim-months': 2, // 받침 유무
	'num-place-add': 3, // 실측 67%, 자리별 합
	'ob-stair-ways': 2, // 3·5 다음 8 추측
	'nm-square-reverse': 3, // 제곱수 뒤집기
	'rc-boat-ladder': 3, // 배도 뜬다 고전
	'riddle-bae': 1, // 배, 바로 떠오름
	'nm-len-branch': 3, // 그냥 더해도 13
	'sh-fold-corner': 4, // 접힌 구석=정중앙
	'riddle-nun': 1, // 눈 수수께끼
	'riddle-mal': 2, // 실측 71%, 마지막 줄 말
	'nm-swap-sort': 5, // 최소 교환 수
	'ob-cups-parity': 4, // 홀짝 불변량
	'num-keypad-line': 3, // 전화 자판 직선
	'ob-bookworm': 5, // 실측 14%, 꽂힌 방향
	'word-pen-lift': 5, // 한붓 가닥 수 합
	'sh-mirror-angle': 4, // 360÷각도−1
	'nm-times-table-count': 4, // 구구단 곱 경우 수
	'keyboard-shift-count': 4, // 두벌식 Shift 자모
	'rc-chain-selfrotate': 4, // 앞 숫자만큼 회전
	'glyph-cross-junction': 4, // 十자 vs T자 구분
	'book-sheet-tear': 4, // 홀짝 쪽 장 계산
	'num-hidden-fraction': 5, // 두 자리를 분수로
	'clock-hands-product': 5, // 분침 숫자 곱 발상
	'kr-bright-vowels': 4, // 양성모음 ㅏㅗ 세기
	'cal-weekday-hop': 4, // 주말 건너뛰기
	'rank-share-tie': 4, // 평균 순위, 긴 예시
	'sh-block-visible-faces': 3, // 가려진 면 빼기 세기
	'rc-ring-neighbors': 5, // 양옆 합+고리 두 겹
	'glyph-rain-pool': 4, // 빗물 고임 낯선 발상
	'dice-roll-forward': 5, // 공간 회전+긴 지문
	'cal-date-wheel': 5, // 31일 창 누적 지연
	'num-digitsum-min': 5, // 실측 20%
	'rc-seat-farthest': 4, // 최대 거리 착석 시뮬
	'rc-seat-center-out': 5, // 좌석 배치 재구성
	'num-chapter-odd-start': 4, // 홀수 쪽 시작, 다단계
	'cal-swapped-hands': 5, // 바늘 교환+시침 이동
	'cal-decimal-clock': 5, // 10진 시계 환산
	'en-club-first-letter-length': 5, // 순번=길이+복수답
	'kr-sort-last-syllable': 4, // 끝 글자 가나다순
	'op-number-baseball': 3, // 숫자 야구 아는 놀이
	'en-club-behead': 4, // 첫 글자 떼면 영단어
	'kr-club-sound-word': 4, // 연음 낱말+복수답
	'num-369-game': 2, // 369 게임 연상
	'kr-vowel-robot': 4, // 모음 획=방향 이동
	'cal-dotless-dates': 5, // 월일 쪼개기 경우 수
	'num-dial-lock': 4, // 자물쇠 최소 칸
	'num-floor-no-zero': 4, // 0층 없는 빼기
	'num-pattern-lock': 3, // 잠금 패턴 떠올리면 끝
	'kr-rotate-180': 4, // 한글 180도 회전
	'en-letter-names': 3, // 글자 이름 소리 EIGHTY
	'en-multitap': 4, // 피처폰 자판 횟수
	'op-piano-keys': 4, // 건반 반음 세기
	'num-bracket-round': 5, // 대진표 만나는 라운드
	'rps-fingers': 1, // 10/20 새로 · 검수 새싹 적합
	'legs-sum': 1, // 10/20 새로 · 검수 새싹 적합
	'cal-arrow-move': 2, // 10/20 새로 · 검수가 쉬움으로 판정
	'buy2-get1': 1, // 10/21 새로 · 2+1 행사, 첫 가설이 2줄에서 죽음
	'ring-cut': 1, // 10/21 새로 · 고리는 첫 가위질 +0
	'ob-gear-ring': 5, // 10/21 새로 · 짧은 길 미끼(반시계), 두 길 모순 발견
	'delivery-free': 1, // 10/22 새로 · 배달비, 19000원어치가 2만 원어치보다 비쌈
	'cup-stack': 1, // 10/22 새로 · 종이컵은 포개져서 하나에 1cm
	'grid-diagonal-op': 5, // 10/22 새로 · 모눈 대각선이 지나는 칸, a+b−최대공약수
	'school-grade': 1, // 10/23 새로 · 몇 해째 → 학년(6 · 3 · 3에서 1로)
	'escalator-stopped': 5, // 10/23 새로 · 멈춘 에스컬레이터, 빠르기를 빼야 60초
	'track-lane-stagger': 5, // 10/23 새로 · 트랙 출발선, 반원 둘 = 원 하나라 2π × 레인 폭
	'riddle-gim': 1, // 10/26 새로 · 다의어 김, 김매기의 김이 잡풀
	'square-cut-op': 5, // 10/26 새로 · ▣ 종이에서 큰 정사각형부터 잘라 내기, 유클리드 몫의 합
	'tissue-roll': 5, // 10/26 새로 · 두루마리 휴지 두께 절반이면 남은 양 3/8, 고리 넓이
	'club-sseuda': 1, // 10/27 새로 · 「쓰다」 착용물 클럽, 우산도 쓴다
	'count-game-21': 5, // 10/27 새로 · 2~5개씩 세기 놀이, 1개 금지라 이기는 자리가 한 바퀴에 둘 → 6개
	'kr-word-ring': 1, // 10/27 새로 · 끝말잇기 고리가 닫히면 ○
	'club-cry-name': 1, // 10/28 새로 · 이름에 울음소리가 든 동물 클럽
	'updown-64': 5, // 10/28 새로 · 업다운 1~64 최악 7번(2^k − 1)
	'strip-fold-cut': 5, // 10/28 새로 · 종이띠 3번 접어 한 번 자르기 → 9조각(2^n + 1)
};

/**
 * 문제 하나의 단계 — 상식은 학년(tiers.ts TIER_OF_GRADE), 발견형은 위 표. 모르면 null(성냥 · 전개도는 아직 단계가 없다).
 * 오늘의 10문제 계단(game.ts)과 문제 카드의 단계 표시가 같이 쓴다.
 */
export function tierOf(p: { id?: string; grade?: string; trivia?: boolean; tier?: Tier } | undefined | null): Tier | null {
	if (!p) return null;
	if (p.trivia || p.grade) return p.tier ?? TIER_OF_GRADE[p.grade ?? ''] ?? null;
	return (p.id && DISCOVER_TIERS[p.id]) || null;
}
