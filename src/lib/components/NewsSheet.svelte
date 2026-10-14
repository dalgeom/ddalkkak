<script lang="ts">
	import { onMount } from 'svelte';
	import { freshNotices, loadSeen, markSeen, isReturning, newsSheetActive, type Notice } from '$lib/notices';
	import { track } from '$lib/analytics';
	import BottomSheet from './BottomSheet.svelte';

	/**
	 * 다시 온 사람에게만, 안 본 새 소식이 있으면 메인에서 한 번 올라오는 시트(notices.ts).
	 * 처음 온 사람에게는 띄우지 않는다 — 무엇이 「새」 것인지 모르는 사람에게는 가림막일 뿐이다.
	 * 스플래시가 걷힌 뒤에 올라오도록 조금 늦게 연다. 시트 동작(끌어 닫기 · 뒤로가기)은 BottomSheet.
	 */
	let list = $state<Notice[]>([]);
	/** 안 본 새 소식 전부. 시트에는 3개까지만 보이지만, 닫으면 전부 본 것으로 둔다 —
	    보인 3개만 표시했더니 4번째 때문에 다음 방문에 시트가 또 떴다(10/14 점검) */
	let unseen: Notice[] = [];
	let open = $state(false);
	let sheet = $state<BottomSheet>();

	onMount(() => {
		if (!isReturning()) return;
		const seen = new Set(loadSeen());
		unseen = freshNotices(Date.now()).filter((n) => !seen.has(n.id));
		list = unseen.slice(0, 3);
		if (!list.length) return;
		// 띠보다 먼저 자리를 잡는다 — 시트가 올라오기 전 1.6초 동안에도 띠에 같은 소식이 보이지 않게
		newsSheetActive.set(true);
		const t = setTimeout(() => {
			open = true;
			track('news_sheet_open', { n: list.length });
		}, 1600);
		return () => {
			clearTimeout(t);
			newsSheetActive.set(false);
		};
	});

	function seenAll() {
		markSeen(unseen.map((n) => n.id));
		newsSheetActive.set(false);
	}
	function go(e: MouseEvent, n: Notice) {
		e.preventDefault();
		seenAll();
		track('news_sheet_click', { id: n.id });
		sheet?.leave(n.href);
	}
</script>

<BottomSheet bind:this={sheet} bind:open id="news" title="새로 나왔어요" onclose={seenAll}>
	<ul>
		{#each list as n (n.id)}
			<li>
				<a href={n.href} onclick={(e) => go(e, n)}>
					<b>{n.title}</b>
					<span>{n.body}</span>
					<em>{n.cta} →</em>
				</a>
			</li>
		{/each}
	</ul>
	<button class="ok" onclick={() => sheet?.close()}>확인</button>
</BottomSheet>

<style>
	ul {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 4px;
	}
	li a {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 12px 14px;
		border-radius: 14px;
		background: var(--panel-2);
		border: 1px solid var(--border);
		text-decoration: none;
		color: var(--text);
	}
	li b {
		font-size: 15.5px;
		font-weight: 800;
	}
	li span {
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--muted);
		word-break: keep-all;
	}
	li em {
		font-style: normal;
		font-size: 13px;
		font-weight: 800;
		color: var(--accent-text);
		margin-top: 2px;
	}
	.ok {
		width: 100%;
		margin-top: 14px;
		padding: 14px;
		border: none;
		border-radius: 14px;
		background: var(--accent);
		color: #fff;
		font-size: 16px;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		box-shadow: 0 4px 0 var(--accent-press);
	}
</style>
