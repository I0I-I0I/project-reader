<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		breadcrumbs: string[];
	}

	let { breadcrumbs }: Props = $props();
</script>

<nav aria-label={m.breadcrumb()} class="breadcrumbs-nav">
	<ol class="breadcrumbs-list">
		{#each breadcrumbs as breadcrumb, idx (breadcrumb + '_' + idx)}
			<li class="breadcrumb-item">
				<span
					class="breadcrumb-text"
					class:active={idx === breadcrumbs.length - 1}
					aria-current={idx === breadcrumbs.length - 1 ? 'page' : undefined}
				>
					{breadcrumb}
				</span>
				{#if idx < breadcrumbs.length - 1}
					<span class="separator" aria-hidden="true">/</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.breadcrumbs-nav {
		--font-size: clamp(24px, 6vw, 28px);
		--gap: clamp(8px, 6vw, 16px);
		margin-bottom: 60px;
	}

	.breadcrumbs-list {
		display: flex;
		flex-wrap: wrap;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: var(--gap);
	}

	.breadcrumb-item {
		display: flex;
		align-items: center;
		gap: var(--gap);
	}

	.separator {
		color: var(--text-color);
		font-size: var(--font-size);
		font-weight: bold;
		user-select: none;
	}

	.breadcrumb-text {
		font-size: var(--font-size);
		font-weight: normal;
		text-transform: uppercase;
		margin: 0;
		color: var(--text-color);
		letter-spacing: 1px;
	}

	.breadcrumb-text.active {
		font-weight: bold;
	}
</style>
