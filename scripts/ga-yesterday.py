"""아침에 제일 먼저 보는 것 — 어제 하루가 어땠는지.

  set GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 키 경로>
  python scripts/ga-yesterday.py          어제
  python scripts/ga-yesterday.py 2        그저께
  python scripts/ga-yesterday.py 0        오늘(집계 중)

ga-daily.py는 14일을 뭉뚱그려 본다. 그건 추세를 보는 물건이고, 아침에 필요한 건
"어제 몇 명이 왔고, 누가 문제를 풀었고, 누가 알림을 켰나"다. 그래서 하루만 본다.

날짜 인사(「8월 25일 화요일이야」)를 받으면 이 스크립트부터 돌린다.

**숫자는 한국만 센다.** 2026-09-07에 전 국가 합계를 보고 「7일 활성 137~197, 3주째
정체」라고 진단했다가 뒤집었다 — 미국에서 오는 봇이 8월 말 67명까지 부풀었다가 9월에
3명으로 사라져서 평평해 보인 것이었다. 한국만 보면 같은 기간 28 → 137이다.

  전 기간(7/14~9/06)  한국 693세션 참여 63% 체류 172초 / 미국 143세션 참여 6% 체류 3.2초

거른 것은 [걸러낸 것] 줄에 그대로 찍는다. 조용히 빼면 같은 착각을 또 한다 — 참여율이
40%를 넘거나 체류가 30초를 넘으면 봇이 아니라 진짜 사람이니 필터를 다시 생각해야 한다.
"""

import os, sys, io, datetime
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    sys.exit("GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로를 넣어라.")

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Filter,
    FilterExpression,
    Metric,
    RunReportRequest,
)

PROPERTY = "properties/547486275"
BACK = int(sys.argv[1]) if len(sys.argv) > 1 else 1
client = BetaAnalyticsDataClient()

DAY = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=9)).date() - datetime.timedelta(days=BACK)
DATE = DAY.isoformat()
WD = "월화수목금토일"[DAY.weekday()]


KR = FilterExpression(
    filter=Filter(field_name="country", string_filter=Filter.StringFilter(value="South Korea"))
)
NOT_KR = FilterExpression(not_expression=KR)


def rep(dims, mets, limit=50, flt=KR):
    return client.run_report(
        RunReportRequest(
            property=PROPERTY,
            date_ranges=[DateRange(start_date=DATE, end_date=DATE)],
            dimensions=[Dimension(name=d) for d in dims],
            metrics=[Metric(name=m) for m in mets],
            dimension_filter=flt,
            limit=limit,
        )
    ).rows


def rep7(dims, mets, limit=50, flt=KR):
    """DAY 직전 7일. 하루 25명 규모에서 일간 비교는 노이즈라 기준선이 필요하다."""
    a = (DAY - datetime.timedelta(days=7)).isoformat()
    b = (DAY - datetime.timedelta(days=1)).isoformat()
    return client.run_report(
        RunReportRequest(
            property=PROPERTY,
            date_ranges=[DateRange(start_date=a, end_date=b)],
            dimensions=[Dimension(name=d) for d in dims],
            metrics=[Metric(name=m) for m in mets],
            dimension_filter=flt,
            limit=limit,
        )
    ).rows


def num(rows, i=0):
    return int(float(rows[0].metric_values[i].value)) if rows else 0


# ── 규모 ──
tot = rep([], ["activeUsers", "newUsers", "sessions", "screenPageViews", "userEngagementDuration"])
users, new, sess, pv = (num(tot, i) for i in range(4))
eng = num(tot, 4)
back = users - new
mmss = f"{eng // users // 60}:{eng // users % 60:02d}" if users else "0:00"

print(f"\n{'=' * 52}")
print(f"  {DAY.month}월 {DAY.day}일 ({WD}) 하루")
print(f"{'=' * 52}")
# ── 아직 못 믿는 숫자 ──
# 같은 지표를 이틀에 세 번 잘못 읽었다(2026-09-08·09·10). GA4는 참여세션·이탈률을
# 늦게 채우고 총계도 며칠 뒤 늘린다. 문서에 적어 둬도 또 읽으니 여기서 찍는다.
성숙 = rep([], ["sessions", "engagedSessions"])
세션수, 참여수 = num(성숙, 0), num(성숙, 1)
참여율 = 참여수 / 세션수 * 100 if 세션수 else 0
못믿을것 = []
if 세션수 and 참여율 < 20:
    못믿을것.append(f"참여세션·이탈률·체류 (참여 {참여율:.0f}% — 여문 날은 70~90%다)")
