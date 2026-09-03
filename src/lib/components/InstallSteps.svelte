<script lang="ts">
	import type { Step } from '$lib/pwa';
	import { INSTALL_NOTE } from '$lib/pwa';

	/** 설치 단계 목록 — 결과 화면과 홈 안내가 같은 모양을 쓴다 */
	let { steps, note = true }: { steps: Step[]; note?: boolean } = $props();
</script>

<ol class="steps">
	{#each steps as s, i (i)}
		<li>
			<span class="n">{i + 1}</span>
			{#if s.icon === 'share'}
				<span class="ico" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 15V3" /><path d="M8 7l4-4 4 4" />
						<path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
					</svg>
				</span>
			{:else if s.icon === 'dots'}
				<span class="ico" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
					</svg>
				</span>
			{:else if s.icon === 'plus'}
				<span class="ico" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
						<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
						<path d="M12 8v8M8 12h8" />
					</svg>
				</span>
			{/if}
			<span class="t">{s.text}</span>
		</li>
	{/each}
</ol>
{#if note}
	<p class="note">{INSTALL_NOTE}</p>
{/if}

<style>
	.steps {
		list-style: none;
		margin: 13px 0 0;
		padding: 13px;
		background: var(--panel-2);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 11px;
	}
	.steps li {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.n {
		flex: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 11.5px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ico {
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 8px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		color: var(--accent-text);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ico svg {
		width: 17px;
		height: 17px;
	}
	.t {
		font-size: 13.5px;
		font-weight: 600;
		line-height: 1.5;
		word-break: keep-all;
	}
	.note {
		margin-top: 9px;
		font-size: 12px;
		color: var(--muted-2);
		line-height: 1.6;
		word-break: keep-all;
	}
</style>
