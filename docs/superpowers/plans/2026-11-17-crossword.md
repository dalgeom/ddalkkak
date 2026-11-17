# 오늘의 가로세로 낱말퍼즐 구현 계획

> 설계: `docs/superpowers/specs/2026-11-17-crossword-design.md`. 이 세션에서 인라인으로 실행한다(사용자가 서브에이전트를 요청하지 않음).

**목표:** `/crossword`에 매일 하나씩 5×5 가로세로 낱말퍼즐을 내고, 지난 판 해설 쪽 `/crossword/answer/[date]`을 둔다.

**구조:** 퍼즐은 미리 구운 `rows`(■ = 검은 칸)와 `clues`만 저장하고, 낱말 · 번호는 `src/lib/crossword.ts`가 뽑는다. 생성기는 `scripts/crossword-build.mjs`(끝말잇기 사전 재사용). 화면은 끝말잇기 퍼즐 쪽 패턴(`today()` · dev 전용 `?day=` · `track`)을 따른다.

**기술:** SvelteKit(Svelte 5 runes) · vitest · vite-node · Playwright qa.

---

## 파일

| 파일 | 할 일 |
|---|---|
| `src/lib/crossword.ts` (새) | `parseGrid(rows)` → 칸 · 낱말(번호 · 방향 · 칸 목록 · 답) · `checkPuzzle(p, dict)` 규칙 검사(생성기 · 테스트가 같이 씀) · `canOpenDay(day, today, dev)` |
| `src/lib/crossword.test.ts` (새) | 낱말 뽑기 · 번호 매김 · 섬 · 규칙 위반 양성 대조 · 앞날 보호 |
| `src/lib/data/crosswordPuzzles.ts` (새) | `CrosswordPuzzle` · `CROSSWORD_FIRST_DAY` · `CROSSWORD_PUZZLES` · `crosswordFor(day)` · `dateOf` |
| `src/lib/data/crosswordPuzzles.test.ts` (새) | 날짜 연속 · 7일 앞 · 모든 판 `checkPuzzle` 통과(사전 포함) |
| `scripts/crossword-build.mjs` (새) | `--cand N` · `--check` |
| `src/routes/crossword/+page.svelte` · `+page.ts` (새) | 화면 · 메타 |
| `src/routes/crossword/answer/[date]/+page.server.ts` · `+page.svelte` (새) | 지난 판 해설(prerender, entries = 지난 날짜) |
| `src/routes/sitemap.xml/+server.ts` | `/crossword` · 해설 쪽 |
| `src/lib/components/GameCards.svelte` | 카드 하나 |
| `src/routes/+page.svelte` | 「이런 건 어때요?」 한 줄 |
| `src/lib/notices.ts` · `src/routes/llms.txt/+server.ts` | 새 소식 · 한 줄 |
| `scripts/ga-yesterday.py` | `cw_start` · `cw_complete` · `cw_hint` |
| `scripts/qa/crossword.mjs` · `scripts/qa/run.mjs` | qa |
| `promo/지표-기록.md` · `CLAUDE.md` | 실험 절 · 섞임 줄 · 루틴 5번 한 줄 |

## Task 1: `crossword.ts` (TDD)

- `parseGrid(rows: string[])` → `{ size, black: boolean[], words: Word[], numbers: (number|null)[] }`.
  `Word = { num, dir: 'across'|'down', cells: number[], answer: string }`. 2칸 이상 이어진 것만. 시작 칸 번호는 행 우선 순서로 1부터.
- `checkPuzzle(p, has?: (w)=>boolean)` → 이유 목록. 5줄 · 줄마다 5칸 · 칸은 한글 완성형이나 ■ · 모든 흰 칸이 낱말에 속함 · 섬 없음 · 한 판 같은 낱말 없음 · 모든 낱말에 열쇠 · 열쇠에 답 없음 · 열쇠에 쓰이지 않는 키 없음 · `has`가 있으면 사전에 있음.
- `canOpenDay(day, today, isDev)` = `isDev || day <= today`.
- 테스트: 실제 판 하나로 낱말 수 · 번호 · 답, 섬 판 · 열쇠에 답이 든 판 · 열쇠 없는 판이 각각 걸리는지(양성 대조), 앞날이 운영에서 막히는지.