if BACK <= 2:
    못믿을것.append("총계(방문자·세션·PV) — 며칠 뒤 늘어난다")
if 못믿을것:
    print("\n[아직 못 믿는 숫자]")
    for x in 못믿을것:
        print(f"        · {x}")
    print("        GA4가 나중에 채운다. 사나흘 뒤에 다시 재라.")
    print("        실측(9/08을 다음 날 vs 이틀 뒤): 참여 4% → 76% · 세션 27 → 29 · 재방문 7명 → 4명")

# 무엇을 걸렀는지 반드시 보여 준다 — 조용히 빼면 같은 착각을 또 한다
밖 = rep([], ["activeUsers", "sessions", "engagementRate", "userEngagementDuration"], flt=NOT_KR)
if 밖 and num(밖, 0):
    밖명, 밖세션 = num(밖, 0), num(밖, 1)
    밖참여 = float(밖[0].metric_values[2].value) * 100
    밖체류 = num(밖, 3) / 밖세션 if 밖세션 else 0
    경고 = "  <- 참여·체류가 높다. 봇이 아니라 사람일 수 있다" if (밖참여 > 40 or 밖체류 > 30) else ""
    print(f"\n[걸러낸 것]  한국 밖 {밖명}명 · {밖세션}세션 · 참여 {밖참여:.0f}% · 체류 {밖체류:.0f}초{경고}")

print(f"\n[사람]  방문자 {users}명 — 처음 온 사람 {new}, 다시 온 사람 {back}")
print(f"        세션 {sess} · 페이지뷰 {pv} · 1인 평균 체류 {mmss}")

# 하루 25명 규모에서 「어제보다 늘었다」는 동전 던지기 해설이다. 2026-09-10에 재방문
# 42%를 「지금까지 최고」라고 했다가 5분 만에 뒤집었다 — 13일 시리즈가 0~42%를 튄다.
# 그래서 어제 숫자 바로 밑에 기준선을 놓는다. 이 줄 안에 들면 아무 일도 안 일어난 것이다.
# **date 차원 없이 기간으로 부르면 안 된다.** GA4가 사람을 기간 단위로 중복 제거해서
# 1일에 처음 와서 3일에 또 온 사람이 「신규」로 잡힌다 — 재방문율이 22%가 아니라 10%로
# 나온다(9/10에 이 줄을 처음 찍고 바로 발견했다). 일별로 뽑아 더해야 어제 숫자와 같은 자다.
기 = rep7(["date"], ["activeUsers", "newUsers", "sessions"], limit=10)
if 기:
    기명 = sum(int(float(r.metric_values[0].value)) for r in 기)
    기신규 = sum(int(float(r.metric_values[1].value)) for r in 기)
    기세션 = sum(int(float(r.metric_values[2].value)) for r in 기)
    기재방문 = (기명 - 기신규) / 기명 * 100 if 기명 else 0
    지재방문 = back / users * 100 if users else 0
    print(
        f"        재방문율 {지재방문:.0f}% (n={users})"
        f"   ← 앞 7일 {기재방문:.0f}% (n={기명}) · 세션 하루 평균 {기세션 / 7:.1f}"
    )
    print("        표본이 이만하면 일간 차이는 대개 노이즈다. 이 줄과 크게 어긋날 때만 파고들어라.")

# ── 유입 ──
print("\n[어디서 왔나]")
src = rep(["sessionSource", "sessionMedium"], ["sessions", "activeUsers"])
src.sort(key=lambda r: -int(r.metric_values[0].value))
if not src:
    print("        (없음)")
for r in src[:10]:
    s, m = (v.value for v in r.dimension_values)
    print(f"        {s:<24} {m:<10} 세션 {r.metric_values[0].value:>3}  방문 {r.metric_values[1].value:>3}")

