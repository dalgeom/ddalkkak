<script lang="ts">
	import { onMount } from 'svelte';
	import {
		kstDayNumber, formatDuration, puzzleNumber, MARK_EMOJI, SITE_START_DAY
	} from '$lib/game';
	import {
		readDayRecord, dayNumToDate, monthGrid, summarize,
		type DayRecord, type RecordSummary, type MonthCell
	} from '$lib/record';
	import { buildBackup, parseBackup, mergeBackup } from '$lib/backup';

	/* ───────── 기록 백업 ─────────
	   연속 기록은 잃을 게 쌓여야 작동하는 장치인데, 지금 모든 기록이 이 브라우저에만 있다.
	   기기를 바꾸거나 iOS가 미방문 데이터를 지우면 그대로 증발한다. 백엔드가 없으니
	   파일 한 장으로 옮긴다. */
	let backupMsg = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);

	function say(m: string) {
		backupMsg = m;
		setTimeout(() => (backupMsg = ''), 3200);
	}

	function exportRecord() {
		const b = buildBackup(localStorage, new Date().toISOString());
		const n = Object.keys(b.data).length;
		if (!n) return say('아직 내보낼 기록이 없어요.');
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(b)], { type: 'application/json' })
		);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ddalkkak-기록-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		say('기록 파일을 내려받았어요. 새 기기에서 가져오기로 올리면 됩니다.');
	}

	async function importRecord(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0];
		if (!f) return;
		const parsed = parseBackup(await f.text());
		if (!parsed) return say('딸깍 기록 파일이 아니에요.');
		const n = mergeBackup(localStorage, parsed);
		say(n ? `${n}건을 불러왔어요. 새로고침하면 반영됩니다.` : '이미 최신 기록이에요.');
		if (fileInput) fileInput.value = '';
		if (n) setTimeout(() => location.reload(), 1200);
	}

	const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

	let today = $state(0);
	let year = $state(2026);
	let month = $state(1);
	let summary = $state<RecordSummary | null>(null);
	/** 선택한 날짜의 상세 — 달력에서 완주한 칸을 누르면 열린다 */
	let picked = $state<DayRecord | null>(null);

	onMount(() => {
		today = kstDayNumber(Date.now());
		const t = dayNumToDate(today);
		year = t.y;
		month = t.m;
		summary = summarize(today);
		picked = readDayRecord(today);
	});

	let cells = $derived(today ? monthGrid(year, month) : []);
	/** 이 달 셀들의 기록 — dayNum → DayRecord */
	let records = $derived.by(() => {
		const map = new Map<number, DayRecord>();
		if (!today) return map;
		for (const c of cells) {
			if (!c.inMonth || c.dayNum > today || c.dayNum < SITE_START_DAY) continue;
			const r = readDayRecord(c.dayNum);
			if (r) map.set(c.dayNum, r);
		}
		return map;
	});

	/* 달 이동 범위: 서비스 시작 달 ~ 이번 달 */
	let atFirst = $derived.by(() => {
		const s = dayNumToDate(SITE_START_DAY);
		return year === s.y && month === s.m;
	});
	let atLast = $derived.by(() => {
		const t = dayNumToDate(today || SITE_START_DAY);
		return year === t.y && month === t.m;
	});
	function move(dir: number) {
		let m = month + dir;
		if (m < 1) { m = 12; year -= 1; }
		if (m > 12) { m = 1; year += 1; }
		month = m;
		picked = null;
	}

	/** 맞춘 수 0~10 → 잔디 농도 0~4 */
	function level(r: DayRecord | undefined): number {
		if (!r) return 0;
		const ratio = r.correct / Math.max(1, r.total);
		return ratio >= 0.95 ? 4 : ratio >= 0.7 ? 3 : ratio >= 0.4 ? 2 : 1;
	}

	function pick(c: MonthCell) {
		const r = records.get(c.dayNum);
		picked = r ?? null;
	}

	let pickedDate = $derived(picked ? dayNumToDate(picked.dayNum) : null);
</script>

<svelte:head>
	<title>내 기록 | 딸깍 퍼즐</title>
	<!-- 방문자 개인의 localStorage 기록뿐인 페이지 — 검색에 실을 내용이 없다 -->
	<meta name="robots" content="noindex" />
</svelte:head>