## Task 2: 생성기 `scripts/crossword-build.mjs`

- 실현성 시험 코드(모양 무작위 · 가장 좁은 칸 먼저 백트래킹)를 옮긴다. 쉬운 말 2~5글자, 뜻풀이가 있고 뜻풀이에 답이 없는 것만. 지난 판 낱말 제외.
- 낱말 6개 이상, 엇갈린 칸이 많은 판을 고른다. 출력: 격자 + 낱말별 뜻풀이 초안(TS 붙여넣기 형태).
- `--check`: 모든 판을 `checkPuzzle(p, has)`로 검사 · 날짜 연속 검사, 하나라도 걸리면 exit 1. 양성 대조로 깨진 판을 한 번 넣어 빨개지는지 본다.

## Task 3: 14일치 퍼즐(11/19~12/2)

- `--cand`로 후보를 넉넉히 뽑아 14판을 고르고 열쇠를 손질한다(답 미노출 · 쉬운 말 · 안 엇갈리는 칸이 있는 낱말은 열쇠만으로 하나로 좁혀짐).
- `CROSSWORD_FIRST_DAY = 20776`(11/19). `--check` 통과 · 테스트 통과.

## Task 4: 화면 `/crossword`

- 설계 1절 그대로: 격자 · 번호 · 고른 낱말 강조 · 열쇠 줄 · 입력창 · 넣기 · 「N글자예요」 · 덮어쓰기 · 완성형만 · 자동 채점 · 틀린 칸 빨강 · 「글자 하나 열기」 · 결과(시간 · 힌트 · 공유 · 뜻풀이 · 출처) · localStorage `ddal.cw.<date>` · 설명글 200자 이상.
- 앞날: `canOpenDay`로 운영에선 오늘로 되돌린다. `?day=`는 지난 판이면 운영에서도 열린다.
- GA: 첫 넣기에 `cw_start`, 완성에 `cw_complete {sec, hints}`, 힌트에 `cw_hint`.

## Task 5: 해설 쪽 + 사이트 지도

- 끝말잇기 해설 쪽 패턴: `past()` = `CROSSWORD_FIRST_DAY + i < kstDayNumber(Date.now())`, entries는 그것만, load에서 그 외 날짜는 404. 정답 격자 · 낱말별 손질 열쇠 + 사전 뜻풀이 · 「막히기 쉬운 칸」(`note` 필드, 없으면 생략) · 「그날 퍼즐 풀기」 · 이전/다음.
- 사이트 지도에 `/crossword`와 지난 해설 쪽.

## Task 6: 노출

- GameCards 카드(`key:'cw'`, 미니 격자 그림, `fresh:true`), +page 「이런 건 어때요?」 한 줄(`daily_try_other {to:'crossword'}`), notices 맨 앞, llms.txt 한 줄.

## Task 7: 계측 · qa · 기록

- `ga-yesterday.py` 끝말잇기 줄 옆에 세 줄.
- `scripts/qa/crossword.mjs`(칸 선택 · 방향 전환 · 넣기 · 글자 수 경고 · 힌트 · 채점 · 이어 풀기 · 결과 · 해설 쪽 · 폭 넘침 없음), run.mjs 등록.
- 지표 기록 새 절 + 11/17 실험 「섞임」 줄, CLAUDE.md 루틴 5번 한 줄.

## Task 8: 검증 · 배포

1. `npx vitest run` · `npm run build` · `--check`(양성 대조 포함)
2. 클라이언트 번들에 앞날 정답이 있는지 확인하고 보고(퍼즐 파일을 화면이 import하면 번들에 실린다 — 끝말잇기와 같은 수준, 가설 아님: 직접 확인)
3. 로컬 `npm run qa` 전체 + thin
4. 커밋 · 푸시 · 배포 확인 · 운영 qa `--only flow,thin,crossword`
5. IndexNow `/crossword`