# ── 행동 ──
LABEL = [
    # 9/3부터 누른 순간(press)과 화면이 뜬 순간(start)을 나눠 찍는다. 예전에는 문제은행
    # 전체를 받은 뒤에야 daily_start가 찍혀 「눌렀는데 안 기다리고 나간 사람」이 안 보였다.
    # press > start면 그 차이가 로딩 중 이탈이다.
    ("daily_press", "시작 버튼 누름"),
    ("daily_start", "오늘의 10문제 시작(화면 뜸)"),
    ("daily_resume", "이어풀기"),
    ("daily_complete", "완주"),
    ("problem_result", "문제 풀이(정답·오답 제출)"),
    ("practice_start", "무한 연습 시작"),
    # 노출은 렌더가 아니라 화면에 절반 이상 들어온 순간이다(analytics.ts ctaTrack).
    # 「공유 영역을 본 사람」 대비 「누른 사람」이 곧 공유율의 분모·분자다.
    ("cta_share_seen", "공유 영역이 눈에 들어옴"),
    ("share_click", "공유 누름"),
    ("share_result", "결과 공유"),
]
# 첫 화면 맛보기 — 10문제를 시작하기 전 단계라 위 목록과 섞으면 깔때기가 어긋난다.
SAMPLE = [
    ("sample_try", "맛보기 답 넣어봄"),
    ("sample_reveal", "맛보기 정답 열어봄"),
    ("sample_go", "맛보기에서 10문제로"),
]
# push_offer / install_offer는 컴포넌트가 "그려질 때" 찍힌다. 화면에 렌더됐다는 뜻이지
# 사람이 봤다는 뜻이 아니다 — 8/26에 다섯 명에게 찍혔는데 버튼이 접힘 아래라 아무도
# 못 눌렀다(#279에서 공유 위로 올렸다). 그래서 "봄"이 아니라 "떴음"으로 적는다.
ALERT = [
    ("push_offer", "알림 제안이 떴음(렌더)"),
    ("push_click", "알림 켜기 누름"),
    ("push_result", "알림 설정 완료"),
    ("push_dismiss", "알림 거절"),
    ("reminder_download", "캘린더 알림 받음"),
    ("install_offer", "앱 설치 제안이 떴음(렌더)"),
    ("install_click", "설치 누름"),
    ("install_result", "설치 완료"),
    ("install_dismiss", "설치 거절"),
    ("install_hint_click", "설치 방법 열어봄"),
    # 완주했는데 아무 제안도 못 본 사람. 2주 누계로 완주 35명 중 12명(34%)이 여기 있었는데
    # 왜 그랬는지 기록이 없었다. reason으로 갈린다 — inapp·standalone은 설계대로지만
    # no-install-event(데스크톱에서 설치 이벤트가 끝내 안 옴)는 구멍이다.
    ("prompt_skip", "제안이 아예 안 떴음"),
]
# 목록형 페이지(/trivia/<분야> 18쪽 · /discover/<분야> 6쪽)에서 데일리로 가는 링크.
# 두 자리가 있다 — 본문 중간의 띠(band)와 맨 아래 버튼(foot).
#
# 9/7에 붙였다. 9/5~06 주말 유입의 36%가 이 페이지들로 들어왔는데 데일리 시작은 4명뿐이라
# 「CTA가 없어서」라고 단정했다가, 파일을 열어 보니 둘 다 있었다. 없는 게 아니라 안 눌리는
# 것이었고, 왜 안 눌리는지는 재 본 적이 없었다.
#
# seen은 렌더가 아니라 **화면에 절반 이상 들어온 순간**이다. push_offer가 렌더 시점이라
# 8/26에 「다섯 명에게 떴는데 아무도 못 눌렀다」가 됐던 것과 같은 함정을 피한다.
#   seen이 0에 가깝다  → 아무도 거기까지 안 내려간다. 위치 문제.
#   seen은 큰데 click이 0 → 보이는데 안 끌린다. 문구·생김새 문제.
# trivia냐 discover냐, 어느 분야냐는 표준 차원 pagePath로 교차해서 본다.
CTA = [
    ("cta_band_seen", "본문 중간 띠가 눈에 들어옴"),
    ("cta_band_click", "본문 중간 띠 누름"),
    ("cta_foot_seen", "맨 아래 버튼이 눈에 들어옴"),
    ("cta_foot_click", "맨 아래 버튼 누름"),
]
# 인앱 브라우저(스레드·카톡 등)에서 들어온 사람에게만 뜬다. 여기서 새면 홍보 유입이
# 통째로 사라지므로 따로 센다.
INAPP = [
    ("inapp_gate", "인앱 안내가 떴음"),
    ("inapp_open_external", "브라우저로 열기 누름"),
    ("inapp_skip", "그냥 인앱에서 계속"),
]
ev = defaultdict(lambda: (0, 0))
for r in rep(["eventName"], ["eventCount", "activeUsers"], limit=80):
    ev[r.dimension_values[0].value] = (int(r.metric_values[0].value), int(r.metric_values[1].value))


