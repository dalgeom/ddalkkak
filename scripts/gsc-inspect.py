# -*- coding: utf-8 -*-
"""Search Console URL 검사 — 색인 상태를 읽는다.

색인 「요청」은 API로 못 한다. Indexing API는 JobPosting·BroadcastEvent 전용이라
일반 페이지에는 안 쓴다. 요청 버튼은 사람이 GSC 화면에서 눌러야 한다.
이 스크립트는 「지금 어떤 상태인지」만 본다 — 눌러야 할지, 이미 됐는지.

    python scripts/gsc-inspect.py /trivia/idiom /read/eleven-nets
"""
import io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from google.oauth2 import service_account
from googleapiclient.discovery import build

SITE = "sc-domain:ddalkkak.app"
cred = service_account.Credentials.from_service_account_file(
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"],
    scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
api = build("searchconsole", "v1", credentials=cred).urlInspection().index()

for path in sys.argv[1:]:
    url = "https://ddalkkak.app" + path
    try:
        r = api.inspect(body={"inspectionUrl": url, "siteUrl": SITE}).execute()
        s = r["inspectionResult"]["indexStatusResult"]
        print(f"■ {path}")
        print(f"   판정      {s.get('coverageState')}")
        print(f"   색인여부  {s.get('verdict')}")
        print(f"   마지막크롤 {s.get('lastCrawlTime', '(없음)')}")
        print(f"   robots    {s.get('robotsTxtState')}   색인허용: {s.get('indexingState')}")
        can, goo = s.get("userCanonical"), s.get("googleCanonical")
        if can != goo:
            print(f"   ⚠ canonical 불일치 — 우리: {can} / 구글: {goo}")
        print()
    except Exception as e:
        print(f"■ {path}  실패: {str(e)[:200]}\n")
