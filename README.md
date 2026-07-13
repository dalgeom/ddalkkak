# 딸깍! — 두뇌 퍼즐 게임

숨은 규칙을 발견하는 순간 머릿속에서 나는 소리, **딸깍**.
라운드당 3문제, 힌트 사다리, 점수·연속 기록, 결과 공유를 갖춘 두뇌 퍼즐 웹게임.

## 스택

- SvelteKit (Svelte 5) + TypeScript + Vite
- `@sveltejs/adapter-cloudflare` — Cloudflare Pages 배포
- Vitest — 게임 로직·문제 은행 무결성 테스트

## 개발

```bash
npm install
npm run dev        # 개발 서버
npm test           # 테스트
npm run build      # 프로덕션 빌드
```

## 배포 (Cloudflare Pages, git 연동)

`main`에 push하면 Cloudflare Pages가 자동으로 빌드·배포한다.

- Framework preset: **SvelteKit**
- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`

## 문제 추가하는 법

`src/lib/problems.ts`의 `PROBLEMS` 배열에 항목을 추가한다.
문제 설계·검수 기준은 `D:\OneDrive\DEV_WORK\puzzle-site\문제설계명세.md` 참조
(규칙 비노출 / 다단 체인 / 딸깍 기준 / 유일성 / 검산 내장 등 10개 기준).

- `blocks`: 지문 — `text`(HTML), `pre`(고정폭), `lcd`(7세그먼트 전광판), `colors`(색 블록)
- `type`: `text`(주관식, `answers` 배열) 또는 `choice`(객관식, `choices` + `answerIndex`)
- `hints`: 힌트 사다리 3단계 (관찰 유도 → 조작 지정 → 규칙 절반)
- `explain`: 해설 (정답 공개 시 표시)

추가 후 `npm test`가 문제 무결성(id 중복, 정답 존재, 힌트 3개 등)을 검사한다.