def block(title, items):
    print(f"\n[{title}]")
    hit = False
    for key, label in items:
        c, u = ev[key]
        if c:
            hit = True
            print(f"        {label:<26} {u:>3}명 ({c}회)")
    if not hit:
        print("        (없음)")


block("무엇을 했나", LABEL)
block("맛보기(첫 화면)", SAMPLE)
block("알림·설치", ALERT)
block("목록형 페이지 → 데일리", CTA)
block("인앱 브라우저", INAPP)

# ── 깔때기 ──
start, comp = ev["daily_start"][1], ev["daily_complete"][1]
# daily_press는 2026-09-03 오후 배포다. 그 전 날짜이거나 배포 당일이면 press가 start보다
# 적게 잡히는데, 그건 이탈이 아니라 계측이 하루를 못 덮은 것이다 — 비율을 내면 거짓말이 된다.
press = ev["daily_press"][1]
print("\n[깔때기]")
print(f"        방문 {users}  →  시작 {start} ({start / users * 100:.0f}%)" if users else "        방문 0")
if press >= start and start:
    샌 = press - start
    print(f"        (버튼 누름 {press} → 화면 뜸 {start}"
          + (f" · {샌}명이 로딩 기다리다 이탈)" if 샌 else " · 이탈 없음)"))
elif press:
    print(f"        (버튼 누름 {press} — 계측이 하루를 다 못 덮은 날이라 비율은 내지 않는다)")
print(f"                  →  완주 {comp} ({comp / start * 100:.0f}% of 시작)" if start else "                  →  완주 0")

# 10문제를 /api/day로 받았는지, 실패해서 문제은행 전체(gz 174KB)로 떨어졌는지.
# 9/3에 앞의 길을 냈다 — full이 계속 잡히면 엔드포인트가 어딘가에서 막히는 것이다.
#
# via는 이벤트 매개변수라 GA4에서 「맞춤 측정기준」으로 등록해야 조회된다
# (관리 > 데이터 표시 > 맞춤 정의 > 맞춤 측정기준 만들기, 범위 이벤트, 매개변수 via).
# 등록 전에는 daily_bank 전체 건수만 보인다.
c, u = ev["daily_bank"]
if c:
    print("\n[문제를 어떻게 받았나]")
    try:
        경로 = {}
        for r in rep(["eventName", "customEvent:via"], ["eventCount", "totalUsers"]):
            if r.dimension_values[0].value != "daily_bank":
                continue
            경로[r.dimension_values[1].value] = (int(r.metric_values[0].value), int(r.metric_values[1].value))
        for k, (cc, uu) in sorted(경로.items(), key=lambda x: -x[1][0]):
            이름 = "10문제만(/api/day)" if k == "api" else "문제은행 전체(174KB)" if k == "full" else k
            print(f"        {이름:<26} {uu:>3}명 ({cc}회)")
    except Exception:
        print(f"        받아옴(경로 구분 없음)        {u:>3}명 ({c}회)")
        print("        ※ 경로를 나눠 보려면 GA4에 맞춤 측정기준 via를 등록해야 한다")

# ── 페이지 ──
print("\n[많이 본 페이지]")
pg = rep(["pagePath"], ["screenPageViews", "activeUsers"])
pg.sort(key=lambda r: -int(r.metric_values[0].value))
for r in pg[:8]:
    print(f"        {r.dimension_values[0].value:<28} PV {r.metric_values[0].value:>3}  방문 {r.metric_values[1].value:>3}")
print()
