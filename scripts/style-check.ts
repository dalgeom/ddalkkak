/**
 * 해요체 개편 전후 대조 — 말투만 바뀌고 사실은 그대로인지 본다(docs/문체.md).
 *
 *   npx vite-node scripts/style-check.ts snapshot <파일>      고치기 전 글을 떠 둔다
 *   npx vite-node scripts/style-check.ts compare <파일> [범위]  숫자·태그가 그대로인지 + 남은 위반
 *
 * 숫자나 태그가 달라진 글은 이름을 찍고 종료 코드 1로 끝난다. 말투를 고치다 사실을
 * 바꾸는 사고(예: 「160개 중 96개」가 「90개」로)를 사람 눈이 아니라 기계가 잡게 한다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { styleTexts } from '../src/lib/styleTexts';
import { factsOf, styleIssues } from '../src/lib/style';

const [mode, file, scope] = process.argv.slice(2);
const now = styleTexts();

if (mode === 'snapshot') {
	writeFileSync(file, JSON.stringify(Object.fromEntries(now.map((t) => [t.key, t.text]))));
	console.log(`${now.length}개 글을 ${file}에 떴다`);
} else if (mode === 'compare') {
	const before: Record<string, string> = JSON.parse(readFileSync(file, 'utf8'));
	const target = now.filter((t) => !scope || t.scope === scope);
	let broken = 0;
	for (const t of target) {
		const old = before[t.key];
		if (old === undefined) {
			console.log(`  (새 글) ${t.key}`);
			continue;
		}
		const a = factsOf(old);
		const b = factsOf(t.text);
		const numsSame = [...a.nums].sort().join(',') === [...b.nums].sort().join(',');
		const tagsSame = a.tags.join() === b.tags.join();
		if (!numsSame || !tagsSame) {
			broken++;
			console.log(`✗ ${t.key}`);
			if (!numsSame) console.log(`    숫자  전 ${a.nums.join(' ')}\n          후 ${b.nums.join(' ')}`);
			if (!tagsSame) console.log(`    태그가 달라졌다`);
		}
	}
	const issues = target.flatMap((t) => styleIssues(t.text).map((i) => ({ key: t.key, ...i })));
	const tone = issues.filter((i) => i.kind === 'tone');
	const dash = issues.filter((i) => i.kind === 'dash');
	console.log(`\n${target.length}개 글 — 사실 바뀜 ${broken} · 「~다.」 ${tone.length} · 대시 ${dash.length}`);
	for (const i of issues.slice(0, 20)) console.log(`  [${i.kind}] ${i.key}: ${i.text.slice(0, 70)}`);
	if (broken) process.exit(1);
} else {
	console.log('사용법: snapshot <파일> | compare <파일> [fields|articles|explains]');
	process.exit(2);
}
