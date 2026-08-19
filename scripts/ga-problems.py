"""
문제별 실측 정답률 — GA4의 problem_result 이벤트를 문제 단위로 집계한다.

  set GOOGLE_APPLICATION_CREDENTIALS=<서비스 계정 키 경로>
  python scripts/ga-problems.py [시작일] [종료일]

키 파일 경로는 환경변수로만 받는다(값을 저장소에 남기지 않는다).
필요 패키지: pip install google-analytics-data

주의: GA4 맞춤 측정기준은 소급 적용되지 않는다. 2026-08-19에 id·kind·correct·
hints·wrong을 등록했으므로 그 이전 이벤트는 (not set)으로만 잡힌다.

읽는 법 — 문제설계명세의 목표 밴드는 노힌트 정답률 30~60%다.
  90% 이상  너무 쉽다(3초 룰 의심)     10% 미만  너무 어렵거나 문제가 고장났다
"""
import os, sys
from collections import defaultdict

if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    sys.exit("GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로를 넣어라.")

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest

PROPERTY = "properties/547486275"
start = sys.argv[1] if len(sys.argv) > 1 else "2026-08-19"
end = sys.argv[2] if len(sys.argv) > 2 else "today"

rows = BetaAnalyticsDataClient().run_report(
    RunReportRequest(
        property=PROPERTY,
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimensions=[
            Dimension(name="customEvent:id"),
            Dimension(name="customEvent:correct"),
            Dimension(name="customEvent:hints"),
            Dimension(name="customEvent:kind"),
        ],
        metrics=[Metric(name="eventCount")],
        limit=1000,
    )
).rows

agg = defaultdict(lambda: {"n": 0, "ok": 0, "nohint_n": 0, "nohint_ok": 0, "kind": ""})
for row in rows:
    pid, correct, hints, kind = (v.value for v in row.dimension_values)
    if pid == "(not set)":
        continue  # 측정기준 등록 이전 수집분
    n = int(row.metric_values[0].value)
    a = agg[pid]
    a["kind"] = kind
    a["n"] += n
    ok = correct.lower() == "true"
    a["ok"] += n if ok else 0
    if hints == "0":
        a["nohint_n"] += n
        a["nohint_ok"] += n if ok else 0

if not agg:
    sys.exit(f"{start}~{end} 구간에 집계할 데이터가 없다.")

print(f"{'문제 id':30} {'유형':10} {'시도':>4} {'정답률':>7} {'노힌트':>7}  판정")
for pid, a in sorted(agg.items(), key=lambda x: -x[1]["n"]):
    nh = a["nohint_ok"] / a["nohint_n"] * 100 if a["nohint_n"] else None
    verdict = ""
    if a["nohint_n"] >= 5:
        if nh >= 90: verdict = "너무 쉬움"
        elif nh < 10: verdict = "너무 어려움/고장 의심"
        elif 30 <= nh <= 60: verdict = "목표 밴드"
    print(
        f"{pid:30} {a['kind']:10} {a['n']:>4} "
        f"{a['ok'] / a['n'] * 100:>6.0f}% {(f'{nh:.0f}%' if nh is not None else '-'):>7}  {verdict}"
    )
print(f"\n{len(agg)}문제 / 시도 {sum(a['n'] for a in agg.values())}건 ({start}~{end})")
