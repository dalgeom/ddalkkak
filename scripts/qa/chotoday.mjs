// 초성 분야 풀이 → 오늘의 10문제 카드(11/16). 오늘의 초성 카드 시험은 11/17 오늘의 초성을 없애며 걷었다.
import { launch, sleep, OUT } from './cdp.mjs';
const b = await launch('chotoday');
let fail = 0;
const ok = (name, pass, info = '') => { console.log(`${pass ? '통과' : '실패'}  ${name}${info ? '  — ' + info : ''}`); if (!pass) fail++; };
const until = async (cond) => { for (let i = 0; i < 50; i++) { if (await b.ev(`return !!(${cond});`)) return true; await sleep(300); } return false; };
const reveal = `[...document.querySelectorAll('.controls button')].find((x) => x.innerText.includes('정답 보기'))?.click(); return 1;`;

// 오늘의 10문제 카드(11/16) — 분야 풀이에서 정답 보기로만 넘겨도 다섯 번째에 한 번 뜬다. 넷째 · 여섯째엔 없다.
// 10문제를 끝낸 기록이 있으면 DailyNext가 숨김으로 바뀌므로 저장을 모두 비우고 시작한다.
{
	await b.viewport(390, 844, true);
	await b.go('/chosung?c=animal', 800);
	await b.ev(`localStorage.clear(); return 1;`);
	await b.go('/chosung?c=animal', 800);
	const nextQ = `[...document.querySelectorAll('.btn.wide')].find((x) => x.innerText.includes('다음 문제'))?.click(); return 1;`;
	const seen = [];
	for (let i = 1; i <= 6; i++) {
		await until(`document.querySelector('.controls')`);
		await b.ev(reveal);
		await until(`[...document.querySelectorAll('.btn.wide')].some((x) => x.innerText.includes('다음 문제'))`);
		await sleep(300);
		seen.push(await b.ev(`return !!document.querySelector('.dnext');`));
		if (i === 5) await b.shot(`${OUT}chotoday-dnext.jpg`);
		await b.ev(nextQ);
	}
	ok('정답 보기 4번째엔 오늘의 10문제 카드 없음', seen[3] === false);
	ok('정답 보기 5번째에 오늘의 10문제 카드', seen[4] === true);
	ok('정답 보기 6번째엔 다시 없음', seen[5] === false, JSON.stringify(seen));
}

await b.close();
console.log('오류', b.errors.length ? b.errors : '없음');
if (fail || b.errors.length) process.exitCode = 1;