<article>
	<header class="cover">
		<span class="kicker">내 기록</span>
		<h1>매일의 딸깍이<br /><b>여기 쌓입니다</b></h1>
		{#if summary && summary.days > 0}
			<div class="facts">
				<div class="fact"><b>{summary.streak}일</b><span>연속</span></div>
				<div class="fact"><b>{summary.bestStreak}일</b><span>최장 연속</span></div>
				<div class="fact"><b>{summary.days}일</b><span>완주</span></div>
				<div class="fact"><b>{summary.totalCorrect}</b><span>맞춘 문제</span></div>
				{#if summary.avgMs > 0}
					<div class="fact"><b>{formatDuration(summary.avgMs)}</b><span>평균 완주</span></div>
				{/if}
			</div>
		{:else if summary}
			<p class="lead">
				아직 기록이 없어요. 오늘의 10문제를 완주하면 이 달력에 첫 칸이 칠해집니다.
				기록은 이 브라우저에만 저장돼요.
			</p>
		{/if}
	</header>

	{#if summary && summary.days === 0}
		<section class="sec ctas">
			<a class="cta" href="/">오늘의 10문제 풀러 가기 <span aria-hidden="true">→</span></a>
		</section>
	{/if}

	<section class="sec">
		<div class="mnav">
			<button class="mv" onclick={() => move(-1)} disabled={atFirst} aria-label="이전 달">←</button>
			<h2>{year}년 {month}월</h2>
			<button class="mv" onclick={() => move(1)} disabled={atLast} aria-label="다음 달">→</button>
		</div>

		<div class="cal" role="grid" aria-label="{year}년 {month}월 완주 기록">
			{#each WEEKDAYS as w (w)}
				<div class="wd">{w}</div>
			{/each}
			{#each cells as c (c.dayNum)}
				{@const r = records.get(c.dayNum)}
				{#if !c.inMonth}
					<div class="cell out"></div>
				{:else}
					<button
						class="cell lv{level(r)}"
						class:today={c.dayNum === today}
						class:sel={picked?.dayNum === c.dayNum}
						disabled={!r}
						onclick={() => pick(c)}
						aria-label="{month}월 {c.d}일{r ? ` — ${r.correct}/${r.total} 정답` : ''}"
					>
						<span class="d">{c.d}</span>
						{#if r}<b>{r.correct}</b>{/if}
					</button>
				{/if}
			{/each}
		</div>
		<p class="legend">
			색이 진할수록 많이 맞춘 날이에요. 날짜를 누르면 그날의 기록이 보입니다.
		</p>
	</section>

	{#if picked && pickedDate}
		<section class="sec">
			<div class="detail">
				<div class="dhead">
					<b>{pickedDate.m}월 {pickedDate.d}일</b>
					<span>딸깍 #{puzzleNumber(picked.dayNum)}</span>
				</div>
				<div class="dmarks" aria-label="문제별 결과">
					{#each picked.marks as m, i (i)}<span>{MARK_EMOJI[m]}</span>{/each}
				</div>
				<div class="dstats">
					<span><b>{picked.correct}</b> / {picked.total} 정답</span>
					{#if picked.elapsedMs > 0}
						<span><b>{formatDuration(picked.elapsedMs)}</b> 만에 완주</span>
					{/if}
				</div>
				<a class="dlink" href={picked.dayNum === today ? '/today' : `/archive/${picked.dayNum}`}>그날 문제 다시 보기 →</a>
			</div>
		</section>
	{/if}

	{#if summary && summary.days > 0}
		<section class="sec ctas">
			<a class="cta" href="/">오늘의 10문제 풀러 가기 <span aria-hidden="true">→</span></a>
		</section>
	{/if}

	<!-- 기록은 이 브라우저에만 있다 — 기기를 옮길 수 있게 파일로 내보낸다 -->
	<section class="sec backup">
		<h2 class="bh">기록 옮기기</h2>
		<p class="bs">
			연속 기록과 잔디는 이 브라우저에만 저장돼요. 기기를 바꾸기 전에 파일로 내보내
			두면 새 기기에서 그대로 이어갈 수 있습니다.
		</p>
		<div class="brow">
			<button class="bbtn" onclick={exportRecord}>기록 내보내기</button>
			<button class="bbtn" onclick={() => fileInput?.click()}>기록 가져오기</button>
		</div>
		<input
			bind:this={fileInput}
			type="file"
			accept="application/json,.json"
			onchange={importRecord}
			hidden
		/>
		{#if backupMsg}<p class="bmsg">{backupMsg}</p>{/if}
	</section>
</article>

<style>
	.backup {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 20px;
	}
	.bh {
		margin: 0;
		font-size: 16px;
		font-weight: 800;
	}
	.bs {
		margin: 8px 0 14px;
		font-size: 13px;
		line-height: 1.6;
		color: var(--muted);
		word-break: keep-all;
	}
	.brow {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.bbtn {
		flex: 1 1 140px;
		min-height: 46px;
		padding: 10px 14px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel-2);
		color: var(--text);
		font-size: 14px;
		font-weight: 700;
		font-family: inherit;
		cursor: pointer;
	}
	.bbtn:hover {
		background: var(--panel);
	}
	.bmsg {
		margin: 12px 0 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent-text);
		word-break: keep-all;
	}
	.cover {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 20px;
		padding: 22px 20px;
	}
	.kicker {
		font-size: 12px;
		font-weight: 800;
		color: var(--accent-text);
		letter-spacing: 0.06em;
	}
	h1 {
		margin: 10px 0;
		font-size: 25px;
		font-weight: 800;
		line-height: 1.35;
		letter-spacing: -0.4px;
		word-break: keep-all;
	}
	h1 b {
		color: var(--accent-text);
	}
	.lead {
		margin: 0;
		font-size: 14.5px;
		line-height: 1.75;
		color: var(--muted);
		word-break: keep-all;
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}
	.fact {
		flex: 1 1 70px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 11px 6px;
		text-align: center;
	}
	.fact b {
		display: block;
		font-size: 16px;
		font-weight: 800;
		color: var(--accent-text);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.fact span {
		font-size: 11.5px;
		color: var(--muted-2);
	}

	.sec {
		margin-top: 20px;
	}

	.mnav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}
	.mnav h2 {
		font-size: 17px;
		font-weight: 800;
	}
	.mv {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background: var(--panel);
		color: var(--text);
		font-size: 17px;
		font-weight: 800;
		cursor: pointer;
	}
	.mv:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.mv:not(:disabled):hover {
		background: var(--panel-2);
	}

	.cal {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 5px;
	}
	.wd {
		text-align: center;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--muted-2);
		padding-bottom: 2px;
	}
	.cell {
		aspect-ratio: 1;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--panel);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		padding: 0;
		font-family: inherit;
		cursor: default;
	}
	.cell.out {
		border-color: transparent;
		background: transparent;
	}
	.cell .d {
		font-size: 10.5px;
		color: var(--muted-2);
		line-height: 1;
	}
	.cell b {
		font-size: 14px;
		font-weight: 800;
		line-height: 1.1;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	/* 잔디 농도 — 맞춘 비율이 높을수록 진해진다 */
	.cell.lv1 {
		background: #e3efe7;
		border-color: #cfe2d6;
	}
	.cell.lv2 {
		background: #bcdcc8;
		border-color: #a8cfb7;
	}
	.cell.lv3 {
		background: #7fbf99;
		border-color: #6fb28b;
	}
	.cell.lv4 {
		background: var(--accent);
		border-color: var(--accent-text);
	}
	.cell.lv3 .d, .cell.lv4 .d {
		color: rgba(255, 255, 255, 0.75);
	}
	.cell.lv3 b, .cell.lv4 b {
		color: #fff;
	}
	.cell:not(:disabled) {
		cursor: pointer;
	}
	.cell.today {
		outline: 2px solid var(--accent-2);
		outline-offset: 1px;
	}
	.cell.sel {
		box-shadow: 0 0 0 2px var(--accent) inset;
	}
	.legend {
		margin: 10px 2px 0;
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--muted);
		word-break: keep-all;
	}

	.detail {
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
		padding: 16px 18px;
	}
	.dhead {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 10px;
	}
	.dhead b {
		font-size: 16px;
		font-weight: 800;
	}
	.dhead span {
		font-size: 12px;
		color: var(--muted-2);
	}
	.dmarks {
		font-size: 17px;
		letter-spacing: 2px;
		margin-bottom: 10px;
	}
	.dstats {
		display: flex;
		gap: 16px;
		font-size: 13.5px;
		color: var(--muted);
		margin-bottom: 12px;
	}
	.dstats b {
		color: var(--text);
		font-weight: 800;
	}
	.dlink {
		font-size: 13px;
		font-weight: 700;
		color: var(--accent-text);
		text-decoration: none;
	}
	.dlink:hover {
		text-decoration: underline;
	}

	.ctas {
		display: flex;
	}
	.cta {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 54px;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 15.5px;
		font-weight: 800;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--accent-press);
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 3px 0 var(--accent-press);
	}
</style>
