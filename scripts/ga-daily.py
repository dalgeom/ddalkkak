"""
매일 보는 지표 한 장 — 방문·유입·행동·이탈을 한 번에 찍는다.

  set GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 키 경로>
  python scripts/ga-daily.py [일수]        기본 14일

키 파일 경로는 환경변수로만 받는다(값을 저장소에 남기지 않는다).
필요 패키지: pip install google-analytics-data

문제별 정답률은 ga-problems.py가 따로 본다. 여기서는 "몇 명이 왔고, 어디서 왔고,
얼마나 풀다 갔는가"만 본다. 매일 같은 잣대로 보려고 지표를 고정해 두었다.
"""

import os, sys, io
from collections import defaultdict

# 윈도우 콘솔이 cp949라 한글·괘선이 깨진다
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    sys.exit("GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로를 넣어라.")

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
    OrderBy,
)

PROPERTY = "properties/547486275"
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 14
client = BetaAnalyticsDataClient()


def report(dims, mets, days=DAYS, limit=50, order=None, start=None):
    return client.run_report(
        RunReportRequest(
            property=PROPERTY,
            date_ranges=[DateRange(start_date=start or f"{days}daysAgo", end_date="today")],
            dimensions=[Dimension(name=d) for d in dims],
            metrics=[Metric(name=m) for m in mets],
            order_bys=order or [],
            limit=limit,
        )
    ).rows


def cell(row, i):
    return row.dimension_values[i].value


def num(row, i):
    v = row.metric_values[i].value
    return float(v) if "." in v else int(v)


def bar(n, top, width=22):
    return "█" * max(0, round(width * n / top)) if top else ""


print(f"\n{'=' * 62}\n  딸깍 — 최근 {DAYS}일\n{'=' * 62}")

# ── 1. 일별 방문 ──────────────────────────────────────────
rows = report(
    ["date"],
    ["activeUsers", "newUsers", "sessions", "screenPageViews", "averageSessionDuration"],
    order=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))],
)
print("\n[일별]  날짜        방문  신규  세션  PV   체류")
top = max((num(r, 0) for r in rows), default=0)
tot_u = tot_s = 0
for r in rows:
    d = cell(r, 0)
    u, nu, s, pv, dur = (num(r, i) for i in range(5))
    tot_u += u
    tot_s += s
    wd = "월화수목금토일"[
        (__import__("datetime").date(int(d[:4]), int(d[4:6]), int(d[6:])).weekday())
    ]
    print(
        f"        {d[4:6]}/{d[6:]}({wd})  {u:4d}  {nu:4d}  {s:4d}  {pv:4d}  {int(dur // 60)}:{int(dur % 60):02d}  {bar(u, top)}"
    )
print(f"        합계        {tot_u:4d}          {tot_s:4d}")

# ── 2. 유입 경로 ──────────────────────────────────────────
rows = report(
    ["sessionSource", "sessionMedium"],
    ["sessions", "activeUsers"],
    order=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
    limit=12,
)
print("\n[유입]  출처 / 매체                     세션  방문")
for r in rows:
    print(f"        {cell(r,0)[:20]:<20} {cell(r,1)[:10]:<10} {num(r,0):5d} {num(r,1):5d}")

# ── 3. 페이지 ────────────────────────────────────────────
rows = report(
    ["pagePath"],
    ["screenPageViews", "activeUsers"],
    order=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
    limit=12,
)
print("\n[페이지]  경로                              PV   방문")
for r in rows:
    print(f"        {cell(r,0)[:32]:<32} {num(r,0):5d} {num(r,1):5d}")

# ── 4. 이벤트 ────────────────────────────────────────────
rows = report(
    ["eventName"],
    ["eventCount", "activeUsers"],
    order=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="eventCount"), desc=True)],
    limit=25,
)
print("\n[이벤트]  이름                            횟수   사람")
ev = {}
for r in rows:
    ev[cell(r, 0)] = (num(r, 0), num(r, 1))
    print(f"        {cell(r,0)[:30]:<30} {num(r,0):6d} {num(r,1):5d}")

# ── 5. 깔때기 ────────────────────────────────────────────
# 이름은 앱이 보내는 이벤트에 맞춰 후보를 훑는다(없으면 건너뛴다).
print("\n[깔때기]")


def pick(*names):
    for n in names:
        if n in ev:
            return n, ev[n][1]
    return None, 0


LABEL = {
    "daily_start": "오늘의 10문제 시작",
    "daily_complete": "완주",
    "share_click": "공유 누름",
    "practice_start": "무한 연습",
    "install_click": "설치",
}
steps = [("사이트 방문", tot_u)] + [
    (LABEL[k], ev[k][1]) for k in ("daily_start", "daily_complete", "share_click") if k in ev
]
base = tot_u or 1
for label, n in steps:
    print(f"        {label:<20} {n:5d}  {n / base * 100:5.1f}%  {bar(n, base)}")
if "daily_start" in ev and "daily_complete" in ev:
    st, dc = ev["daily_start"][1], ev["daily_complete"][1]
    print(f"        └ 시작한 사람 중 완주 {dc / st * 100:.0f}%")

# ── 6. 기기 ──────────────────────────────────────────────
rows = report(["deviceCategory"], ["activeUsers"], limit=5)
print("\n[기기]  " + "   ".join(f"{cell(r,0)} {num(r,0)}" for r in rows))

# ── 7. 나라별 참여 ───────────────────────────────────────
# 방문 수만 보면 안 된다. 2026-08-20에 미국 71명이 전부 체류 16초·세션당 이벤트 3.5개
# (페이지만 열고 나감)인 봇이었고 그게 전체 방문의 20%였다. 체류와 세션당 이벤트를
# 같이 찍어 걸러낸다 — 이 숫자를 빼지 않으면 완주율도 전환율도 20%씩 낮게 보인다.
rows = report(
    ["country"],
    ["activeUsers", "sessions", "averageSessionDuration", "eventCount"],
    order=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="activeUsers"), desc=True)],
    limit=8,
)
print("\n[지역]  나라                방문  세션   체류  세션당이벤트")
for r in rows:
    u, se, dur, evc = (num(r, i) for i in range(4))
    per = evc / se if se else 0
    flag = "  ← 봇 의심" if dur < 30 and per < 4 and u >= 5 else ""
    print(
        f"        {cell(r,0)[:18]:<18} {u:5d} {se:5d}  {int(dur // 60)}:{int(dur % 60):02d}  {per:6.1f}{flag}"
    )
print()
