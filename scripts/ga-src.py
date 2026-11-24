"""
바깥 링크 성과 — 검색을 뺀 추천(referral) 출처 · 리퍼러별 세션(성장 작업 ③, 11/24).

  set GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 키 경로>
  python scripts/ga-src.py [일수]        기본 30일, 어제까지

네이버 · 구글 · 빙 · 다음 같은 검색 엔진 출처는 뺀다. 디렉터리 · 커뮤니티 · 자료실에
딸깍을 올린 뒤 그곳에서 실제로 사람이 오는지 여기서 본다.
"""

import os, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    sys.exit("GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로를 넣어라.")

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Filter, FilterExpression, Metric, RunReportRequest

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 30
SEARCH = ("naver", "google", "bing", "daum")

r = BetaAnalyticsDataClient().run_report(RunReportRequest(
    property="properties/547486275",
    date_ranges=[DateRange(start_date=f"{DAYS}daysAgo", end_date="yesterday")],
    dimensions=[Dimension(name="sessionSource"), Dimension(name="pageReferrer")],
    metrics=[Metric(name="sessions")],
    dimension_filter=FilterExpression(filter=Filter(field_name="sessionMedium", string_filter=Filter.StringFilter(value="referral"))),
    limit=1000,
))
rows = sorted(((int(x.metric_values[0].value), x.dimension_values[0].value, x.dimension_values[1].value[:90]) for x in r.rows), reverse=True)
rows = [x for x in rows if not any(k in x[1] for k in SEARCH)]
by_src = {}
for s, src, _ in rows:
    by_src[src] = by_src.get(src, 0) + s

print(f"[바깥 링크] 최근 {DAYS}일 추천 세션 {sum(by_src.values())} · 출처 {len(by_src)}곳 (검색 엔진 뺌)")
for src, s in sorted(by_src.items(), key=lambda x: -x[1])[:25]:
    print(f"  {s:4d}  {src}")
print("[리퍼러 상위]")
for s, src, ref in rows[:25]:
    print(f"  {s:4d}  {src}  {ref}")
