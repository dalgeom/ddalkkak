"""아침에 제일 먼저 보는 것 — 어제 하루가 어땠는지.

  set GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 키 경로>
  python scripts/ga-yesterday.py          어제
  python scripts/ga-yesterday.py 2        그저께
  python scripts/ga-yesterday.py 0        오늘(집계 중)

ga-daily.py는 14일을 뭉뚱그려 본다. 그건 추세를 보는 물건이고, 아침에 필요한 건
"어제 몇 명이 왔고, 누가 문제를 풀었고, 누가 알림을 켰나"다. 그래서 하루만 본다.

날짜 인사(「8월 25일 화요일이야」)를 받으면 이 스크립트부터 돌린다.
"""

import os, sys, io, datetime
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    sys.exit("GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로를 넣어라.")

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest

PROPERTY = "properties/547486275"
BACK = int(sys.argv[1]) if len(sys.argv) > 1 else 1
client = BetaAnalyticsDataClient()

DAY = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=9)).date() - datetime.timedelta(days=BACK)
DATE = DAY.isoformat()
WD = "월화수목금토일"[DAY.weekday()]


def rep(dims, mets, limit=50):
    return client.run_report(
        RunReportRequest(
            property=PROPERTY,
            date_ranges=[DateRange(start_date=DATE, end_date=DATE)],
            dimensions=[Dimension(name=d) for d in dims],
            metrics=[Metric(name=m) for m in mets],
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
print(f"\n[사람]  방문자 {users}명 — 처음 온 사람 {new}, 다시 온 사람 {back}")
print(f"        세션 {sess} · 페이지뷰 {pv} · 1인 평균 체류 {mmss}")

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
    ("daily_start", "오늘의 10문제 시작"),
    ("daily_resume", "이어풀기"),
    ("daily_complete", "완주"),
    ("problem_result", "문제 풀이(정답·오답 제출)"),
    ("practice_start", "무한 연습 시작"),
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
block("인앱 브라우저", INAPP)

# ── 깔때기 ──
start, comp = ev["daily_start"][1], ev["daily_complete"][1]
print("\n[깔때기]")
print(f"        방문 {users}  →  시작 {start} ({start / users * 100:.0f}%)" if users else "        방문 0")
print(f"                  →  완주 {comp} ({comp / start * 100:.0f}% of 시작)" if start else "                  →  완주 0")

# ── 페이지 ──
print("\n[많이 본 페이지]")
pg = rep(["pagePath"], ["screenPageViews", "activeUsers"])
pg.sort(key=lambda r: -int(r.metric_values[0].value))
for r in pg[:8]:
    print(f"        {r.dimension_values[0].value:<28} PV {r.metric_values[0].value:>3}  방문 {r.metric_values[1].value:>3}")
print()
