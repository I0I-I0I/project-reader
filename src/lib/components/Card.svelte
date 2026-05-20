<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		title: string;
		card_type: 'folder' | 'book';
		extension?: 'pdf' | 'epub';
		Icon?: Component;
	}

	let { title, Icon, card_type, extension, ...props }: Props = $props();
</script>

<div class="card" {...props}>
	{#if card_type === 'book' && extension}
		<div class="badge" aria-label="File format: {extension}">{extension}</div>
	{/if}
	
	{#if Icon}
		<div class="card-icon" aria-hidden="true">
			<Icon />
		</div>
	{/if}
	
	<p class="card-title">{title}</p>
</div>

<style>
	.card {
		background: white;
		aspect-ratio: 1/1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20px;
		position: relative;
		border: 2px solid #1a1a1a;
		box-shadow: 4px 4px 0 #1a1a1a;
		transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;
	}

	.card:hover {
		transform: translate(-4px, -4px);
		box-shadow: 8px 8px 0 #1a1a1a;
		background-color: #faf8f5;
	}

	.card:active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	.card-icon {
		margin-bottom: 20px;
		color: #1a1a1a;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-icon :global(svg) {
		width: 48px;
		height: 48px;
		stroke-width: 2;
	}

	.card-title {
		font-size: 14px;
		font-weight: bold;
		text-transform: uppercase;
		margin: 0;
		text-align: center;
		max-width: 180px;
		word-wrap: break-word;
		color: #1a1a1a;
	}

	.badge {
		position: absolute;
		top: 15px;
		right: 15px;
		background: #ff4d4d;
		color: white;
		font-size: 11px;
		font-weight: bold;
		padding: 4px 10px;
		transform: rotate(-10deg);
		border: 1.5px solid #1a1a1a;
		box-shadow: 2px 2px 0 #1a1a1a;
		z-index: 10;
		text-transform: uppercase;
	}
</style>
