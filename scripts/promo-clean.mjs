/**
 * 게시가 끝난 홍보 산출물을 지운다 — 디스크에 매일 쌓이는 것이 싫다는 요청(2026-09-08).
 *
 *   node scripts/promo-clean.mjs          무엇이 지워질지 보여주기만 한다(기본)
 *   node scripts/promo-clean.mjs --지워    실제로 지운다 (기록에 있는 것만)
 *   node scripts/promo-clean.mjs --지워 --전부   기록에 없는 것까지 지운다
 *
 * **지우지 않는 것이 있다.** promo/ 안에는 성격이 다른 두 종류가 섞여 있다.
 *
 *   매일 쌓이는 산출물   social/스레드-날짜.png · video/쇼츠-*.mp4 · naver/ 글 본문 이미지
 *   재사용 브랜딩 자산   youtube/{프로필,배너,워터마크}.png · naver/{프로필,커버}.png · images/*
 *
 * 뒤엣것은 채널설정.md·블로그정보.md·블로그 원고가 계속 참조한다. 「promo 폴더 전부」로
 * 지우면 유튜브 채널 배너와 블로그 커버가 날아간다. KEEP이 그것을 막는다.
 *
 * **기록에 없는 것은 기본으로 안 지운다.** 만들어만 두고 아직 안 올린 것이 있기 때문이다
 * (9/8에 쇼츠 18호가 그랬다). 판정 기준은 promo/게시-기록.md 하나다 —
 * 「사용자가 올렸다고 확인한 것만 적는다」가 그 파일의 규칙이라, 거기 있으면 올라간 것이다.
 *
 * 대부분 git이 추적 중이라 지워도 히스토리에서 되살릴 수 있다. 미추적 파일은 그렇지 않아
 * 목록에 그렇게 표시한다.
 */
import { readFileSync, readdirSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const 지워 = process.argv.includes('--지워');
const 전부 = process.argv.includes('--전부');

/** 이 이름들은 게시물이 아니라 채널 자산이다. 절대 지우지 않는다. */
const KEEP = new Set(['프로필.png', '배너.png', '워터마크.png', '커버.png']);
/** 폴더 통째로 지키는 것 — 제품 스크린샷은 등록·첨부에 반복해서 쓴다. */
const KEEP_DIR = new Set(['images']);

const 대상폴더 = ['social', 'video', 'naver', 'images', 'youtube'];

const 기록 = readFileSync('promo/게시-기록.md', 'utf-8');
/** 블로그 원고들도 이미지 경로를 적어 둔다 — 원고가 있으면 그 글은 쓴 것이다 */
const 원고 = readdirSync('promo')
	.filter((f) => f.endsWith('.md'))
	.map((f) => readFileSync(join('promo', f), 'utf-8'))
	.join('\n');

/** 미추적 파일은 지우면 못 되살린다 — 목록에 표시하려고 미리 뽑아 둔다 */
const 미추적 = new Set(
	execFileSync('git', ['ls-files', '--others', '--exclude-standard', 'promo/'], { encoding: 'utf-8' })
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean)
);

/**
 * 이 파일의 게시가 기록에 남아 있는가.
 *   video   파일명이 쇼츠 표의 파일 칸에 그대로 적힌다
 *   social  파일명의 날짜가 스레드 표의 행 머리에 있다
 *   naver   원고가 `promo/naver/함정-*.png` 처럼 접두어로 참조한다
 */
function 올렸나(dir, name) {
	if (dir === 'video') return 기록.includes(name);
	if (dir === 'social') {
		const d = name.match(/(20\d\d-\d\d-\d\d)/)?.[1];
		return !!d && 기록.includes(d);
	}
	if (dir === 'naver') {
		// 원고마다 적는 방식이 다르다 — `promo/naver/함정-*.png`(8/26)로도 적고
		// `성냥-숫자표.png`처럼 파일명만 적기도 한다(8/07). 둘 다 본다.
		const 접두 = name.split('-')[0];
		return 원고.includes(name) || 원고.includes(`promo/naver/${접두}-`) || 기록.includes(`promo/naver/${접두}-`);
	}
	return false;
}

const 목록 = [];
for (const dir of 대상폴더) {
	const p = join('promo', dir);
	if (!existsSync(p) || KEEP_DIR.has(dir)) continue;
	for (const name of readdirSync(p)) {
		if (name.endsWith('.md') || KEEP.has(name)) continue;
		const rel = `promo/${dir}/${name}`;
		목록.push({
			rel,
			dir,
			올림: 올렸나(dir, name),
			크기: statSync(join(p, name)).size,
			미추적: 미추적.has(rel)
		});
	}
}

const 지울것 = 목록.filter((f) => 전부 || f.올림);
const 남길것 = 목록.filter((f) => !지울것.includes(f));
const mb = (n) => (n / 1048576).toFixed(1) + 'MB';

console.log('');
for (const dir of 대상폴더) {
	const g = 지울것.filter((f) => f.dir === dir);
	if (!g.length) continue;
	console.log(`■ promo/${dir} — ${g.length}개 · ${mb(g.reduce((a, f) => a + f.크기, 0))}`);
	for (const f of g) console.log(`    ${f.rel.split('/').pop()}${f.미추적 ? '   ⚠ git 미추적 — 지우면 못 되살린다' : ''}`);
}
if (남길것.length) {
	console.log('\n■ 남긴다 — 게시 기록에 없다(아직 안 올렸을 수 있다)');
	for (const f of 남길것) console.log(`    ${f.rel}`);
}
console.log(`\n■ 손대지 않는 것 — 재사용 자산`);
console.log(`    promo/images/ 전체 · ${[...KEEP].join(' · ')} · 모든 .md`);

if (!지울것.length) {
	console.log('\n지울 것이 없다.');
} else if (!지워) {
	console.log(`\n총 ${지울것.length}개 · ${mb(지울것.reduce((a, f) => a + f.크기, 0))} — 실제로 지우려면 --지워`);
} else {
	for (const f of 지울것) unlinkSync(f.rel);
	console.log(`\n${지울것.length}개 지웠다 · ${mb(지울것.reduce((a, f) => a + f.크기, 0))} 확보.`);
	console.log('git이 추적하던 것은 삭제로 잡히니 커밋해야 워킹트리가 깨끗해진다.');
}
