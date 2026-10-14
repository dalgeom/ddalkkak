<script lang="ts">
	import { onMount } from 'svelte';
	import { freshNotices, loadSeen, markSeen, isReturning, type Notice } from '$lib/notices';
	import { track } from '$lib/analytics';

	/**
	 * 다시 온 사람에게만, 안 본 새 소식이 있으면 메인에서 한 번 올라오는 시트(notices.ts).
	 * 처음 온 사람에게는 띄우지 않는다 — 무엇이 「새」 것인지 모르는 사람에게는 가림막일 뿐이다.
	 * 스플래시가 걷힌 뒤에 올라오도록 조금 늦게 연다.
	 */
	let list = $state<Notice[]>([]);
	let open = $state(false);

	onMount(() => {
		if (!isReturning()) return;
		const seen = new Set(loadSeen());
		list = freshNotices(Date.now()).filter((n) => !seen.has(n.id)).slice(0, 3);
		if (!list.length) return;
		const t = setTimeout(() => {
			open = true;
			track('news_sheet_open', { n: list.length });
		}, 1600);
		return () => clearTimeout(t);
	});

	function close() {
		markSeen(list.map((n) => n.id));
		open = false;
	}
	function go(n: Notice) {
		markSeen(list.map((x) => x.id));
		track('news_sheet_click', { id: n.id });
	}
</script>

{#if open}
	<div class="dim" role="presentation" onclick={close}></div>
	<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="news-h">
		<div class="grip" aria-hidden="true"></div>
		<h2 id="news-h">새로 나왔어요</h2>
		<ul>
			{#each list as n (n.id)}
				<li>
					<a href={n.href} onclick={() => go(n)}>
						<b>{n.title}</b>
						<span>{n.body}</span>
						<em>{n.cta} →</em>
					</a>
				</li>
			{/each}
		</ul>
		<button class="ok" onclick={close}>확인</button>
	</div>
{/if}

<style>
	.dim {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(30, 26, 20, 0.36);
		animation: fade 0.2s ease-out;
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 61;
		max-width: 520px;
		margin: 0 auto;
		background: var(--panel);
		border-radius: 22px 22px 0 0;
		padding: 10px 18px calc(18px + env(safe-area-inset-bottom));
		box-shadow: 0 -10px 30px rgba(30, 26, 20, 0.18);
		animation: up 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
		max-height: 80dvh;
		overflow-y: auto;
	}
	.grip {
		width: 40px;
		height: 4px;
		border-radius: 3px;
		background: var(--border-strong);
		margin: 0 auto 12px;
	}
	h2 {
		font-size: 19px;
		font-weight: 900;
		margin-bottom: 12px;
	}
	ul {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
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
	}
	@keyframes up {
		from {
			transform: translateY(100%);
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
