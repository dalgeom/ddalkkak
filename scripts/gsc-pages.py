# -*- coding: utf-8 -*-
"""Search Console — 경로별 노출·클릭과 그 경로로 들어온 검색어.

ga-yesterday.py와 같은 서비스 계정을 쓴다(sc-domain:ddalkkak.app 소유자).
키 파일은 GOOGLE_APPLICATION_CREDENTIALS 경로로만 받는다 — 열지 않는다.

    python scripts/gsc-pages.py /discover          # 경로 접두사
    python scripts/gsc-pages.py /discover 90       # 기간(일), 기본 28

Search Console 데이터는 2~3일 지연된다. 어제치는 안 나온다.
"""
import io, os, sys, datetime, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from google.oauth2 import service_account
from googleapiclient.discovery import build

PREFIX = sys.argv[1] if len(sys.argv) > 1 else "/"
DAYS = int(sys.argv[2]) if len(sys.argv) > 2 else 28
SITE = "sc-domain:ddalkkak.app"

cred = service_account.Credentials.from_service_account_file(
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"],
    scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
api = build("searchconsole", "v1", credentials=cred).searchanalytics()

end = datetime.date.today() - datetime.timedelta(days=3)
start = end - datetime.timedelta(days=DAYS - 1)


def q(dims, rows=25000):
    out, i = [], 0
    while True:
        r = api.query(siteUrl=SITE, body={
            "startDate": start.isoformat(), "endDate": end.isoformat(),
            "dimensions": dims, "rowLimit": 25000, "startRow": i,
        }).execute().get("rows", [])
        out += r
        if len(r) < 25000:
            return out
        i += 25000


print(f"■ {SITE}  {start} ~ {end} ({DAYS}일)  경로 접두사 「{PREFIX}」\n")

pages = [r for r in q(["page"]) if PREFIX in r["keys"][0].replace("https://ddalkkak.app", "")]
if not pages:
    print("  이 접두사로 노출된 페이지가 없습니다 (노출 0).")
else:
    print(f"{'경로':34} {'노출':>6} {'클릭':>5} {'CTR':>6} {'평균순위':>7}")
    for r in sorted(pages, key=lambda x: -x["impressions"]):
        p = r["keys"][0].replace("https://ddalkkak.app", "") or "/"
        print(f"  {p:32} {r['impressions']:>6.0f} {r['clicks']:>5.0f} "
              f"{r['ctr']*100:>5.1f}% {r['position']:>7.1f}")
    print(f"  {'합계':32} {sum(r['impressions'] for r in pages):>6.0f} "
          f"{sum(r['clicks'] for r in pages):>5.0f}")

    print(f"\n■ 그 경로들로 들어온 검색어")
    agg = collections.Counter()
    clk = collections.Counter()
    for r in q(["page", "query"]):
        p = r["keys"][0].replace("https://ddalkkak.app", "")
        if PREFIX in p:
            agg[r["keys"][1]] += r["impressions"]
            clk[r["keys"][1]] += r["clicks"]
    if not agg:
        print("  검색어 단위로는 잡히는 것이 없습니다.")
    for w, n in agg.most_common(40):
        print(f"  {n:>5.0f}회 노출 · 클릭 {clk[w]:>2.0f}   {w}")
